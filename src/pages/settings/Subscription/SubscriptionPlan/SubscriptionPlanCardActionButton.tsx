import Button from '@components/Button';
import {useDelegateNoAccessActions, useDelegateNoAccessState} from '@components/DelegateNoAccessModalProvider';
import Icon from '@components/Icon';
import MenuItem from '@components/MenuItem';
import MenuItemContent from '@components/MenuItem/layout/MenuItemContent';
import MenuItemRow from '@components/MenuItem/layout/MenuItemRow';
import MenuItemTrailing from '@components/MenuItem/layout/MenuItemTrailing';
import MenuItemFieldName from '@components/MenuItem/leaves/content/MenuItemFieldName';
import MenuItemFieldValue from '@components/MenuItem/leaves/content/MenuItemFieldValue';
import MenuItemField from '@components/MenuItem/presets/MenuItemField';
import MenuItemSectionRoot from '@components/MenuItem/presets/MenuItemSectionRoot';
import RenderHTML from '@components/RenderHTML';
import Text from '@components/Text';
import TextLink from '@components/TextLink';
import Tooltip from '@components/Tooltip';

import useCurrentUserPersonalDetails from '@hooks/useCurrentUserPersonalDetails';
import useHasTeam2025Pricing from '@hooks/useHasTeam2025Pricing';
import {useMemoizedLazyExpensifyIcons} from '@hooks/useLazyAsset';
import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';
import usePreferredCurrency from '@hooks/usePreferredCurrency';
import usePrivateSubscription from '@hooks/usePrivateSubscription';
import useSubscriptionPossibleCostSavings from '@hooks/useSubscriptionPossibleCostSavings';
import useTheme from '@hooks/useTheme';
import useThemeStyles from '@hooks/useThemeStyles';

import {upgradeToCorporate} from '@libs/actions/Policy/Policy';
import {convertToShortDisplayString} from '@libs/CurrencyUtils';
import createDynamicRoute from '@libs/Navigation/helpers/dynamicRoutesUtils/createDynamicRoute';
import {getOwnedPaidPolicies, isPolicyAdmin} from '@libs/PolicyUtils';
import {isSubscriptionTypeOfInvoicing, shouldUseSimplifiedCollectSubscriptionUI} from '@libs/SubscriptionUtils';

import Navigation from '@navigation/Navigation';

import {formatSubscriptionEndDate, getNewSubscriptionRenewalDate} from '@pages/settings/Subscription/utils';
import ToggleSettingOptionRow from '@pages/workspace/workflows/ToggleSettingsOptionRow';

import variables from '@styles/variables';

import {updateSubscriptionAddNewUsersAutomatically, updateSubscriptionAutoRenew} from '@userActions/Subscription';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import ROUTES, {DYNAMIC_ROUTES} from '@src/ROUTES';

import type {StyleProp, ViewStyle} from 'react-native';

import React, {useMemo} from 'react';
import {Platform, View} from 'react-native';

import type {PersonalPolicyTypeExcludedProps} from './SubscriptionPlanCard';

type SubscriptionPlanCardActionButtonProps = {
    subscriptionPlan: PersonalPolicyTypeExcludedProps | null;

    /** Whether the plan card was rendered inside the comparison modal */
    isFromComparisonModal: boolean;

    isSelected: boolean;
    closeComparisonModal?: () => void;
    style?: StyleProp<ViewStyle>;
};

