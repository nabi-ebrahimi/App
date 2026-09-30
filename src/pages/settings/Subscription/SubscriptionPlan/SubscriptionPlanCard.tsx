import ActivityIndicator from '@components/ActivityIndicator';
import Badge from '@components/Badge';
import {useDelegateNoAccessActions, useDelegateNoAccessState} from '@components/DelegateNoAccessModalProvider';
import Icon from '@components/Icon';
import RadioButton from '@components/RadioButton';
import Text from '@components/Text';
import ThreeDotsMenu from '@components/ThreeDotsMenu';

import useCurrentUserPersonalDetails from '@hooks/useCurrentUserPersonalDetails';
import useHasTeam2025Pricing from '@hooks/useHasTeam2025Pricing';
import {useMemoizedLazyExpensifyIcons, useMemoizedLazyIllustrations} from '@hooks/useLazyAsset';
import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';
import usePreferredCurrency from '@hooks/usePreferredCurrency';
import usePrivateSubscription from '@hooks/usePrivateSubscription';
import useResponsiveLayout from '@hooks/useResponsiveLayout';
import useSubscriptionPlan from '@hooks/useSubscriptionPlan';
import useTheme from '@hooks/useTheme';
import useThemeStyles from '@hooks/useThemeStyles';

import {getSubscriptionPlanInfo, isSubscriptionTypeOfInvoicing} from '@libs/SubscriptionUtils';

import Navigation from '@navigation/Navigation';

import {getPrivatePromoDiscountInfo} from '@pages/settings/Subscription/utils';

import variables from '@styles/variables';

import {navigateToConciergeChat} from '@userActions/Report';
import {requestTaxExempt} from '@userActions/Subscription';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import ROUTES from '@src/ROUTES';

import type {ValueOf} from 'type-fest';

import {hasSeenTourSelector} from '@selectors/Onboarding';
import React from 'react';
import {View} from 'react-native';

import getSubscriptionPlanBenefitA11yProps from './getSubscriptionPlanBenefitA11yProps';
import SubscriptionPlanCardActionButton from './SubscriptionPlanCardActionButton';

type PersonalPolicyTypeExcludedProps = Exclude<ValueOf<typeof CONST.POLICY.TYPE>, 'personal'>;

type SubscriptionPlanCardProps = {
    subscriptionPlan: PersonalPolicyTypeExcludedProps | null;

    saveWithExpensifyContent?: React.ReactNode;

    /** Whether the plan card was rendered inside the comparison modal */
    isFromComparisonModal?: boolean;

    closeComparisonModal?: () => void;
};

