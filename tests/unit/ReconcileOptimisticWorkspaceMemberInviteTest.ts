import reconcileOptimisticWorkspaceMemberInvite from '@libs/Middleware/ReconcileOptimisticWorkspaceMemberInvite';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type {Policy} from '@src/types/onyx';
import type Request from '@src/types/onyx/Request';
import type {AnyOnyxUpdate} from '@src/types/onyx/Request';
import type Response from '@src/types/onyx/Response';

import type {OnyxKey} from 'react-native-onyx';

import Onyx from 'react-native-onyx';

import waitForBatchedUpdates from '../utils/waitForBatchedUpdates';

const POLICY_ID = '123';
const POLICY_KEY = `${ONYXKEYS.COLLECTION.POLICY}${POLICY_ID}`;
const SECONDARY_LOGIN = 'secondary@example.com';
const PRIMARY_LOGIN = 'primary@example.com';
const ACCOUNT_ID = 456;

function buildRequest(logins: string[]): Request<OnyxKey> {
    return {
        command: 'AddMembersToWorkspace',
        data: {policyID: POLICY_ID},
        successData: [
            {
                onyxMethod: Onyx.METHOD.MERGE,
                key: POLICY_KEY,
                value: {
                    employeeList: Object.fromEntries(logins.map((login) => [login, {pendingAction: null}])),
                },
            },
        ],
    } as Request<OnyxKey>;
}

function buildResponse(onyxData: AnyOnyxUpdate[], jsonCode = CONST.JSON_CODE.SUCCESS): Response<OnyxKey> {
    return {jsonCode, onyxData} as Response<OnyxKey>;
}

function buildCanonicalResponse(primaryLogin = PRIMARY_LOGIN, accountID = ACCOUNT_ID): Response<OnyxKey> {
    return buildResponse([
        {
            onyxMethod: Onyx.METHOD.MERGE,
            key: ONYXKEYS.PERSONAL_DETAILS_LIST,
            value: {[accountID]: {accountID, login: primaryLogin}},
        },
        {
            onyxMethod: Onyx.METHOD.MERGE,
            key: POLICY_KEY,
            value: {employeeList: {[primaryLogin]: {role: CONST.POLICY.ROLE.USER}}},
        },
    ]);
}

function getSuccessEmployeeList(request: Request<OnyxKey>): Record<string, unknown> {
    return ((request.successData?.at(0)?.value as {employeeList: Record<string, unknown>}).employeeList ?? {}) as Record<string, unknown>;
}

function buildPolicy(employeeList: Record<string, unknown>): Policy {
    return {id: POLICY_ID, employeeList} as Policy;
}

