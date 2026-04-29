import {useEffect, useState} from 'react';
import useCurrentUserPersonalDetails from '@hooks/useCurrentUserPersonalDetails';
import useOnyx from '@hooks/useOnyx';
import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import getHomeEarlyDiscountInfo from '../../common/getHomeEarlyDiscountInfo';

function useTimeSensitiveEarlyDiscount() {
    const [, setRefreshIntervalTick] = useState(0);
    const {accountID} = useCurrentUserPersonalDetails();
    const [firstDayFreeTrial] = useOnyx(ONYXKEYS.NVP_FIRST_DAY_FREE_TRIAL);
    const [lastDayFreeTrial] = useOnyx(ONYXKEYS.NVP_LAST_DAY_FREE_TRIAL);
    const [userBillingFundID] = useOnyx(ONYXKEYS.NVP_BILLING_FUND_ID);
    const [allPolicies] = useOnyx(ONYXKEYS.COLLECTION.POLICY);

    const discountInfo = getHomeEarlyDiscountInfo(accountID, firstDayFreeTrial, lastDayFreeTrial, userBillingFundID, allPolicies);
    const shouldShowEarlyDiscount = discountInfo?.discountType === 50;

    useEffect(() => {
        if (!shouldShowEarlyDiscount) {
            return;
        }

        const intervalID = setInterval(() => {
            setRefreshIntervalTick((previousValue) => previousValue + 1);
        }, CONST.MILLISECONDS_PER_SECOND);

        return () => {
            clearInterval(intervalID);
        };
    }, [shouldShowEarlyDiscount]);

    return {
        discountInfo,
        shouldShowEarlyDiscount,
    };
}

export default useTimeSensitiveEarlyDiscount;
