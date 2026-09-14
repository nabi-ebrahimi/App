import {act, renderHook} from '@testing-library/react-native';

import useReviewWorkspaceSettingsTaskCompletion from '@hooks/useReviewWorkspaceSettingsTaskCompletion';

import {updateGeneralSettings, updateWorkspaceDescription} from '@libs/actions/Policy/Policy';
import {getGuidedSetupDataForOpenReport, openReport} from '@libs/actions/Report';
import type {GuidedSetupData} from '@libs/actions/Report';
import * as API from '@libs/API';
import {WRITE_COMMANDS} from '@libs/API/types';
import * as SequentialQueue from '@libs/Network/SequentialQueue';
import {setHasRadio} from '@libs/NetworkState';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type {IntroSelected, Report} from '@src/types/onyx';

import Onyx from 'react-native-onyx';

import createRandomPolicy from '../../utils/collections/policies';
import getOnyxValue from '../../utils/getOnyxValue';
import {createGlobalFetchMock, setPersonalDetails, signInWithTestUser} from '../../utils/TestHelper';
import waitForBatchedUpdates from '../../utils/waitForBatchedUpdates';
import waitForNetworkPromises from '../../utils/waitForNetworkPromises';

jest.mock('@hooks/useCurrentUserPersonalDetails', () => () => ({accountID: 1, login: 'admin@example.com'}));

const conciergeReportID = '100';
const conciergeChat: Report = {
    reportID: conciergeReportID,
    type: CONST.REPORT.TYPE.CHAT,
    lastReadTime: '2026-01-01 00:00:00.000',
    participants: {
        1: {notificationPreference: CONST.REPORT.NOTIFICATION_PREFERENCE.ALWAYS},
        [CONST.ACCOUNT_ID.CONCIERGE]: {notificationPreference: CONST.REPORT.NOTIFICATION_PREFERENCE.ALWAYS},
    },
};
const pendingInvite: IntroSelected = {
    choice: CONST.ONBOARDING_CHOICES.ADMIN,
    inviteType: CONST.ONBOARDING_INVITE_TYPES.WORKSPACE,
    isInviteOnboardingComplete: false,
};