function SubscriptionPlanCard({subscriptionPlan, saveWithExpensifyContent, isFromComparisonModal = false, closeComparisonModal}: SubscriptionPlanCardProps) {
    const styles = useThemeStyles();
    const theme = useTheme();
    const {translate} = useLocalize();
    const {shouldUseNarrowLayout} = useResponsiveLayout();
    const {accountID: currentUserAccountID} = useCurrentUserPersonalDetails();
    const {isActingAsDelegate} = useDelegateNoAccessState();
    const {showDelegateNoAccessModal} = useDelegateNoAccessActions();
    const currentSubscriptionPlan = useSubscriptionPlan();
    const privateSubscription = usePrivateSubscription();
    const [privatePromoCode] = useOnyx(ONYXKEYS.NVP_PRIVATE_PROMO_CODE);
    const [privatePromoDiscount] = useOnyx(ONYXKEYS.NVP_PRIVATE_PROMO_DISCOUNT);
    const [privateTaxExempt] = useOnyx(ONYXKEYS.NVP_PRIVATE_TAX_EXEMPT);
    const [conciergeReportID] = useOnyx(ONYXKEYS.CONCIERGE_REPORT_ID);
    const [introSelected] = useOnyx(ONYXKEYS.NVP_INTRO_SELECTED);
    const [isSelfTourViewed] = useOnyx(ONYXKEYS.NVP_ONBOARDING, {selector: hasSeenTourSelector});
    const preferredCurrency = usePreferredCurrency();
    const hasTeam2025Pricing = useHasTeam2025Pricing();
    const lazyIllustrations = useMemoizedLazyIllustrations(['Mailbox', 'ShieldYellow']);
    const icons = useMemoizedLazyExpensifyIcons(['Checkmark']);
    const menuIcons = useMemoizedLazyExpensifyIcons(['CreditCard', 'MoneyCircle']);
    const isAnnual = privateSubscription?.type === CONST.SUBSCRIPTION.TYPE.ANNUAL;
    const {isSecretPromoCode} = getPrivatePromoDiscountInfo(privatePromoDiscount, isAnnual);
    const {title, src, description, benefits, note, subtitle} = getSubscriptionPlanInfo(
        translate,
        subscriptionPlan,
        privateSubscription?.type,
        preferredCurrency,
        isFromComparisonModal,
        hasTeam2025Pricing,
        lazyIllustrations,
    );
    const isSelected = isFromComparisonModal && subscriptionPlan === currentSubscriptionPlan;
    const benefitsColumns = shouldUseNarrowLayout || isFromComparisonModal ? 1 : 2;
    const comparisonCardPadding = shouldUseNarrowLayout ? styles.p5 : [styles.p8, styles.pb6];
    const planCardHeaderStyle = isFromComparisonModal ? comparisonCardPadding : styles.pb2;
    const comparisonActionButtonPadding = shouldUseNarrowLayout ? styles.ph5 : styles.ph8;

    const handleExpensifyCodePress = () => {
        if (isActingAsDelegate) {
            showDelegateNoAccessModal();
            return;
        }
        Navigation.navigate(ROUTES.SETTINGS_SUBSCRIPTION_EXPENSIFY_CODE);
    };

    const handleTaxExemptPress = () => {
        if (isActingAsDelegate) {
            showDelegateNoAccessModal();
            return;
        }
        requestTaxExempt();
        navigateToConciergeChat({conciergeReportID, introSelected, currentUserAccountID, isSelfTourViewed, shouldDismissModal: false});
    };

    const planMenuItems = [
        {
            icon: menuIcons.CreditCard,
            text: translate('subscription.expensifyCode.title'),
            onSelected: handleExpensifyCodePress,
        },
        {
            icon: menuIcons.MoneyCircle,
            text: translate('subscription.details.taxExempt'),
            onSelected: handleTaxExemptPress,
        },
    ];

    const renderBenefits = () => {
        return (
            <View
                role={CONST.ROLE.LIST}
                style={[styles.flexRow, styles.flexWrap]}
            >
                {benefits.map((item, index) => {
                    const {accessible, accessibilityLabel} = getSubscriptionPlanBenefitA11yProps({benefitText: item, index, totalBenefits: benefits.length, ofLabel: translate('common.of')});
                    return (
                        <View
                            key={item}
                            style={[styles.flexRow, styles.alignItemsCenter, shouldUseNarrowLayout ? styles.mt3 : styles.mt4, {width: `${100 / benefitsColumns}%`}]}
                            role={CONST.ROLE.LISTITEM}
                            accessible={accessible}
                            accessibilityLabel={accessibilityLabel}
                        >
                            <View
                                aria-hidden
                                importantForAccessibility="no-hide-descendants"
                            >
                                <Icon
                                    src={icons.Checkmark}
                                    fill={theme.iconSuccessFill}
                                    width={variables.iconSizeSmall}
                                    height={variables.iconSizeSmall}
                                />
                            </View>
                            <Text style={[styles.textLabelSupporting, styles.ml2]}>{item}</Text>
                        </View>
                    );
                })}
            </View>
        );
    };

    const shouldHideSubscriptionSettingsButton =
        isSubscriptionTypeOfInvoicing(privateSubscription?.type) &&
        !isFromComparisonModal &&
        ((subscriptionPlan === CONST.POLICY.TYPE.TEAM && !hasTeam2025Pricing) || subscriptionPlan !== CONST.POLICY.TYPE.TEAM);

    const subscriptionPlanCardActionButtonWrapStyles = (() => {
        if (shouldHideSubscriptionSettingsButton) {
            return shouldUseNarrowLayout ? [] : styles.pb2;
        }
        if (shouldUseNarrowLayout) {
            return styles.pb5;
        }

        return styles.pb8;
    })();

    return (
        <View
            style={[
                isFromComparisonModal && styles.borderedContentCard,
                isFromComparisonModal && styles.borderRadiusComponentLarge,
                styles.mt5,
                isFromComparisonModal && styles.flex1,
                isSelected && styles.borderColorFocus,
                isFromComparisonModal && styles.justifyContentBetween,
            ]}
        >
            {!privateSubscription ? (
                <View style={shouldUseNarrowLayout ? styles.p5 : [styles.p8, styles.pb6]}>
                    <ActivityIndicator />
                </View>
            ) : (
                <>
                    <View style={planCardHeaderStyle}>
                        <View style={[styles.flexRow, styles.justifyContentBetween, styles.alignItemsStart]}>
                            <View style={[styles.flexColumn, styles.flex1]}>
                                <Text style={styles.textLabelSupporting}>{translate('subscription.details.plan')}</Text>
                                <View style={[styles.flexRow, styles.alignItemsCenter]}>
                                    <Text
                                        style={[styles.headerText, styles.textHeadlineH2]}
                                        accessibilityRole={CONST.ROLE.HEADER}
                                    >
                                        {title}
                                    </Text>
                                    <Icon
                                        src={src}
                                        width={variables.iconHeader}
                                        height={variables.iconHeader}
                                        additionalStyles={styles.ml2}
                                    />
                                </View>
                                {!isFromComparisonModal && (
                                    <View style={[styles.flexRow, styles.flexWrap, styles.mt2]}>
                                        {!isSecretPromoCode && !!privatePromoCode && (
                                            <Badge
                                                text={translate('subscription.expensifyCode.title')}
                                                isCondensed
                                            />
                                        )}
                                        {!!privateTaxExempt && (
                                            <Badge
                                                text={translate('subscription.details.taxExemptEnabled')}
                                                isCondensed
                                            />
                                        )}
                                    </View>
                                )}
                            </View>
                            {isFromComparisonModal ? (
                                <View pointerEvents="none">
                                    <RadioButton
                                        isChecked={isSelected}
                                        onPress={() => {}}
                                        accessibilityLabel=""
                                        accessible={false}
                                    />
                                </View>
                            ) : (
                                <ThreeDotsMenu
                                    menuItems={planMenuItems}
                                    anchorAlignment={{
                                        horizontal: CONST.MODAL.ANCHOR_ORIGIN_HORIZONTAL.RIGHT,
                                        vertical: CONST.MODAL.ANCHOR_ORIGIN_VERTICAL.TOP,
                                    }}
                                    shouldSelfPosition
                                />
                            )}
                        </View>
                        {isFromComparisonModal && (
                            <>
                                <Text style={styles.labelStrong}>{subtitle}</Text>
                                <Text style={[styles.textLabelSupporting, styles.textSmall]}>{note}</Text>
                                <Text style={[styles.textLabelSupporting, styles.textNormal, styles.mt3, styles.mb1]}>{description}</Text>
                                {renderBenefits()}
                            </>
                        )}
                    </View>
                    <View style={subscriptionPlanCardActionButtonWrapStyles}>
                        <SubscriptionPlanCardActionButton
                            subscriptionPlan={subscriptionPlan}
                            isFromComparisonModal={isFromComparisonModal}
                            isSelected={isSelected}
                            style={isFromComparisonModal ? comparisonActionButtonPadding : undefined}
                            closeComparisonModal={closeComparisonModal}
                        />
                    </View>
                    {saveWithExpensifyContent}
                </>
            )}
        </View>
    );
}

export default SubscriptionPlanCard;
export type {PersonalPolicyTypeExcludedProps};
