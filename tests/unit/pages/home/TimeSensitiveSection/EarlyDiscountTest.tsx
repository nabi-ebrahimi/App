import {render, screen} from '@testing-library/react-native';
import OnyxListItemProvider from '@src/components/OnyxListItemProvider';
import TimeSensitiveSection from '@src/pages/home/TimeSensitiveSection';
import useTimeSensitiveAddPaymentCard from '@src/pages/home/TimeSensitiveSection/hooks/useTimeSensitiveAddPaymentCard';
import useTimeSensitiveEarlyDiscount from '@src/pages/home/TimeSensitiveSection/hooks/useTimeSensitiveEarlyDiscount';

jest.mock('@libs/Navigation/Navigation');

jest.mock('@libs/DateUtils', () => ({
    formatCountdownTimer: jest.fn(() => '23h 59m 59sec'),
}));

jest.mock('@hooks/useLocalize', () =>
    jest.fn(() => ({
        translate: (key: string, params?: Record<string, string>) => {
            switch (key) {
                case 'homePage.timeSensitiveSection.title':
                    return 'Time sensitive';
                case 'homePage.freeTrialSection.offer50Body':
                    return 'Get 50% off your first year!';
                case 'homePage.freeTrialSection.timeRemaining':
                    return `Time remaining: ${params?.formattedTime}`;
                case 'subscription.billingBanner.earlyDiscount.claimOffer':
                    return 'Claim offer';
                case 'homePage.timeSensitiveSection.addPaymentCard.title':
                    return 'Add a payment card';
                case 'homePage.timeSensitiveSection.addPaymentCard.subtitle':
                    return 'Add your payment card to keep your workspace active.';
                case 'homePage.timeSensitiveSection.addPaymentCard.cta':
                    return 'Add card';
                default:
                    return key;
            }
        },
    })),
);

jest.mock('@hooks/useLazyAsset', () => ({
    useMemoizedLazyExpensifyIcons: jest.fn(() => ({
        CreditCard: () => null,
        Stopwatch: () => null,
    })),
}));

jest.mock('@src/pages/home/TimeSensitiveSection/hooks/useTimeSensitiveAddPaymentCard', () =>
    jest.fn(() => ({
        shouldShowAddPaymentCard: false,
    })),
);

jest.mock('@src/pages/home/TimeSensitiveSection/hooks/useTimeSensitiveBilling', () =>
    jest.fn(() => ({
        shouldShowFixFailedBilling: false,
    })),
);

jest.mock('@src/pages/home/TimeSensitiveSection/hooks/useTimeSensitiveEarlyDiscount', () =>
    jest.fn(() => ({
        shouldShowEarlyDiscount: false,
        discountInfo: null,
    })),
);

jest.mock('@src/pages/home/TimeSensitiveSection/hooks/useTimeSensitiveCards', () =>
    jest.fn(() => ({
        shouldShowAddShippingAddress: false,
        shouldShowActivateCard: false,
        shouldShowReviewCardFraud: false,
        cardsNeedingShippingAddress: [],
        cardsNeedingActivation: [],
        cardsWithFraud: [],
    })),
);

jest.mock('@hooks/useCardFeedErrors', () =>
    jest.fn(() => ({
        cardsWithBrokenFeedConnection: {},
        personalCardsWithBrokenConnection: {},
    })),
);

jest.mock('@hooks/useCurrentUserPersonalDetails', () => jest.fn(() => ({login: 'test@example.com'})));

jest.mock('@hooks/useResponsiveLayout', () => jest.fn(() => ({shouldUseNarrowLayout: false})));

const mockedUseTimeSensitiveAddPaymentCard = jest.mocked(useTimeSensitiveAddPaymentCard);
const mockedUseTimeSensitiveEarlyDiscount = jest.mocked(useTimeSensitiveEarlyDiscount);

const renderTimeSensitiveSection = () =>
    render(
        <OnyxListItemProvider>
            <TimeSensitiveSection />
        </OnyxListItemProvider>,
    );

describe('TimeSensitiveSection - EarlyDiscount', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockedUseTimeSensitiveAddPaymentCard.mockReturnValue({
            shouldShowAddPaymentCard: false,
        });
        mockedUseTimeSensitiveEarlyDiscount.mockReturnValue({
            shouldShowEarlyDiscount: false,
            discountInfo: null,
        });
    });

    it('renders the 50% row with the claim CTA and live countdown copy', () => {
        mockedUseTimeSensitiveEarlyDiscount.mockReturnValue({
            shouldShowEarlyDiscount: true,
            discountInfo: {discountType: 50, days: 0, hours: 23, minutes: 59, seconds: 59},
        });

        renderTimeSensitiveSection();

        expect(screen.getByText('Time sensitive')).toBeTruthy();
        expect(screen.getByText('Get 50% off your first year!')).toBeTruthy();
        expect(screen.getByText('Time remaining: 23h 59m 59sec')).toBeTruthy();
        expect(screen.getByText('Claim offer')).toBeTruthy();
    });

    it('falls back to AddPaymentCard once the 50% row is no longer active', () => {
        mockedUseTimeSensitiveAddPaymentCard.mockReturnValue({
            shouldShowAddPaymentCard: true,
        });
        mockedUseTimeSensitiveEarlyDiscount.mockReturnValue({
            shouldShowEarlyDiscount: false,
            discountInfo: {discountType: 25, days: 6, hours: 23, minutes: 59, seconds: 59},
        });

        renderTimeSensitiveSection();

        expect(screen.getByText('Add a payment card')).toBeTruthy();
        expect(screen.queryByText('Get 50% off your first year!')).toBeNull();
    });
});
