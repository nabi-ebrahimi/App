/* eslint-disable @typescript-eslint/naming-convention */
import {act, renderHook} from '@testing-library/react-native';
import Onyx from 'react-native-onyx';
import useTimeSensitiveEarlyDiscount from '@pages/home/TimeSensitiveSection/hooks/useTimeSensitiveEarlyDiscount';
import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import createRandomPolicy from '../../utils/collections/policies';
import waitForBatchedUpdates from '../../utils/waitForBatchedUpdates';

jest.mock('@hooks/useCurrentUserPersonalDetails', () => ({
    __esModule: true,
    default: jest.fn(() => ({accountID: 1})),
}));

describe('useTimeSensitiveEarlyDiscount', () => {
    const firstDayFreeTrial = '2026-04-21 09:00:00';
    const lastDayFreeTrial = '2026-05-21 09:00:00';
    const policyID = '1';

    beforeAll(() => {
        Onyx.init({keys: ONYXKEYS});
    });

    beforeEach(async () => {
        jest.useFakeTimers();
        await Onyx.clear();
        await waitForBatchedUpdates();
    });

    afterEach(async () => {
        jest.useRealTimers();
        await Onyx.clear();
    });

    it('shows the early discount during the first 24 hours', async () => {
        jest.setSystemTime(new Date('2026-04-21T12:00:00.000Z'));

        await Onyx.set(ONYXKEYS.NVP_FIRST_DAY_FREE_TRIAL, firstDayFreeTrial);
        await Onyx.set(ONYXKEYS.NVP_LAST_DAY_FREE_TRIAL, lastDayFreeTrial);
        await Onyx.set(`${ONYXKEYS.COLLECTION.POLICY}${policyID}`, {
            ...createRandomPolicy(Number(policyID), CONST.POLICY.TYPE.TEAM),
            ownerAccountID: 1,
        });
        await waitForBatchedUpdates();

        const {result} = renderHook(() => useTimeSensitiveEarlyDiscount());

        expect(result.current.shouldShowEarlyDiscount).toBe(true);
        expect(result.current.discountInfo?.discountType).toBe(50);
    });

    it('updates the countdown every second while the early discount is active', async () => {
        jest.setSystemTime(new Date('2026-04-21T12:00:00.000Z'));

        await Onyx.set(ONYXKEYS.NVP_FIRST_DAY_FREE_TRIAL, firstDayFreeTrial);
        await Onyx.set(ONYXKEYS.NVP_LAST_DAY_FREE_TRIAL, lastDayFreeTrial);
        await Onyx.set(`${ONYXKEYS.COLLECTION.POLICY}${policyID}`, {
            ...createRandomPolicy(Number(policyID), CONST.POLICY.TYPE.TEAM),
            ownerAccountID: 1,
        });
        await waitForBatchedUpdates();

        const {result} = renderHook(() => useTimeSensitiveEarlyDiscount());
        const initialSeconds = result.current.discountInfo?.seconds;

        act(() => {
            jest.advanceTimersByTime(CONST.MILLISECONDS_PER_SECOND);
        });
        await waitForBatchedUpdates();

        expect(result.current.shouldShowEarlyDiscount).toBe(true);
        expect(result.current.discountInfo?.seconds).not.toBe(initialSeconds);
    });

    it('hides the early discount after the first 24 hours', async () => {
        jest.setSystemTime(new Date('2026-04-22T10:00:00.000Z'));

        await Onyx.set(ONYXKEYS.NVP_FIRST_DAY_FREE_TRIAL, firstDayFreeTrial);
        await Onyx.set(ONYXKEYS.NVP_LAST_DAY_FREE_TRIAL, lastDayFreeTrial);
        await Onyx.set(`${ONYXKEYS.COLLECTION.POLICY}${policyID}`, {
            ...createRandomPolicy(Number(policyID), CONST.POLICY.TYPE.TEAM),
            ownerAccountID: 1,
        });
        await waitForBatchedUpdates();

        const {result} = renderHook(() => useTimeSensitiveEarlyDiscount());

        expect(result.current.shouldShowEarlyDiscount).toBe(false);
        expect(result.current.discountInfo?.discountType).toBe(25);
    });

    it('hides the early discount when a billing card is already present', async () => {
        jest.setSystemTime(new Date('2026-04-21T12:00:00.000Z'));

        await Onyx.set(ONYXKEYS.NVP_FIRST_DAY_FREE_TRIAL, firstDayFreeTrial);
        await Onyx.set(ONYXKEYS.NVP_LAST_DAY_FREE_TRIAL, lastDayFreeTrial);
        await Onyx.set(ONYXKEYS.NVP_BILLING_FUND_ID, 12345);
        await Onyx.set(`${ONYXKEYS.COLLECTION.POLICY}${policyID}`, {
            ...createRandomPolicy(Number(policyID), CONST.POLICY.TYPE.TEAM),
            ownerAccountID: 1,
        });
        await waitForBatchedUpdates();

        const {result} = renderHook(() => useTimeSensitiveEarlyDiscount());

        expect(result.current.shouldShowEarlyDiscount).toBe(false);
        expect(result.current.discountInfo).toBeNull();
    });

    it('hides the early discount when the user does not own a paid workspace', async () => {
        jest.setSystemTime(new Date('2026-04-21T12:00:00.000Z'));

        await Onyx.set(ONYXKEYS.NVP_FIRST_DAY_FREE_TRIAL, firstDayFreeTrial);
        await Onyx.set(ONYXKEYS.NVP_LAST_DAY_FREE_TRIAL, lastDayFreeTrial);
        await waitForBatchedUpdates();

        const {result} = renderHook(() => useTimeSensitiveEarlyDiscount());

        expect(result.current.shouldShowEarlyDiscount).toBe(false);
        expect(result.current.discountInfo).toBeNull();
    });

    it('hides the early discount when the user is not on a free trial', async () => {
        jest.setSystemTime(new Date('2026-04-21T12:00:00.000Z'));

        await Onyx.set(ONYXKEYS.NVP_FIRST_DAY_FREE_TRIAL, firstDayFreeTrial);
        await Onyx.set(`${ONYXKEYS.COLLECTION.POLICY}${policyID}`, {
            ...createRandomPolicy(Number(policyID), CONST.POLICY.TYPE.TEAM),
            ownerAccountID: 1,
        });
        await waitForBatchedUpdates();

        const {result} = renderHook(() => useTimeSensitiveEarlyDiscount());

        expect(result.current.shouldShowEarlyDiscount).toBe(false);
        expect(result.current.discountInfo).toBeNull();
    });
});
