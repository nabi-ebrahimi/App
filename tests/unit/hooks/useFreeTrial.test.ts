/* eslint-disable @typescript-eslint/naming-convention */
import {act, renderHook} from '@testing-library/react-native';
import Onyx from 'react-native-onyx';
import {getOwnedPaidPolicies} from '@libs/PolicyUtils';
import {calculateRemainingFreeTrialDays, doesUserHavePaymentCardAdded, isUserOnFreeTrial} from '@libs/SubscriptionUtils';
import getHomeEarlyDiscountInfo from '@pages/home/common/getHomeEarlyDiscountInfo';
import useFreeTrial from '@pages/home/FreeTrialSection/useFreeTrial';
import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import waitForBatchedUpdates from '../../utils/waitForBatchedUpdates';

jest.mock('@libs/PolicyUtils', () => ({
    getOwnedPaidPolicies: jest.fn(() => [{id: 'policyID'}]),
}));

jest.mock('@libs/SubscriptionUtils', () => ({
    isUserOnFreeTrial: jest.fn(() => false),
    doesUserHavePaymentCardAdded: jest.fn(() => true),
    calculateRemainingFreeTrialDays: jest.fn(() => 0),
}));

jest.mock('@pages/home/common/getHomeEarlyDiscountInfo', () => ({
    __esModule: true,
    default: jest.fn(() => null),
}));

const mockedGetOwnedPaidPolicies = getOwnedPaidPolicies as jest.Mock;
const mockedIsUserOnFreeTrial = isUserOnFreeTrial as jest.Mock;
const mockedDoesUserHavePaymentCardAdded = doesUserHavePaymentCardAdded as jest.Mock;
const mockedCalculateRemainingFreeTrialDays = calculateRemainingFreeTrialDays as jest.Mock;
const mockedGetHomeEarlyDiscountInfo = getHomeEarlyDiscountInfo as jest.Mock;

