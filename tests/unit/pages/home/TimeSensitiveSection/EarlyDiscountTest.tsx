import {render, screen} from '@testing-library/react-native';
import React from 'react';
import DateUtils from '@libs/DateUtils';
import OnyxListItemProvider from '@src/components/OnyxListItemProvider';
import TimeSensitiveSection from '@src/pages/home/TimeSensitiveSection';
import useTimeSensitiveAddPaymentCard from '@src/pages/home/TimeSensitiveSection/hooks/useTimeSensitiveAddPaymentCard';
import useTimeSensitiveEarlyDiscount from '@src/pages/home/TimeSensitiveSection/hooks/useTimeSensitiveEarlyDiscount';

jest.mock('@libs/Navigation/Navigation');
jest.mock('@libs/DateUtils', () => ({
    formatCountdownTimer: jest.fn(() => '12h : 34m : 56s'),
}));

jest.mock('@hooks/useLocalize', () =>
    jest.fn(() => ({
        translate: (key: string, params?: Record<string, number | string>) => {
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
                    return 'Add a payment card to keep using Expensify';
                default:
                    return key;
            }
        },
    })),
);

jest.mock('@hooks/useLazyAsset', () => ({
    useMemoizedLazyExpensifyIcons: jest.fn(() => ({
        Stopwatch: () => null,
        CreditCard: () => null,
    })),
}));

jest.mock('@src/pages/home/TimeSensitiveSection/hooks/useTimeSensitiveAddPaymentCard', () =>
    jest.fn(() => ({
        shouldShowAddPaymentCard: false,
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

jest.mock('@src/pages/home/TimeSensitiveSection/hooks/useTimeSensitiveBilling', () =>
    jest.fn(() => ({
        shouldShowFixFailedBilling: false,
    })),
);

jest.mock('@src/pages/home/TimeSensitiveSection/hooks/useTimeSensitiveEarlyDiscount', () =>
    jest.fn(() => ({
        discountInfo: null,
        shouldShowEarlyDiscount: false,
    })),
);

jest.mock('@hooks/useCardFeedErrors', () =>
    jest.fn(() => ({
        cardsWithBrokenFeedConnection: {},
        personalCardsWithBrokenConnection: {},
    })),
);

jest.mock('@hooks/useCurrentUserPersonalDetails', () => jest.fn(() => ({login: 'test@example.com'})));
jest.mock('@hooks/useIsAnonymousUser', () => jest.fn(() => false));
jest.mock('@hooks/useResponsiveLayout', () => jest.fn(() => ({shouldUseNarrowLayout: false})));
jest.mock('@selectors/Account', () => ({
    isUserValidatedSelector: jest.fn(() => true),
}));
jest.mock('@selectors/Policy', () => ({
    activeAdminPoliciesSelector: jest.fn(() => []),
}));
jest.mock('@selectors/Session', () => ({
    emailSelector: jest.fn(() => 'test@example.com'),
}));

const mockedUseTimeSensitiveAddPaymentCard = jest.mocked(useTimeSensitiveAddPaymentCard);
const mockedUseTimeSensitiveEarlyDiscount = jest.mocked(useTimeSensitiveEarlyDiscount);
const mockedFormatCountdownTimer = jest.mocked(DateUtils.formatCountdownTimer);

const renderTimeSensitiveSection = () =>
    render(
        <OnyxListItemProvider>
            <TimeSensitiveSection />
        </OnyxListItemProvider>,
    );

describe('TimeSensitiveSection - EarlyDiscount', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockedFormatCountdownTimer.mockReturnValue('12h : 34m : 56s');
        mockedUseTimeSensitiveAddPaymentCard.mockReturnValue({
            shouldShowAddPaymentCard: false,
        });
        mockedUseTimeSensitiveEarlyDiscount.mockReturnValue({
            shouldShowEarlyDiscount: false,
            discountInfo: null,
        });
    });

    it('renders the early discount row with the countdown and claim CTA', () => {
        mockedUseTimeSensitiveEarlyDiscount.mockReturnValue({
            shouldShowEarlyDiscount: true,
            discountInfo: {discountType: 50, days: 0, hours: 12, minutes: 34, seconds: 56},
        });

        renderTimeSensitiveSection();

        expect(screen.getByText('Time sensitive')).toBeTruthy();
        expect(screen.getByText('Get 50% off your first year!')).toBeTruthy();
        expect(screen.getByText('Time remaining: 12h : 34m : 56s')).toBeTruthy();
        expect(screen.getByText('Claim offer')).toBeTruthy();
    });

    it('falls back to AddPaymentCard after the early discount window ends', () => {
        mockedUseTimeSensitiveAddPaymentCard.mockReturnValue({
            shouldShowAddPaymentCard: true,
        });

        renderTimeSensitiveSection();

        expect(screen.getByText('Time sensitive')).toBeTruthy();
        expect(screen.getByText('Add a payment card to keep using Expensify')).toBeTruthy();
        expect(screen.queryByText('Get 50% off your first year!')).toBeNull();
    });
});