describe('useReviewWorkspaceSettingsTaskCompletion', () => {
    let apiWriteSpy: jest.SpiedFunction<typeof API.write>;
    let apiPaginateSpy: jest.SpiedFunction<typeof API.paginate>;
    let mockFetch: ReturnType<typeof createGlobalFetchMock>;
    const policy = {...createRandomPolicy(0), name: 'Old name', outputCurrency: CONST.CURRENCY.USD};

    beforeAll(() => {
        Onyx.init({keys: ONYXKEYS});
    });

    beforeEach(async () => {
        SequentialQueue.resetQueue();
        await Onyx.clear();
        setHasRadio(true);
        mockFetch = createGlobalFetchMock();
        global.fetch = mockFetch;
        await signInWithTestUser(1, 'admin@example.com');
        await setPersonalDetails('admin@example.com', 1);
        await Onyx.set(ONYXKEYS.CONCIERGE_REPORT_ID, conciergeReportID);
        await Onyx.set(`${ONYXKEYS.COLLECTION.REPORT}${conciergeReportID}`, conciergeChat);
        await Onyx.set(ONYXKEYS.NVP_INTRO_SELECTED, pendingInvite);
        await Onyx.set(ONYXKEYS.NVP_ONBOARDING, {hasCompletedGuidedSetupFlow: true});
        await Onyx.set(`${ONYXKEYS.COLLECTION.POLICY}${policy.id}`, policy);
        await waitForNetworkPromises();
        apiWriteSpy = jest.spyOn(API, 'write');
        apiPaginateSpy = jest.spyOn(API, 'paginate');
    });

    afterEach(async () => {
        await act(async () => {
            setHasRadio(true);
            SequentialQueue.unpause();
            SequentialQueue.flush();
            await mockFetch.resume();
            await waitForNetworkPromises();
        });
        apiWriteSpy.mockRestore();
        apiPaginateSpy.mockRestore();
        SequentialQueue.resetQueue();
    });

    async function renderCompletionHook() {
        const hook = renderHook(() => useReviewWorkspaceSettingsTaskCompletion());
        await act(waitForBatchedUpdates);
        return hook;
    }

    function getCreatedReviewTask(requestIndex = 0) {
        const parameters = apiPaginateSpy.mock.calls.filter(([, command]) => command === WRITE_COMMANDS.OPEN_REPORT).at(requestIndex)?.[2];
        if (!parameters || !('guidedSetupData' in parameters) || typeof parameters.guidedSetupData !== 'string') {
            throw new Error('Expected OpenReport to create guided setup');
        }
        const tasks = JSON.parse(parameters.guidedSetupData) as GuidedSetupData;
        const task = tasks.find((item) => item.type === 'task' && 'task' in item && item.task === CONST.ONBOARDING_TASK_TYPE.REVIEW_WORKSPACE_SETTINGS);
        if (!task || task.type !== 'task' || !('taskReportID' in task)) {
            throw new Error('Expected a review workspace settings task');
        }
        return task;
    }

    it('creates the same task that the settings command completes, without marking Concierge read', async () => {
        const {result} = await renderCompletionHook();
        await act(async () => {
            updateGeneralSettings(policy, 'New name', policy.outputCurrency, result.current());
            await waitForNetworkPromises();
        });

        expect(apiWriteSpy.mock.calls.map(([command]) => command)).toEqual([WRITE_COMMANDS.UPDATE_WORKSPACE_GENERAL_SETTINGS]);
        expect(apiPaginateSpy.mock.calls.map(([, command]) => command)).toEqual([WRITE_COMMANDS.OPEN_REPORT]);
        const task = getCreatedReviewTask();
        expect(task.completedTaskReportActionID).toBeUndefined();
        const taskReport = await getOnyxValue(`${ONYXKEYS.COLLECTION.REPORT}${task.taskReportID}`);
        expect(taskReport).toMatchObject({stateNum: CONST.REPORT.STATE_NUM.APPROVED, statusNum: CONST.REPORT.STATUS_NUM.APPROVED});
        const actions = await getOnyxValue(`${ONYXKEYS.COLLECTION.REPORT_ACTIONS}${task.taskReportID}`);
        const completedAction = Object.values(actions ?? {}).find((action) => action.actionName === CONST.REPORT.ACTIONS.TYPE.TASK_COMPLETED);
        expect(completedAction).toBeDefined();
        expect(completedAction?.actorAccountID).toBe(CONST.ACCOUNT_ID.CONCIERGE);
        expect(apiWriteSpy.mock.calls[0]?.[1]).toMatchObject({completedTaskReportActionID: completedAction?.reportActionID});
        const concierge = await getOnyxValue(`${ONYXKEYS.COLLECTION.REPORT}${conciergeReportID}`);
        expect(concierge?.lastReadTime).toBe(conciergeChat.lastReadTime);
        expect(concierge?.hasOutstandingChildTask).toBe(true);
        expect(mockFetch.mock.calls.map(([url]) => String(url))).toEqual([expect.stringContaining('/OpenReport?'), expect.stringContaining('/UpdateWorkspaceGeneralSettings?')]);
    });

    it('keeps the created task open when the settings save fails, then completes it on a successful retry', async () => {
        mockFetch.mockAPICommand(WRITE_COMMANDS.UPDATE_WORKSPACE_GENERAL_SETTINGS, () => ({jsonCode: 400}));
        const {result} = await renderCompletionHook();
        await act(async () => {
            updateGeneralSettings(policy, 'Rejected name', policy.outputCurrency, result.current());
            await waitForNetworkPromises();
        });
        const task = getCreatedReviewTask();
        expect(await getOnyxValue(`${ONYXKEYS.COLLECTION.REPORT}${task.taskReportID}`)).toMatchObject({
            stateNum: CONST.REPORT.STATE_NUM.OPEN,
            statusNum: CONST.REPORT.STATUS_NUM.OPEN,
        });

        mockFetch.mockAPICommand(WRITE_COMMANDS.UPDATE_WORKSPACE_GENERAL_SETTINGS, () => ({jsonCode: 200}));
        await act(async () => {
            updateGeneralSettings(policy, 'Accepted name', policy.outputCurrency, result.current());
            await waitForNetworkPromises();
        });
        expect(await getOnyxValue(`${ONYXKEYS.COLLECTION.REPORT}${task.taskReportID}`)).toMatchObject({stateNum: CONST.REPORT.STATE_NUM.APPROVED});
        expect(apiPaginateSpy).toHaveBeenCalledTimes(1);
    });

    it('does not undo an earlier successful review when a later settings save fails', async () => {
        const {result} = await renderCompletionHook();
        await act(async () => {
            updateGeneralSettings(policy, 'Accepted name', policy.outputCurrency, result.current());
            await waitForNetworkPromises();
        });
        const task = getCreatedReviewTask();
        mockFetch.mockAPICommand(WRITE_COMMANDS.UPDATE_WORKSPACE_GENERAL_SETTINGS, () => ({jsonCode: 400}));
        await act(async () => {
            updateGeneralSettings(policy, 'Rejected name', policy.outputCurrency, result.current());
            await waitForNetworkPromises();
        });
        expect(await getOnyxValue(`${ONYXKEYS.COLLECTION.REPORT}${task.taskReportID}`)).toMatchObject({stateNum: CONST.REPORT.STATE_NUM.APPROVED});
        expect(apiPaginateSpy).toHaveBeenCalledTimes(1);
    });

    it('preserves creation before saving offline, including opening Concierge before reconnecting', async () => {
        setHasRadio(false);
        const {result} = await renderCompletionHook();
        await act(async () => {
            updateGeneralSettings(policy, 'Offline name', policy.outputCurrency, result.current());
            await waitForBatchedUpdates();
        });
        const task = getCreatedReviewTask();
        await act(async () => {
            const introSelected = await getOnyxValue(ONYXKEYS.NVP_INTRO_SELECTED);
            openReport({reportID: conciergeReportID, introSelected, conciergeChat, currentUserAccountID: 1, betas: [], hasReportActions: true});
            await waitForBatchedUpdates();
        });
        expect(mockFetch).not.toHaveBeenCalled();
        await act(async () => {
            setHasRadio(true);
            SequentialQueue.unpause();
            SequentialQueue.flush();
            await waitForNetworkPromises();
        });
        expect(mockFetch.mock.calls[0]?.[0]).toEqual(expect.stringContaining('/OpenReport?'));
        expect(mockFetch.mock.calls[1]?.[0]).toEqual(expect.stringContaining('/UpdateWorkspaceGeneralSettings?'));
        expect(await getOnyxValue(`${ONYXKEYS.COLLECTION.REPORT}${task.taskReportID}`)).toMatchObject({stateNum: CONST.REPORT.STATE_NUM.APPROVED});
        expect((await getOnyxValue(ONYXKEYS.NVP_INTRO_SELECTED))?.reviewWorkspaceSettings).toBe(task.taskReportID);
    });

    it('does not create duplicate tasks when settings are saved twice before the hook rerenders', async () => {
        const {result} = await renderCompletionHook();
        await act(async () => {
            updateGeneralSettings(policy, 'First name', policy.outputCurrency, result.current());
            updateGeneralSettings(policy, 'Second name', policy.outputCurrency, result.current());
            await waitForNetworkPromises();
        });
        expect(apiPaginateSpy).toHaveBeenCalledTimes(1);
        expect(apiWriteSpy).toHaveBeenCalledTimes(2);
        const task = getCreatedReviewTask();
        expect((await getOnyxValue(ONYXKEYS.NVP_INTRO_SELECTED))?.reviewWorkspaceSettings).toBe(task.taskReportID);
        expect(await getOnyxValue(`${ONYXKEYS.COLLECTION.REPORT}${task.taskReportID}`)).toMatchObject({stateNum: CONST.REPORT.STATE_NUM.APPROVED});
    });

    it('completes an existing task without generating another guided setup', async () => {
        openReport({reportID: conciergeReportID, introSelected: pendingInvite, conciergeChat, currentUserAccountID: 1, betas: [], hasReportActions: false});
        await waitForNetworkPromises();
        const task = getCreatedReviewTask();
        const {result} = await renderCompletionHook();
        await act(async () => {
            updateGeneralSettings(policy, 'New name', policy.outputCurrency, result.current());
            await waitForNetworkPromises();
        });
        expect(apiPaginateSpy).toHaveBeenCalledTimes(1);
        expect(await getOnyxValue(`${ONYXKEYS.COLLECTION.REPORT}${task.taskReportID}`)).toMatchObject({stateNum: CONST.REPORT.STATE_NUM.APPROVED});
    });

    it('can initialize again on the next settings save after task creation is rejected', async () => {
        mockFetch.mockAPICommand(WRITE_COMMANDS.OPEN_REPORT, () => ({jsonCode: 400}));
        const {result} = await renderCompletionHook();
        await act(async () => {
            updateGeneralSettings(policy, 'First name', policy.outputCurrency, result.current());
            await waitForNetworkPromises();
        });
        expect((await getOnyxValue(ONYXKEYS.NVP_INTRO_SELECTED))?.reviewWorkspaceSettings).toBeFalsy();
        mockFetch.mockAPICommand(WRITE_COMMANDS.OPEN_REPORT, () => ({jsonCode: 200}));
        await act(async () => {
            updateGeneralSettings(policy, 'Second name', policy.outputCurrency, result.current());
            await waitForNetworkPromises();
        });
        expect(apiPaginateSpy).toHaveBeenCalledTimes(2);
        const introSelected = await getOnyxValue(ONYXKEYS.NVP_INTRO_SELECTED);
        expect(introSelected?.reviewWorkspaceSettings).toBeTruthy();
        expect(await getOnyxValue(`${ONYXKEYS.COLLECTION.REPORT}${introSelected?.reviewWorkspaceSettings}`)).toMatchObject({stateNum: CONST.REPORT.STATE_NUM.APPROVED});
        const task = getCreatedReviewTask(1);
        const actions = await getOnyxValue(`${ONYXKEYS.COLLECTION.REPORT_ACTIONS}${task.taskReportID}`);
        const completedActions = Object.values(actions ?? {}).filter((action) => action.actionName === CONST.REPORT.ACTIONS.TYPE.TASK_COMPLETED);
        expect(completedActions).toHaveLength(1);
        expect(completedActions[0]?.reportActionID).toBe(task.completedTaskReportActionID);
        expect(apiWriteSpy.mock.calls[1]?.[1]).not.toHaveProperty('completedTaskReportActionID', expect.any(String));
    });

    it.each([false, true])('recovers a successful settings review after creation fails without another save (offline: %s)', async (isOffline) => {
        setHasRadio(!isOffline);
        mockFetch.mockAPICommand(WRITE_COMMANDS.OPEN_REPORT, () => ({jsonCode: 400}));
        const {result, unmount} = await renderCompletionHook();
        await act(async () => {
            updateGeneralSettings(policy, 'Accepted name', policy.outputCurrency, result.current());
            await waitForBatchedUpdates();
            if (isOffline) {
                expect((await getOnyxValue(ONYXKEYS.NVP_INTRO_SELECTED))?.hasReviewedWorkspaceSettings).toBeFalsy();
                setHasRadio(true);
                SequentialQueue.unpause();
                SequentialQueue.flush();
            }
            await waitForNetworkPromises();
        });
        unmount();
        expect((await getOnyxValue(`${ONYXKEYS.COLLECTION.POLICY}${policy.id}`))?.name).toBe('Accepted name');
        expect((await getOnyxValue(ONYXKEYS.NVP_INTRO_SELECTED))?.reviewWorkspaceSettings).toBeFalsy();

        mockFetch.mockAPICommand(WRITE_COMMANDS.OPEN_REPORT, () => ({jsonCode: 200}));
        openReport({
            reportID: conciergeReportID,
            introSelected: await getOnyxValue(ONYXKEYS.NVP_INTRO_SELECTED),
            conciergeChat,
            currentUserAccountID: 1,
            betas: [],
            hasReportActions: true,
        });
        await waitForNetworkPromises();

        const task = getCreatedReviewTask(1);
        expect(task.completedTaskReportActionID).toBeTruthy();
        expect(await getOnyxValue(`${ONYXKEYS.COLLECTION.REPORT}${task.taskReportID}`)).toMatchObject({
            stateNum: CONST.REPORT.STATE_NUM.APPROVED,
            statusNum: CONST.REPORT.STATUS_NUM.APPROVED,
        });
        const actions = await getOnyxValue(`${ONYXKEYS.COLLECTION.REPORT_ACTIONS}${task.taskReportID}`);
        expect(actions?.[task.completedTaskReportActionID ?? '']).toMatchObject({
            actionName: CONST.REPORT.ACTIONS.TYPE.TASK_COMPLETED,
            actorAccountID: CONST.ACCOUNT_ID.CONCIERGE,
        });
        expect(actions?.[task.completedTaskReportActionID ?? '']?.pendingAction).toBeFalsy();
        expect(apiWriteSpy.mock.calls.map(([command]) => command)).toEqual([WRITE_COMMANDS.UPDATE_WORKSPACE_GENERAL_SETTINGS]);

        const setupParameters = apiPaginateSpy.mock.calls[1]?.[2];
        const setup = JSON.parse(String(setupParameters && 'guidedSetupData' in setupParameters ? setupParameters.guidedSetupData : '[]')) as GuidedSetupData;
        const otherTasks = setup.filter((item) => item.type === 'task' && 'task' in item && item.task !== CONST.ONBOARDING_TASK_TYPE.REVIEW_WORKSPACE_SETTINGS);
        expect(otherTasks.length).toBeGreaterThan(0);
        for (const otherTask of otherTasks) {
            if (!('taskReportID' in otherTask)) {
                throw new Error('Expected a task report ID');
            }
            expect(otherTask.completedTaskReportActionID).toBeUndefined();
            expect(await getOnyxValue(`${ONYXKEYS.COLLECTION.REPORT}${otherTask.taskReportID}`)).toMatchObject({stateNum: CONST.REPORT.STATE_NUM.OPEN});
        }
    });

    it('does not complete a recreated task when both creation and the settings save fail', async () => {
        mockFetch.mockAPICommand(WRITE_COMMANDS.OPEN_REPORT, () => ({jsonCode: 400}));
        mockFetch.mockAPICommand(WRITE_COMMANDS.UPDATE_WORKSPACE_GENERAL_SETTINGS, () => ({jsonCode: 400}));
        const {result} = await renderCompletionHook();
        await act(async () => {
            updateGeneralSettings(policy, 'Rejected name', policy.outputCurrency, result.current());
            await waitForNetworkPromises();
        });
        expect((await getOnyxValue(ONYXKEYS.NVP_INTRO_SELECTED))?.hasReviewedWorkspaceSettings).toBeFalsy();
        mockFetch.mockAPICommand(WRITE_COMMANDS.OPEN_REPORT, () => ({jsonCode: 200}));
        await act(async () => {
            openReport({
                reportID: conciergeReportID,
                introSelected: await getOnyxValue(ONYXKEYS.NVP_INTRO_SELECTED),
                conciergeChat,
                currentUserAccountID: 1,
                betas: [],
                hasReportActions: true,
            });
            await waitForNetworkPromises();
        });
        const task = getCreatedReviewTask(1);
        expect(task.completedTaskReportActionID).toBeUndefined();
        expect(await getOnyxValue(`${ONYXKEYS.COLLECTION.REPORT}${task.taskReportID}`)).toMatchObject({stateNum: CONST.REPORT.STATE_NUM.OPEN});
    });

    it('retains a successful review through another failed creation and failed settings save', async () => {
        mockFetch.mockAPICommand(WRITE_COMMANDS.OPEN_REPORT, () => ({jsonCode: 400}));
        const {result} = await renderCompletionHook();
        await act(async () => {
            updateGeneralSettings(policy, 'Accepted name', policy.outputCurrency, result.current());
            await waitForNetworkPromises();
        });
        mockFetch.mockAPICommand(WRITE_COMMANDS.UPDATE_WORKSPACE_GENERAL_SETTINGS, () => ({jsonCode: 400}));
        await act(async () => {
            updateGeneralSettings(policy, 'Rejected name', policy.outputCurrency, result.current());
            await waitForNetworkPromises();
        });
        expect((await getOnyxValue(ONYXKEYS.NVP_INTRO_SELECTED))?.hasReviewedWorkspaceSettings).toBe(true);
        mockFetch.mockAPICommand(WRITE_COMMANDS.OPEN_REPORT, () => ({jsonCode: 200}));
        await act(async () => {
            openReport({
                reportID: conciergeReportID,
                introSelected: await getOnyxValue(ONYXKEYS.NVP_INTRO_SELECTED),
                conciergeChat,
                currentUserAccountID: 1,
                betas: [],
                hasReportActions: true,
            });
            await waitForNetworkPromises();
        });
        const task = getCreatedReviewTask(2);
        expect(task.completedTaskReportActionID).toBeTruthy();
        expect(await getOnyxValue(`${ONYXKEYS.COLLECTION.REPORT}${task.taskReportID}`)).toMatchObject({stateNum: CONST.REPORT.STATE_NUM.APPROVED});
    });

    it('records a second successful save when the first save and task creation fail before rerendering', async () => {
        mockFetch.mockAPICommand(WRITE_COMMANDS.OPEN_REPORT, () => ({jsonCode: 400}));
        let settingsSaves = 0;
        mockFetch.mockAPICommand(WRITE_COMMANDS.UPDATE_WORKSPACE_GENERAL_SETTINGS, () => ({jsonCode: ++settingsSaves === 1 ? 400 : 200}));
        const {result} = await renderCompletionHook();
        await act(async () => {
            updateGeneralSettings(policy, 'Rejected name', policy.outputCurrency, result.current());
            updateGeneralSettings(policy, 'Accepted name', policy.outputCurrency, result.current());
            await waitForNetworkPromises();
        });
        expect(apiPaginateSpy).toHaveBeenCalledTimes(1);
        expect((await getOnyxValue(ONYXKEYS.NVP_INTRO_SELECTED))?.hasReviewedWorkspaceSettings).toBe(true);
        mockFetch.mockAPICommand(WRITE_COMMANDS.OPEN_REPORT, () => ({jsonCode: 200}));
        await act(async () => {
            openReport({
                reportID: conciergeReportID,
                introSelected: await getOnyxValue(ONYXKEYS.NVP_INTRO_SELECTED),
                conciergeChat,
                currentUserAccountID: 1,
                betas: [],
                hasReportActions: true,
            });
            await waitForNetworkPromises();
        });
        expect(getCreatedReviewTask(1).completedTaskReportActionID).toBeTruthy();
    });

    it('records a successful save while an existing optimistic review task is still being created', async () => {
        mockFetch.pause();
        mockFetch.mockAPICommand(WRITE_COMMANDS.OPEN_REPORT, () => ({jsonCode: 400}));
        mockFetch.mockAPICommand(WRITE_COMMANDS.UPDATE_WORKSPACE_GENERAL_SETTINGS, () => ({jsonCode: 400}));
        const {result} = await renderCompletionHook();
        await act(async () => {
            updateGeneralSettings(policy, 'Rejected name', policy.outputCurrency, result.current());
            await waitForBatchedUpdates();
        });
        expect((await getOnyxValue(ONYXKEYS.NVP_INTRO_SELECTED))?.isInviteOnboardingComplete).toBe(true);
        await act(async () => {
            updateWorkspaceDescription(policy.id, 'Accepted description', policy.description, result.current());
            await waitForBatchedUpdates();
            await mockFetch.resume();
            await waitForNetworkPromises();
        });
        expect((await getOnyxValue(ONYXKEYS.NVP_INTRO_SELECTED))?.hasReviewedWorkspaceSettings).toBe(true);
        mockFetch.mockAPICommand(WRITE_COMMANDS.OPEN_REPORT, () => ({jsonCode: 200}));
        await act(async () => {
            openReport({
                reportID: conciergeReportID,
                introSelected: await getOnyxValue(ONYXKEYS.NVP_INTRO_SELECTED),
                conciergeChat,
                currentUserAccountID: 1,
                betas: [],
                hasReportActions: true,
            });
            await waitForNetworkPromises();
        });
        expect(getCreatedReviewTask(1).completedTaskReportActionID).toBeTruthy();
    });

    it('retains a successful settings review while the Concierge report is unavailable', async () => {
        await Onyx.set(`${ONYXKEYS.COLLECTION.REPORT}${conciergeReportID}`, null);
        const {result} = await renderCompletionHook();
        await act(async () => {
            updateGeneralSettings(policy, 'Accepted name', policy.outputCurrency, result.current());
            await waitForNetworkPromises();
        });
        expect(apiPaginateSpy).not.toHaveBeenCalled();
        await act(async () => {
            await Onyx.set(`${ONYXKEYS.COLLECTION.REPORT}${conciergeReportID}`, conciergeChat);
            openReport({
                reportID: conciergeReportID,
                introSelected: await getOnyxValue(ONYXKEYS.NVP_INTRO_SELECTED),
                conciergeChat,
                currentUserAccountID: 1,
                betas: [],
                hasReportActions: false,
            });
            await waitForNetworkPromises();
        });
        expect(getCreatedReviewTask().completedTaskReportActionID).toBeTruthy();
    });

    it.each([
        {choice: CONST.ONBOARDING_CHOICES.SUBMIT, inviteType: CONST.ONBOARDING_INVITE_TYPES.WORKSPACE},
        {...pendingInvite, isInviteOnboardingComplete: true},
        {choice: CONST.ONBOARDING_CHOICES.ADMIN},
        {...pendingInvite, inviteType: CONST.ONBOARDING_INVITE_TYPES.IOU},
    ])('does not initialize tasks outside pending invited-admin onboarding: %j', async (introSelected) => {
        await Onyx.set(ONYXKEYS.NVP_INTRO_SELECTED, introSelected);
        await waitForBatchedUpdates();
        const {result} = await renderCompletionHook();
        expect(result.current()).toEqual({});
        expect(apiWriteSpy).not.toHaveBeenCalled();
        expect(apiPaginateSpy).not.toHaveBeenCalled();
    });

    it('restores eligibility to create guided setup after OpenReport fails', async () => {
        mockFetch.mockAPICommand(WRITE_COMMANDS.OPEN_REPORT, () => ({jsonCode: 400}));
        await act(async () => {
            openReport({reportID: conciergeReportID, introSelected: pendingInvite, conciergeChat, currentUserAccountID: 1, betas: [], hasReportActions: false});
            await waitForNetworkPromises();
        });
        const introSelected = await getOnyxValue(ONYXKEYS.NVP_INTRO_SELECTED);
        expect(introSelected?.isInviteOnboardingComplete).toBe(false);
        expect(introSelected?.reviewWorkspaceSettings).toBeFalsy();
        expect(getGuidedSetupDataForOpenReport(introSelected, 1, conciergeChat, false, true)).toBeDefined();
    });
});
