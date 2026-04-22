import React from 'react';
import useHoldMenuState from '@hooks/useHoldMenuState';
import useHoldMenuSubmit from '@hooks/useHoldMenuSubmit';
import type {ActionHandledType} from '@hooks/useHoldMenuSubmit';
import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';
import useResponsiveLayout from '@hooks/useResponsiveLayout';
import ONYXKEYS from '@src/ONYXKEYS';
import type {PaymentMethodType} from '@src/types/onyx/OriginalMessage';
import DecisionModal from './DecisionModal';

type ProcessMoneyReportHoldMenuProps = {
    /** Whether modal is visible */
    isVisible: boolean;

    /** Report IDs for this hold menu */
    reportID: string | undefined;
    chatReportID: string | undefined;

    /** Callback for closing modal */
    onClose: () => void;

    /** Type of payment */
    paymentType?: PaymentMethodType;

    /** Selected VBBA ID for payment */
    methodID?: number;

    /** Type of action handled */
    requestType: ActionHandledType;

    /** Callback invoked after the user confirms pay/approve, receives whether the full amount was chosen */
    onConfirm?: (full: boolean) => void;
};

function ProcessMoneyReportHoldMenu({requestType, onClose, isVisible, paymentType, methodID, reportID, chatReportID, onConfirm}: ProcessMoneyReportHoldMenuProps) {
    const {translate} = useLocalize();
    // We need to use isSmallScreenWidth instead of shouldUseNarrowLayout to apply the correct modal type
    // eslint-disable-next-line rulesdir/prefer-shouldUseNarrowLayout-instead-of-isSmallScreenWidth
    const {isSmallScreenWidth} = useResponsiveLayout();
    const [moneyRequestReport] = useOnyx(`${ONYXKEYS.COLLECTION.REPORT}${reportID}`);
    const [chatReport] = useOnyx(`${ONYXKEYS.COLLECTION.REPORT}${chatReportID}`);
    const {nonHeldAmount, fullAmount, hasOnlyHeldExpenses, hasValidNonHeldAmount, transactionCount} = useHoldMenuState(reportID, requestType);
    const hasNonHeldExpenses = !hasOnlyHeldExpenses;

    const {onSubmit, isApprove} = useHoldMenuSubmit({
        moneyRequestReport,
        chatReport,
        requestType,
        paymentType,
        methodID,
        onClose,
        onConfirm,
    });

    return (
        <DecisionModal
            title={translate(isApprove ? 'iou.confirmApprove' : 'iou.confirmPay')}
            onClose={onClose}
            isVisible={isVisible}
            prompt={
                hasNonHeldExpenses
                    ? translate(isApprove ? 'iou.confirmApprovalAmount' : 'iou.confirmPayAmount')
                    : translate(isApprove ? 'iou.confirmApprovalAllHoldAmount' : 'iou.confirmPayAllHoldAmount', {count: transactionCount})
            }
            firstOptionText={hasNonHeldExpenses && hasValidNonHeldAmount ? `${translate(isApprove ? 'iou.approveOnly' : 'iou.payOnly')} ${nonHeldAmount}` : undefined}
            secondOptionText={`${translate(isApprove ? 'iou.approve' : 'iou.pay')} ${fullAmount}`}
            onFirstOptionSubmit={() => onSubmit(false)}
            onSecondOptionSubmit={() => onSubmit(true)}
            isSmallScreenWidth={isSmallScreenWidth}
        />
    );
}

export default ProcessMoneyReportHoldMenu;
export type {ActionHandledType};