describe('useFreeTrial', () => {
    beforeAll(() => {
        Onyx.init({keys: ONYXKEYS});
    });

    beforeEach(async () => {
        await Onyx.clear();
        await waitForBatchedUpdates();
        jest.clearAllMocks();
        jest.useRealTimers();
        mockedGetOwnedPaidPolicies.mockReturnValue([{id: 'policyID'}]);
        mockedGetHomeEarlyDiscountInfo.mockReturnValue(null);
    });

    afterEach(async () => {
        await Onyx.clear();
        jest.useRealTimers();
    });

    describe('section visibility', () => {
        it('should not show section when user is not on free trial', () => {
            mockedIsUserOnFreeTrial.mockReturnValue(false);
            mockedDoesUserHavePaymentCardAdded.mockReturnValue(false);

            const {result} = renderHook(() => useFreeTrial());

            expect(result.current.shouldShowFreeTrialSection).toBe(false);
        });

        it('should not show section when user already has a billing card', () => {
            mockedIsUserOnFreeTrial.mockReturnValue(true);
            mockedDoesUserHavePaymentCardAdded.mockReturnValue(true);

            const {result} = renderHook(() => useFreeTrial());

            expect(result.current.shouldShowFreeTrialSection).toBe(false);
        });

        it('should show section when user is on free trial and has no billing card', () => {
            mockedIsUserOnFreeTrial.mockReturnValue(true);
            mockedDoesUserHavePaymentCardAdded.mockReturnValue(false);
            mockedCalculateRemainingFreeTrialDays.mockReturnValue(15);

            const {result} = renderHook(() => useFreeTrial());

            expect(result.current.shouldShowFreeTrialSection).toBe(true);
        });

        it("should not show section when user doesn't own any paid workspaces", () => {
            mockedIsUserOnFreeTrial.mockReturnValue(true);
            mockedDoesUserHavePaymentCardAdded.mockReturnValue(false);
            mockedGetOwnedPaidPolicies.mockReturnValue([]);

            const {result} = renderHook(() => useFreeTrial());

            expect(result.current.shouldShowFreeTrialSection).toBe(false);
        });

        it('should hide the free trial section while the 50% Home time-sensitive row is active', () => {
            mockedIsUserOnFreeTrial.mockReturnValue(true);
            mockedDoesUserHavePaymentCardAdded.mockReturnValue(false);
            mockedCalculateRemainingFreeTrialDays.mockReturnValue(30);
            mockedGetHomeEarlyDiscountInfo.mockReturnValue({discountType: 50, days: 0, hours: 20, minutes: 30, seconds: 15});

            const {result} = renderHook(() => useFreeTrial());

            expect(result.current.shouldShowFreeTrialSection).toBe(false);
            expect(result.current.discountType).toBe(50);
        });
    });

    describe('discount state', () => {
        it('should return discountType 25 when the Home discount is in the 25% phase', () => {
            mockedIsUserOnFreeTrial.mockReturnValue(true);
            mockedDoesUserHavePaymentCardAdded.mockReturnValue(false);
            mockedGetHomeEarlyDiscountInfo.mockReturnValue({discountType: 25, days: 5, hours: 12, minutes: 0, seconds: 0});
            mockedCalculateRemainingFreeTrialDays.mockReturnValue(25);

            const {result} = renderHook(() => useFreeTrial());

            expect(result.current.shouldShowFreeTrialSection).toBe(true);
            expect(result.current.discountType).toBe(25);
        });

        it('should return discountType null when no discount is available but trial is active', () => {
            mockedIsUserOnFreeTrial.mockReturnValue(true);
            mockedDoesUserHavePaymentCardAdded.mockReturnValue(false);
            mockedGetHomeEarlyDiscountInfo.mockReturnValue(null);
            mockedCalculateRemainingFreeTrialDays.mockReturnValue(10);

            const {result} = renderHook(() => useFreeTrial());

            expect(result.current.shouldShowFreeTrialSection).toBe(true);
            expect(result.current.discountType).toBeNull();
        });
    });

    describe('daysLeft', () => {
        it('should return the remaining trial days from calculateRemainingFreeTrialDays', () => {
            mockedIsUserOnFreeTrial.mockReturnValue(true);
            mockedDoesUserHavePaymentCardAdded.mockReturnValue(false);
            mockedCalculateRemainingFreeTrialDays.mockReturnValue(12);

            const {result} = renderHook(() => useFreeTrial());

            expect(result.current.daysLeft).toBe(12);
        });
    });

    describe('discountInfo', () => {
        it('should return discount info from getHomeEarlyDiscountInfo when on trial', () => {
            mockedIsUserOnFreeTrial.mockReturnValue(true);
            mockedDoesUserHavePaymentCardAdded.mockReturnValue(false);
            mockedCalculateRemainingFreeTrialDays.mockReturnValue(5);
            mockedGetHomeEarlyDiscountInfo.mockReturnValue({discountType: 50, days: 0, hours: 23, minutes: 59, seconds: 30});

            const {result} = renderHook(() => useFreeTrial());

            expect(result.current.discountInfo).toEqual({discountType: 50, days: 0, hours: 23, minutes: 59, seconds: 30});
        });

        it('should return null for discountInfo when getHomeEarlyDiscountInfo returns null', () => {
            mockedIsUserOnFreeTrial.mockReturnValue(true);
            mockedDoesUserHavePaymentCardAdded.mockReturnValue(false);
            mockedCalculateRemainingFreeTrialDays.mockReturnValue(5);
            mockedGetHomeEarlyDiscountInfo.mockReturnValue(null);

            const {result} = renderHook(() => useFreeTrial());

            expect(result.current.discountInfo).toBeNull();
        });
    });

    describe('hook dependencies', () => {
        it('should call isUserOnFreeTrial with correct trial dates from Onyx', async () => {
            const firstDayFreeTrial = '2026-03-01 00:00:00';
            const lastDayFreeTrial = '2026-03-31 00:00:00';

            await Onyx.merge(ONYXKEYS.NVP_FIRST_DAY_FREE_TRIAL, firstDayFreeTrial);
            await Onyx.merge(ONYXKEYS.NVP_LAST_DAY_FREE_TRIAL, lastDayFreeTrial);
            await waitForBatchedUpdates();

            mockedIsUserOnFreeTrial.mockReturnValue(true);
            mockedDoesUserHavePaymentCardAdded.mockReturnValue(false);
            mockedCalculateRemainingFreeTrialDays.mockReturnValue(20);

            renderHook(() => useFreeTrial());

            expect(mockedIsUserOnFreeTrial).toHaveBeenCalledWith(firstDayFreeTrial, lastDayFreeTrial);
        });

        it('should call doesUserHavePaymentCardAdded with billing fund ID from Onyx', async () => {
            const userBillingFundID = 12345;

            await Onyx.merge(ONYXKEYS.NVP_BILLING_FUND_ID, userBillingFundID);
            await waitForBatchedUpdates();

            mockedIsUserOnFreeTrial.mockReturnValue(true);
            mockedDoesUserHavePaymentCardAdded.mockReturnValue(true);

            renderHook(() => useFreeTrial());

            expect(mockedDoesUserHavePaymentCardAdded).toHaveBeenCalledWith(userBillingFundID);
        });

        it('should call getHomeEarlyDiscountInfo with the Home trial data', async () => {
            const firstDayFreeTrial = '2026-03-01 00:00:00';
            const lastDayFreeTrial = '2026-03-31 00:00:00';
            const userBillingFundID = 12345;

            await Onyx.merge(ONYXKEYS.NVP_FIRST_DAY_FREE_TRIAL, firstDayFreeTrial);
            await Onyx.merge(ONYXKEYS.NVP_LAST_DAY_FREE_TRIAL, lastDayFreeTrial);
            await Onyx.merge(ONYXKEYS.NVP_BILLING_FUND_ID, userBillingFundID);
            await waitForBatchedUpdates();

            mockedIsUserOnFreeTrial.mockReturnValue(false);

            renderHook(() => useFreeTrial());

            expect(mockedGetHomeEarlyDiscountInfo).toHaveBeenCalledWith(CONST.DEFAULT_NUMBER_ID, firstDayFreeTrial, lastDayFreeTrial, userBillingFundID, {});
        });

        it('should call calculateRemainingFreeTrialDays with lastDayFreeTrial', async () => {
            const lastDayFreeTrial = '2026-03-31 00:00:00';

            await Onyx.merge(ONYXKEYS.NVP_LAST_DAY_FREE_TRIAL, lastDayFreeTrial);
            await waitForBatchedUpdates();

            mockedIsUserOnFreeTrial.mockReturnValue(true);
            mockedDoesUserHavePaymentCardAdded.mockReturnValue(false);
            mockedCalculateRemainingFreeTrialDays.mockReturnValue(20);

            renderHook(() => useFreeTrial());

            expect(mockedCalculateRemainingFreeTrialDays).toHaveBeenCalledWith(lastDayFreeTrial);
        });
    });

    describe('discount transitions', () => {
        it('should show the free trial section again once the 50% window becomes 25%', () => {
            jest.useFakeTimers();
            mockedIsUserOnFreeTrial.mockReturnValue(true);
            mockedDoesUserHavePaymentCardAdded.mockReturnValue(false);
            mockedCalculateRemainingFreeTrialDays.mockReturnValue(30);
            mockedGetHomeEarlyDiscountInfo
                .mockReturnValueOnce({discountType: 50, days: 0, hours: 0, minutes: 0, seconds: 1})
                .mockReturnValue({discountType: 25, days: 6, hours: 23, minutes: 59, seconds: 59});

            const {result} = renderHook(() => useFreeTrial());

            expect(result.current.shouldShowFreeTrialSection).toBe(false);
            expect(result.current.discountType).toBe(50);

            act(() => {
                jest.advanceTimersByTime(CONST.MILLISECONDS_PER_SECOND);
            });

            expect(result.current.shouldShowFreeTrialSection).toBe(true);
            expect(result.current.discountType).toBe(25);
        });
    });
});
