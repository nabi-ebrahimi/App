import {useEffect, useState} from 'react';
import useCurrentUserPersonalDetails from '@hooks/useCurrentUserPersonalDetails';
import useOnyx from '@hooks/useOnyx';
import type {DiscountInfo} from '@libs/SubscriptionUtils';
import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import getHomeEarlyDiscountInfo from '../../common/getHomeEarlyDiscountInfo';

type TimeSensitiveEarlyDiscountState = {
    discountInfo: DiscountInfo | null;
    shouldShowEarlyDiscount: boolean;
};

function useTimeSensitiveEarlyDiscount(): TimeSensitiveEarlyDiscountState {
    const {accountID} = useCurrentUserPersonalDetails();
    const [firstDayFreeTrial] = useOnyx(ONYXKEYS.NVP_FIRST_DAY_FREE_TRIAL);
    const [lastDayFreeTrial] = useOnyx(ONYXKEYS.NVP_LAST_DAY_FREE_TRIAL);
    const [userBillingFundID] = useOnyx(ONYXKEYS.NVP_BILLING_FUND_ID);
    const [allPolicies] = useOnyx(ONYXKEYS.COLLECTION.POLICY);
    const [, setTick] = useState(0);

    const discountInfo = getHomeEarlyDiscountInfo({accountID, allPolicies, firstDayFreeTrial, lastDayFreeTrial, userBillingFundID});

    useEffect(() => {
        if (discountInfo?.discountType !== 50) {
            return;
        }

        const intervalID = setInterval(() => {
            setTick((currentTick) => currentTick + 1);
        }, CONST.MILLISECONDS_PER_SECOND);

        return () => clearInterval(intervalID);
    }, [discountInfo?.discountType]);

    const shouldShowEarlyDiscount = discountInfo?.discountType === 50;

    return {discountInfo: shouldShowEarlyDiscount ? discountInfo : null, shouldShowEarlyDiscount};
}

export default useTimeSensitiveEarlyDiscount;
export type {TimeSensitiveEarlyDiscountState};
