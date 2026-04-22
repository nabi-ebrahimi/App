import {useMemo} from 'react';
import {getHoldMenuDisplayState} from '@libs/MoneyRequestReportUtils';
import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type {ActionHandledType} from './useHoldMenuSubmit';
import useOnyx from './useOnyx';
import useTransactionsAndViolationsForReport from './useTransactionsAndViolationsForReport';

function useHoldMenuState(reportID: string | undefined, requestType: ActionHandledType) {
    const [moneyRequestReport] = useOnyx(`${ONYXKEYS.COLLECTION.REPORT}${reportID}`);
    const {transactions: reportTransactions} = useTransactionsAndViolationsForReport(reportID);

    return useMemo(() => {
        const transactions = Object.values(reportTransactions);

        return getHoldMenuDisplayState(moneyRequestReport, transactions, requestType ?? CONST.IOU.REPORT_ACTION_TYPE.APPROVE);
    }, [moneyRequestReport, reportTransactions, requestType]);
}

export default useHoldMenuState;
