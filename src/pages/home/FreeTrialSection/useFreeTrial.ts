import {useEffect, useState} from 'react';
import useCurrentUserPersonalDetails from '@hooks/useCurrentUserPersonalDetails';
import useOnyx from '@hooks/useOnyx';
import {getOwnedPaidPolicies} from '@libs/PolicyUtils';
import type {DiscountInfo} from '@libs/SubscriptionUtils';
import {calculateRemainingFreeTrialDays, doesUserHavePaymentCardAdded, isUserOnFreeTrial} from '@libs/SubscriptionUtils';
import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import getHomeEarlyDiscountInfo from '../common/getHomeEarlyDiscountInfo';

const DISCOUNT_TYPE = {
    HALF_OFF: 50,
    QUARTER_OFF: 25,
} as const;

type DiscountType = (typeof DISCOUNT_TYPE)[keyof typeof DISCOUNT_TYPE] | null;

function getDiscountType(discountInfo: DiscountInfo | null): DiscountType {
    if (!discountInfo) {
        return null;
    }
    return discountInfo.discountType === DISCOUNT_TYPE.HALF_OFF ? DISCOUNT_TYPE.HALF_OFF : DISCOUNT_TYPE.QUARTER_OFF;
}

type FreeTrialState = {
    shouldShowFreeTrialSection: boolean;
    discountType: DiscountType;
    daysLeft: number;
    discountInfo: DiscountInfo | null;
};

function useFreeTrial(): FreeTrialState {
    const [, setRefreshIntervalTick] = useState(0);
    const [firstDayFreeTrial] = useOnyx(ONYXKEYS.NVP_FIRST_DAY_FREE_TRIAL);
    const [lastDayFreeTrial] = useOnyx(ONYXKEYS.NVP_LAST_DAY_FREE_TRIAL);
    const [userBillingFundID] = useOnyx(ONYXKEYS.NVP_BILLING_FUND_ID);
    const {accountID} = useCurrentUserPersonalDetails();
    const [allPolicies] = useOnyx(ONYXKEYS.COLLECTION.POLICY);

    const onFreeTrial = isUserOnFreeTrial(firstDayFreeTrial, lastDayFreeTrial);
    const hasPaymentCard = doesUserHavePaymentCardAdded(userBillingFundID);
    const hasOwnedPaidPolicies = getOwnedPaidPolicies(allPolicies, accountID).length > 0;
    const daysLeft = calculateRemainingFreeTrialDays(lastDayFreeTrial);
    const discountInfo = getHomeEarlyDiscountInfo(accountID, firstDayFreeTrial, lastDayFreeTrial, userBillingFundID, allPolicies);
    const shouldHideFreeTrialSection = discountInfo?.discountType === DISCOUNT_TYPE.HALF_OFF;

    useEffect(() => {
        if (!shouldHideFreeTrialSection) {
            return;
        }

        const intervalID = setInterval(() => {
            setRefreshIntervalTick((previousValue) => previousValue + 1);
        }, CONST.MILLISECONDS_PER_SECOND);

        return () => {
            clearInterval(intervalID);
        };
    }, [shouldHideFreeTrialSection]);

    if (!onFreeTrial || hasPaymentCard || !hasOwnedPaidPolicies) {
        return {shouldShowFreeTrialSection: false, discountType: null, daysLeft: 0, discountInfo: null};
    }

    return {
        shouldShowFreeTrialSection: !shouldHideFreeTrialSection,
        discountType: getDiscountType(discountInfo),
        daysLeft,
        discountInfo,
    };
}

export default useFreeTrial;
export type {DiscountType, FreeTrialState};