describe('ReconcileOptimisticWorkspaceMemberInvite middleware', () => {
    beforeAll(() => {
        Onyx.init({keys: ONYXKEYS});
    });

    beforeEach(async () => {
        await Onyx.clear();
        await waitForBatchedUpdates();
    });

    it('removes only a proven secondary-login entry and its later success update', async () => {
        await Onyx.set(
            POLICY_KEY,
            buildPolicy({
                [SECONDARY_LOGIN]: {invitedAccountID: ACCOUNT_ID, pendingAction: CONST.RED_BRICK_ROAD_PENDING_ACTION.ADD, role: CONST.POLICY.ROLE.USER},
            }),
        );
        await waitForBatchedUpdates();

        const request = buildRequest([SECONDARY_LOGIN]);
        const response = buildCanonicalResponse();

        await reconcileOptimisticWorkspaceMemberInvite(Promise.resolve(response), request, false);

        expect(getSuccessEmployeeList(request)[SECONDARY_LOGIN]).toBeUndefined();
        expect(response.onyxData?.at(-1)?.value).toEqual({employeeList: {[SECONDARY_LOGIN]: null}});
    });

    it('keeps a primary-login invite and clears only its marker', async () => {
        await Onyx.set(
            POLICY_KEY,
            buildPolicy({
                [PRIMARY_LOGIN]: {invitedAccountID: ACCOUNT_ID, pendingAction: CONST.RED_BRICK_ROAD_PENDING_ACTION.ADD, role: CONST.POLICY.ROLE.USER},
            }),
        );
        await waitForBatchedUpdates();

        const request = buildRequest([PRIMARY_LOGIN]);
        const response = buildCanonicalResponse();

        await reconcileOptimisticWorkspaceMemberInvite(Promise.resolve(response), request, false);

        expect(getSuccessEmployeeList(request)[PRIMARY_LOGIN]).toEqual({pendingAction: null, invitedAccountID: null});
        expect(response.onyxData).toHaveLength(2);
    });

    it('reconciles each secondary invite independently', async () => {
        const secondSecondaryLogin = 'second-secondary@example.com';
        const secondPrimaryLogin = 'second-primary@example.com';
        const secondAccountID = 789;
        await Onyx.set(
            POLICY_KEY,
            buildPolicy({
                [SECONDARY_LOGIN]: {invitedAccountID: ACCOUNT_ID, pendingAction: CONST.RED_BRICK_ROAD_PENDING_ACTION.ADD, role: CONST.POLICY.ROLE.USER},
                [secondSecondaryLogin]: {invitedAccountID: secondAccountID, pendingAction: CONST.RED_BRICK_ROAD_PENDING_ACTION.ADD, role: CONST.POLICY.ROLE.USER},
            }),
        );
        await waitForBatchedUpdates();

        const request = buildRequest([SECONDARY_LOGIN, secondSecondaryLogin]);
        const response = buildResponse([
            {
                onyxMethod: Onyx.METHOD.MERGE,
                key: ONYXKEYS.PERSONAL_DETAILS_LIST,
                value: {
                    [ACCOUNT_ID]: {accountID: ACCOUNT_ID, login: PRIMARY_LOGIN},
                    [secondAccountID]: {accountID: secondAccountID, login: secondPrimaryLogin},
                },
            },
            {
                onyxMethod: Onyx.METHOD.MERGE,
                key: POLICY_KEY,
                value: {employeeList: {[PRIMARY_LOGIN]: {role: CONST.POLICY.ROLE.USER}, [secondPrimaryLogin]: {role: CONST.POLICY.ROLE.USER}}},
            },
        ]);

        await reconcileOptimisticWorkspaceMemberInvite(Promise.resolve(response), request, false);

        expect(getSuccessEmployeeList(request)).toEqual({});
        expect(response.onyxData?.at(-1)?.value).toEqual({employeeList: {[SECONDARY_LOGIN]: null, [secondSecondaryLogin]: null}});
    });

    it('does nothing when the successful response does not prove the canonical member', async () => {
        await Onyx.set(
            POLICY_KEY,
            buildPolicy({
                [SECONDARY_LOGIN]: {invitedAccountID: ACCOUNT_ID, pendingAction: CONST.RED_BRICK_ROAD_PENDING_ACTION.ADD, role: CONST.POLICY.ROLE.USER},
            }),
        );
        await waitForBatchedUpdates();

        const request = buildRequest([SECONDARY_LOGIN]);
        const response = buildResponse([
            {
                onyxMethod: Onyx.METHOD.MERGE,
                key: ONYXKEYS.PERSONAL_DETAILS_LIST,
                value: {[ACCOUNT_ID]: {accountID: ACCOUNT_ID, login: PRIMARY_LOGIN}},
            },
        ]);

        await reconcileOptimisticWorkspaceMemberInvite(Promise.resolve(response), request, false);

        expect(getSuccessEmployeeList(request)[SECONDARY_LOGIN]).toEqual({pendingAction: null});
        expect(response.onyxData).toHaveLength(1);
    });

    it('does not reconcile a failed invite', async () => {
        await Onyx.set(
            POLICY_KEY,
            buildPolicy({
                [SECONDARY_LOGIN]: {invitedAccountID: ACCOUNT_ID, pendingAction: CONST.RED_BRICK_ROAD_PENDING_ACTION.ADD, role: CONST.POLICY.ROLE.USER},
            }),
        );
        await waitForBatchedUpdates();

        const request = buildRequest([SECONDARY_LOGIN]);
        const response = buildCanonicalResponse();
        response.jsonCode = 400;

        await reconcileOptimisticWorkspaceMemberInvite(Promise.resolve(response), request, false);

        expect(getSuccessEmployeeList(request)[SECONDARY_LOGIN]).toEqual({pendingAction: null});
        expect(response.onyxData).toHaveLength(2);
    });
});
