import type {OnyxCollection} from 'react-native-onyx';
import {getOwnedPaidPolicies} from '@libs/PolicyUtils';
import type {DiscountInfo} from '@libs/SubscriptionUtils';
import {doesUserHavePaymentCardAdded, getEarlyDiscountInfo, isUserOnFreeTrial} from '@libs/SubscriptionUtils';
import type {Policy} from '@src/types/onyx';

type GetHomeEarlyDiscountInfoParams = {
    accountID: number | undefined;
    allPolicies: OnyxCollection<Policy>;
    firstDayFreeTrial: string | undefined;
    lastDayFreeTrial: string | undefined;
    userBillingFundID: number | undefined;
};

function getHomeEarlyDiscountInfo({accountID, allPolicies, firstDayFreeTrial, lastDayFreeTrial, userBillingFundID}: GetHomeEarlyDiscountInfoParams): DiscountInfo | null {
    const hasOwnedPaidPolicies = getOwnedPaidPolicies(allPolicies, accountID).length > 0;

    if (!hasOwnedPaidPolicies) {
        return null;
    }

    if (!isUserOnFreeTrial(firstDayFreeTrial, lastDayFreeTrial)) {
        return null;
    }

    if (doesUserHavePaymentCardAdded(userBillingFundID)) {
        return null;
    }

    return getEarlyDiscountInfo(firstDayFreeTrial);
}

export default getHomeEarlyDiscountInfo;
export type {GetHomeEarlyDiscountInfoParams};
