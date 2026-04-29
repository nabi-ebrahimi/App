import type {OnyxCollection} from 'react-native-onyx';
import {getOwnedPaidPolicies} from '@libs/PolicyUtils';
import type {DiscountInfo} from '@libs/SubscriptionUtils';
import {doesUserHavePaymentCardAdded, getEarlyDiscountInfo, isUserOnFreeTrial} from '@libs/SubscriptionUtils';
import type {Policy} from '@src/types/onyx';

function getHomeEarlyDiscountInfo(
    currentUserAccountID: number | undefined,
    firstDayFreeTrial: string | undefined,
    lastDayFreeTrial: string | undefined,
    userBillingFundID: number | undefined,
    policies: OnyxCollection<Policy> | null,
): DiscountInfo | null {
    if (!getOwnedPaidPolicies(policies, currentUserAccountID).length) {
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
