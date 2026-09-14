import {getGuidedSetupDataForOpenReport, openReport} from '@libs/actions/Report';
import {getReviewWorkspaceSettingsTaskCompletionData} from '@libs/actions/Task';
import {isSupportedPendingInviteOnboarding} from '@libs/OnboardingUtils';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';

import {guidedSetupAndTourStatusSelector} from '@selectors/Onboarding';

import useCurrentUserPersonalDetails from './useCurrentUserPersonalDetails';
import useOnboardingTaskInformation from './useOnboardingTaskInformation';
import useOnyx from './useOnyx';

/**
 * Returns a getter that builds the optimistic Onyx data completing the "Review your workspace settings" onboarding
 * task, to be merged into a workspace-settings write command's onyxData.
 *
 * The getter is intentionally lazy: `getReviewWorkspaceSettingsTaskCompletionData` mints a fresh optimistic
 * `reportActionID` on every call, so it must run at save time (not eagerly per render).
 */
function useReviewWorkspaceSettingsTaskCompletion() {
    const {accountID} = useCurrentUserPersonalDetails();
    const taskInformation = useOnboardingTaskInformation(CONST.ONBOARDING_TASK_TYPE.REVIEW_WORKSPACE_SETTINGS);
    const [introSelected] = useOnyx(ONYXKEYS.NVP_INTRO_SELECTED);
    const [conciergeReportID] = useOnyx(ONYXKEYS.CONCIERGE_REPORT_ID);
    const [conciergeChat] = useOnyx(`${ONYXKEYS.COLLECTION.REPORT}${conciergeReportID}`);
    const [hasReportActions] = useOnyx(`${ONYXKEYS.COLLECTION.REPORT_ACTIONS}${conciergeReportID}`, {selector: Boolean});
    const [betas] = useOnyx(ONYXKEYS.BETAS);
    const [guidedSetupAndTourStatus] = useOnyx(ONYXKEYS.NVP_ONBOARDING, {selector: guidedSetupAndTourStatusSelector});

    return () => {
        const isPendingInvitedAdmin = isSupportedPendingInviteOnboarding(introSelected) && introSelected.choice === CONST.ONBOARDING_CHOICES.ADMIN;
        const isInvitedAdminTaskBeingCreated =
            introSelected?.choice === CONST.ONBOARDING_CHOICES.ADMIN &&
            introSelected.inviteType === CONST.ONBOARDING_INVITE_TYPES.WORKSPACE &&
            taskInformation.taskReport?.pendingFields?.createChat === CONST.RED_BRICK_ROAD_PENDING_ACTION.ADD;
        const shouldRecordSuccessfulReview = !introSelected?.hasReviewedWorkspaceSettings && (isPendingInvitedAdmin || isInvitedAdminTaskBeingCreated);

        if (taskInformation.taskReport) {
            return getReviewWorkspaceSettingsTaskCompletionData(taskInformation, accountID, shouldRecordSuccessfulReview);
        }

        if (!conciergeChat || !conciergeReportID || !isPendingInvitedAdmin) {
            return getReviewWorkspaceSettingsTaskCompletionData(taskInformation, accountID, shouldRecordSuccessfulReview);
        }

        const guidedSetup = getGuidedSetupDataForOpenReport(
            introSelected,
            accountID,
            conciergeChat,
            guidedSetupAndTourStatus?.isSelfTourViewed,
            guidedSetupAndTourStatus?.hasCompletedGuidedSetupFlow,
        );
        if (!guidedSetup?.reviewWorkspaceSettingsTaskInformation) {
            return getReviewWorkspaceSettingsTaskCompletionData(taskInformation, accountID, shouldRecordSuccessfulReview);
        }

        // Queue creation first and use the same generated task, before Onyx has notified the hook.
        openReport({
            reportID: conciergeReportID,
            introSelected,
            conciergeChat,
            currentUserAccountID: accountID,
            hasReportActions,
            betas,
            shouldMarkAsRead: false,
            guidedSetup,
        });

        return getReviewWorkspaceSettingsTaskCompletionData(guidedSetup.reviewWorkspaceSettingsTaskInformation, accountID, shouldRecordSuccessfulReview);
    };
}

export default useReviewWorkspaceSettingsTaskCompletion;
