import {useEffect, useState} from 'react';
import useCurrentUserPersonalDetails from '@hooks/useCurrentUserPersonalDetails';
import useOnyx from '@hooks/useOnyx';
import type {DiscountInfo} from '@libs/SubscriptionUtils';
import getHomeEarlyDiscountInfo from '@pages/home/common/getHomeEarlyDiscountInfo';
import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';

type UseTimeSensitiveEarlyDiscountResult = {
    discountInfo: DiscountInfo | null;
    shouldShowEarlyDiscount: boolean;
};

function useTimeSensitiveEarlyDiscount(): UseTimeSensitiveEarlyDiscountResult {
    const [firstDayFreeTrial] = useOnyx(ONYXKEYS.NVP_FIRST_DAY_FREE_TRIAL);
    const [lastDayFreeTrial] = useOnyx(ONYXKEYS.NVP_LAST_DAY_FREE_TRIAL);
    const [userBillingFundID] = useOnyx(ONYXKEYS.NVP_BILLING_FUND_ID);
    const [allPolicies] = useOnyx(ONYXKEYS.COLLECTION.POLICY);
    const {accountID} = useCurrentUserPersonalDetails();
    const [discountInfo, setDiscountInfo] = useState<DiscountInfo | null>(() => getHomeEarlyDiscountInfo(accountID, firstDayFreeTrial, lastDayFreeTrial, userBillingFundID, allPolicies));

    useEffect(() => {
        setDiscountInfo(getHomeEarlyDiscountInfo(accountID, firstDayFreeTrial, lastDayFreeTrial, userBillingFundID, allPolicies));
    }, [accountID, firstDayFreeTrial, lastDayFreeTrial, userBillingFundID, allPolicies]);

    useEffect(() => {
        if (discountInfo?.discountType !== 50) {
            return;
        }

        const intervalID = setInterval(() => {
            setDiscountInfo(getHomeEarlyDiscountInfo(accountID, firstDayFreeTrial, lastDayFreeTrial, userBillingFundID, allPolicies));
        }, CONST.MILLISECONDS_PER_SECOND);

        return () => {
            clearInterval(intervalID);
        };
    }, [accountID, firstDayFreeTrial, lastDayFreeTrial, userBillingFundID, allPolicies, discountInfo?.discountType]);

    return {
        discountInfo,
        shouldShowEarlyDiscount: discountInfo?.discountType === 50,
    };
}

export default useTimeSensitiveEarlyDiscount;