function SubscriptionPlanCardActionButton({subscriptionPlan, isFromComparisonModal, isSelected, closeComparisonModal, style}: SubscriptionPlanCardActionButtonProps) {
    const styles = useThemeStyles();
    const theme = useTheme();
    const {translate, dateFnsLocale} = useLocalize();
    const {accountID: currentUserAccountID} = useCurrentUserPersonalDetails();
    const {isActingAsDelegate} = useDelegateNoAccessState();
    const {showDelegateNoAccessModal} = useDelegateNoAccessActions();
    const hasTeam2025Pricing = useHasTeam2025Pricing();
    const preferredCurrency = usePreferredCurrency();
    const possibleCostSavings = useSubscriptionPossibleCostSavings();
    const icons = useMemoizedLazyExpensifyIcons(['Info']);
    const [policies] = useOnyx(ONYXKEYS.COLLECTION.POLICY);
    const [account] = useOnyx(ONYXKEYS.ACCOUNT);
    const privateSubscription = usePrivateSubscription();
    const isAnnual = privateSubscription?.type === CONST.SUBSCRIPTION.TYPE.ANNUAL;
    const shouldShowAnnualSettings = isAnnual && !shouldUseSimplifiedCollectSubscriptionUI(subscriptionPlan, hasTeam2025Pricing);
    const ownerPolicies = useMemo(() => getOwnedPaidPolicies(policies, currentUserAccountID), [policies, currentUserAccountID]);

    const [canPerformUpgrade, policy] = useMemo(() => {
        const firstPolicy = ownerPolicies.at(0);
        if (!firstPolicy || ownerPolicies.length > 1) {
            return [false, undefined];
        }
        return [isPolicyAdmin(firstPolicy), firstPolicy];
    }, [ownerPolicies]);

    const handlePlanPress = (planType: PersonalPolicyTypeExcludedProps) => {
        closeComparisonModal?.();

        // If user has no policies, return.
        if (!ownerPolicies.length) {
            return;
        }
        if (
            (planType === CONST.POLICY.TYPE.TEAM && privateSubscription?.type === CONST.SUBSCRIPTION.TYPE.ANNUAL && !account?.canDowngrade) ||
            isSubscriptionTypeOfInvoicing(privateSubscription?.type)
        ) {
            Navigation.navigate(createDynamicRoute(DYNAMIC_ROUTES.SUBSCRIPTION_DOWNGRADE_BLOCKED.path));
            return;
        }

        if (planType === CONST.POLICY.TYPE.TEAM) {
            Navigation.navigate(createDynamicRoute(DYNAMIC_ROUTES.WORKSPACE_DOWNGRADE.getRoute(policy?.id)));
            return;
        }

        if (planType === CONST.POLICY.TYPE.CORPORATE) {
            if (canPerformUpgrade && !!policy?.id) {
                upgradeToCorporate(policy);
                closeComparisonModal?.();
                return;
            }
            Navigation.navigate(ROUTES.WORKSPACE_UPGRADE.getRoute(policy?.id, undefined, Navigation.getActiveRoute()));
        }
    };

    const currentPlanLabel = (
        <View style={style}>
            <View style={[styles.button, styles.buttonContainer, styles.outlinedButton]}>
                <Text style={styles.textLabelSupporting}>{translate('subscription.yourPlan.thisIsYourCurrentPlan')}</Text>
            </View>
        </View>
    );

    if (subscriptionPlan === CONST.POLICY.TYPE.TEAM) {
        if (isFromComparisonModal) {
            if (isSelected) {
                return currentPlanLabel;
            }
            return (
                <Button
                    style={style}
                    onPress={() => handlePlanPress(CONST.POLICY.TYPE.TEAM)}
                >
                    <Button.Text>{translate('subscription.yourPlan.downgrade')}</Button.Text>
                </Button>
            );
        }
    }

    if (subscriptionPlan === CONST.POLICY.TYPE.CORPORATE) {
        if (isFromComparisonModal) {
            if (isSelected) {
                return currentPlanLabel;
            }
            return (
                <Button
                    variant={CONST.BUTTON_VARIANT.SUCCESS}
                    style={style}
                    onPress={() => handlePlanPress(CONST.POLICY.TYPE.CORPORATE)}
                >
                    <Button.Text>{translate('subscription.yourPlan.upgrade')}</Button.Text>
                </Button>
            );
        }
    }

    if (isSubscriptionTypeOfInvoicing(privateSubscription?.type)) {
        return undefined;
    }

    const subscriptionType = shouldShowAnnualSettings ? translate('subscription.subscriptionSettings.annual') : translate('subscription.details.payPerUse');
    const subscriptionSize = translate('subscription.subscriptionSettings.memberCount', privateSubscription?.userCount ?? 0);
    const autoRenewalDate = formatSubscriptionEndDate(privateSubscription?.endDate, dateFnsLocale) || (shouldShowAnnualSettings ? getNewSubscriptionRenewalDate(dateFnsLocale) : '');
    const subscriptionSizeHeadsUp = translate('subscription.details.headsUp');
    const conciseSubscriptionSizeHeadsUp = (subscriptionSizeHeadsUp.startsWith('Heads up: ') ? subscriptionSizeHeadsUp.slice('Heads up: '.length) : subscriptionSizeHeadsUp)
        .split('. ')
        .at(0);

    const handleAutoRenewToggle = () => {
        if (isActingAsDelegate) {
            showDelegateNoAccessModal();
            return;
        }
        if (!privateSubscription?.autoRenew) {
            updateSubscriptionAutoRenew(true);
            return;
        }
        if (account?.hasPurchases) {
            Navigation.navigate(ROUTES.SETTINGS_SUBSCRIPTION_DISABLE_AUTO_RENEW_SURVEY);
            return;
        }
        updateSubscriptionAutoRenew(false);
    };

    const handleAutoIncreaseToggle = () => {
        if (isActingAsDelegate) {
            showDelegateNoAccessModal();
            return;
        }
        updateSubscriptionAddNewUsersAutomatically(!privateSubscription?.addNewUsersAutomatically);
    };

    const renderInfoTooltip =
        !shouldShowAnnualSettings && subscriptionPlan !== CONST.POLICY.TYPE.TEAM ? (
            <Tooltip
                minWidth={280}
                maxWidth={320}
                wrapperStyle={[styles.p2, styles.borderedContentCard, styles.borderRadiusComponentNormal, {backgroundColor: theme.appBG, boxShadow: theme.shadow}]}
                renderTooltipContent={() => (
                    <View>
                        <Text style={[styles.textSmall, styles.textStrong]}>Save with an annual subscription</Text>
                        <View style={[styles.mt1, styles.renderHTML]}>
                            <RenderHTML
                                html={`<muted-text-label>${translate('subscription.subscriptionSettings.pricingConfiguration').replace(/^[^.]+\.\s*/, '')} ${translate('subscription.subscriptionSettings.learnMore', false).replaceAll('<muted-text>', '').replaceAll('</muted-text>', '')}</muted-text-label>`}
                            />
                        </View>
                    </View>
                )}
                renderTooltipContentKey={['subscriptionSettings.learnMore']}
            >
                <View
                    style={styles.ml2}
                    accessibilityLabel={translate('subscription.subscriptionSettings.pricingConfiguration')}
                >
                    <Icon
                        src={icons.Info}
                        fill={theme.icon}
                        width={variables.iconSizeSmall}
                        height={variables.iconSizeSmall}
                    />
                </View>
            </Tooltip>
        ) : null;

    return (
        <View style={[style, styles.mt3]}>
            <MenuItemSectionRoot onPress={() => Navigation.navigate(ROUTES.SETTINGS_SUBSCRIPTION_SETTINGS_DETAILS)}>
                <MenuItemRow>
                    <MenuItemContent>
                        <View style={[styles.flexRow, styles.alignItemsCenter]}>
                            <MenuItemFieldName>{translate('subscription.details.subscriptionType')}</MenuItemFieldName>
                            {renderInfoTooltip}
                        </View>
                        <MenuItemFieldValue>{subscriptionType}</MenuItemFieldValue>
                    </MenuItemContent>
                    <MenuItemTrailing>
                        <MenuItem.Chevron />
                    </MenuItemTrailing>
                </MenuItemRow>
            </MenuItemSectionRoot>
            {shouldShowAnnualSettings && (
                <>
                    <View style={styles.mt3}>
                        <MenuItemSectionRoot onPress={() => Navigation.navigate(ROUTES.SETTINGS_SUBSCRIPTION_SIZE.getRoute(CONST.SUBSCRIPTION_SIZE.PAGE_NAME.SIZE))}>
                            <MenuItemField.Row
                                name={translate('subscription.details.subscriptionSize')}
                                value={subscriptionSize}
                            >
                                <MenuItem.Chevron />
                            </MenuItemField.Row>
                        </MenuItemSectionRoot>
                        {!privateSubscription?.userCount && (
                            <Text style={[styles.mt1, styles.textLabelSupporting, styles.textLineHeightNormal]}>
                                {conciseSubscriptionSizeHeadsUp} <TextLink href={CONST.PRICING}>{translate('common.learnMore')}</TextLink>
                            </Text>
                        )}
                    </View>
                    {Platform.OS === 'web' ? (
                        <>
                            <View style={[styles.mt3, styles.mb2]}>
                                <ToggleSettingOptionRow
                                    title={translate('subscription.subscriptionSettings.autoRenew')}
                                    switchAccessibilityLabel={translate('subscription.subscriptionSettings.autoRenew')}
                                    onToggle={handleAutoRenewToggle}
                                    isActive={privateSubscription?.autoRenew ?? true}
                                />
                                {!!autoRenewalDate && (
                                    <Text style={[styles.textLabelSupporting, styles.mt1]}>{translate('subscription.subscriptionSettings.renewsOn', autoRenewalDate)}</Text>
                                )}
                            </View>
                            <View style={styles.mt3}>
                                <ToggleSettingOptionRow
                                    customTitle={
                                        <Text>
                                            <Text>{translate('subscription.subscriptionSettings.autoIncrease')}</Text>
                                        </Text>
                                    }
                                    switchAccessibilityLabel={translate('subscription.subscriptionSettings.autoIncrease')}
                                    onToggle={handleAutoIncreaseToggle}
                                    isActive={privateSubscription?.addNewUsersAutomatically ?? false}
                                />
                                <View style={styles.mt2}>
                                    <Text style={styles.textLabelSupporting}>
                                        <Text style={{color: theme.success}}>
                                            {translate('subscription.subscriptionSettings.saveUpTo', convertToShortDisplayString(possibleCostSavings, preferredCurrency))}
                                        </Text>
                                    </Text>
                                    <Text style={styles.textLabelSupporting}>{translate('subscription.subscriptionSettings.automaticallyIncrease')}</Text>
                                </View>
                            </View>
                        </>
                    ) : (
                        <>
                            <MenuItemSectionRoot>
                                <MenuItemField.Row
                                    name={translate('subscription.subscriptionSettings.autoRenew')}
                                    value={privateSubscription?.autoRenew ? translate('subscription.subscriptionSettings.on') : translate('subscription.subscriptionSettings.off')}
                                />
                            </MenuItemSectionRoot>
                            <MenuItemSectionRoot>
                                <MenuItemField.Row
                                    name={translate('subscription.subscriptionSettings.autoIncrease')}
                                    value={
                                        privateSubscription?.addNewUsersAutomatically ? translate('subscription.subscriptionSettings.on') : translate('subscription.subscriptionSettings.off')
                                    }
                                />
                            </MenuItemSectionRoot>
                        </>
                    )}
                </>
            )}
        </View>
    );
}

export default SubscriptionPlanCardActionButton;
