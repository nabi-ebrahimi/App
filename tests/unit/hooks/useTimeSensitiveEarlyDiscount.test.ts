/* eslint-disable @typescript-eslint/naming-convention */
import {renderHook} from '@testing-library/react-native';
import Onyx from 'react-native-onyx';
import {getOwnedPaidPolicies} from '@libs/PolicyUtils';
import {doesUserHavePaymentCardAdded, getEarlyDiscountInfo, isUserOnFreeTrial} from '@libs/SubscriptionUtils';
import useTimeSensitiveEarlyDiscount from '@pages/home/TimeSensitiveSection/hooks/useTimeSensitiveEarlyDiscount';
import ONYXKEYS from '@src/ONYXKEYS';
import waitForBatchedUpdates from '../../utils/waitForBatchedUpdates';

jest.mock('@hooks/useCurrentUserPersonalDetails', () => ({
    __esModule: true,
    default: jest.fn(() => ({accountID: 123})),
}));

jest.mock('@libs/PolicyUtils', () => ({
    getOwnedPaidPolicies: jest.fn(() => [{id: 'policyID'}]),
}));

jest.mock('@libs/SubscriptionUtils', () => ({
    isUserOnFreeTrial: jest.fn(() => true),
    doesUserHavePaymentCardAdded: jest.fn(() => false),
    getEarlyDiscountInfo: jest.fn(() => ({discountType: 50, days: 0, hours: 20, minutes: 30, seconds: 15})),
}));

const mockedGetOwnedPaidPolicies = getOwnedPaidPolicies as jest.Mock;
const mockedIsUserOnFreeTrial = isUserOnFreeTrial as jest.Mock;
const mockedDoesUserHavePaymentCardAdded = doesUserHavePaymentCardAdded as jest.Mock;
const mockedGetEarlyDiscountInfo = getEarlyDiscountInfo as jest.Mock;

describe('useTimeSensitiveEarlyDiscount', () => {
    beforeAll(() => {
        Onyx.init({keys: ONYXKEYS});
    });

    beforeEach(async () => {
        await Onyx.clear();
        await waitForBatchedUpdates();
        jest.clearAllMocks();
        mockedGetOwnedPaidPolicies.mockReturnValue([{id: 'policyID'}]);
        mockedIsUserOnFreeTrial.mockReturnValue(true);
        mockedDoesUserHavePaymentCardAdded.mockReturnValue(false);
        mockedGetEarlyDiscountInfo.mockReturnValue({discountType: 50, days: 0, hours: 20, minutes: 30, seconds: 15});
    });

    afterEach(async () => {
        await Onyx.clear();
    });

    it('shows the row during the first 24 hours when the discount is 50%', () => {
        const {result} = renderHook(() => useTimeSensitiveEarlyDiscount());

        expect(result.current.shouldShowEarlyDiscount).toBe(true);
        expect(result.current.discountInfo).toEqual({discountType: 50, days: 0, hours: 20, minutes: 30, seconds: 15});
    });

    it('hides the row after the first 24 hours when the discount switches to 25%', () => {
        mockedGetEarlyDiscountInfo.mockReturnValue({discountType: 25, days: 5, hours: 0, minutes: 0, seconds: 0});

        const {result} = renderHook(() => useTimeSensitiveEarlyDiscount());

        expect(result.current.shouldShowEarlyDiscount).toBe(false);
        expect(result.current.discountInfo).toEqual({discountType: 25, days: 5, hours: 0, minutes: 0, seconds: 0});
    });

    it('hides the row when a payment card is already present', () => {
        mockedDoesUserHavePaymentCardAdded.mockReturnValue(true);

        const {result} = renderHook(() => useTimeSensitiveEarlyDiscount());

        expect(result.current.shouldShowEarlyDiscount).toBe(false);
        expect(result.current.discountInfo).toBeNull();
        expect(mockedGetEarlyDiscountInfo).not.toHaveBeenCalled();
    });

    it('hides the row when the user does not own a paid workspace', () => {
        mockedGetOwnedPaidPolicies.mockReturnValue([]);

        const {result} = renderHook(() => useTimeSensitiveEarlyDiscount());

        expect(result.current.shouldShowEarlyDiscount).toBe(false);
        expect(result.current.discountInfo).toBeNull();
        expect(mockedGetEarlyDiscountInfo).not.toHaveBeenCalled();
    });

    it('hides the row when the user is not on a free trial', () => {
        mockedIsUserOnFreeTrial.mockReturnValue(false);

        const {result} = renderHook(() => useTimeSensitiveEarlyDiscount());

        expect(result.current.shouldShowEarlyDiscount).toBe(false);
        expect(result.current.discountInfo).toBeNull();
        expect(mockedGetEarlyDiscountInfo).not.toHaveBeenCalled();
    });
});
