import React from 'react';
import {View} from 'react-native';
import Button from '@components/Button';
import Icon from '@components/Icon';
import {PressableWithoutFeedback} from '@components/Pressable';
import Text from '@components/Text';
import {useMemoizedLazyExpensifyIcons} from '@hooks/useLazyAsset';
import useLocalize from '@hooks/useLocalize';
import useResponsiveLayout from '@hooks/useResponsiveLayout';
import useTheme from '@hooks/useTheme';
import useThemeStyles from '@hooks/useThemeStyles';
import DateUtils from '@libs/DateUtils';
import type {DiscountInfo} from '@libs/SubscriptionUtils';
import navigateToSubscriptionPayment from '@pages/home/common/navigateToSubscriptionPayment';
import variables from '@styles/variables';
import CONST from '@src/CONST';

const ICON_SIZE = variables.iconSizeNormal;

type EarlyDiscountProps = {
    discountInfo: DiscountInfo;
};

function EarlyDiscount({discountInfo}: EarlyDiscountProps) {
    const {translate} = useLocalize();
    const theme = useTheme();
    const styles = useThemeStyles();
    const {shouldUseNarrowLayout} = useResponsiveLayout();
    const icons = useMemoizedLazyExpensifyIcons(['Stopwatch']);

    const title = translate('homePage.freeTrialSection.offer50Body');
    const supportingText = translate('homePage.freeTrialSection.timeRemaining', {
        formattedTime: DateUtils.formatCountdownTimer(translate, discountInfo.hours, discountInfo.minutes, discountInfo.seconds),
    });

    return (
        <PressableWithoutFeedback
            accessibilityLabel={title}
            onPress={navigateToSubscriptionPayment}
            role={CONST.ROLE.BUTTON}
            sentryLabel={CONST.SENTRY_LABEL.HOME_PAGE.WIDGET_ITEM}
        >
            {({hovered}) => (
                <View style={[styles.flexRow, styles.alignItemsCenter, styles.gap3, styles.pv3, shouldUseNarrowLayout ? styles.ph5 : styles.ph8, hovered && styles.hoveredComponentBG]}>
                    <View style={styles.getWidgetItemIconContainerStyle(theme.widgetIconBG)}>
                        <Icon
                            src={icons.Stopwatch}
                            width={ICON_SIZE}
                            height={ICON_SIZE}
                            fill={theme.widgetIconFill}
                        />
                    </View>
                    <View style={[styles.flex1, styles.flexColumn, styles.justifyContentCenter]}>
                        <Text style={styles.widgetItemTitle}>{title}</Text>
                        <Text style={styles.widgetItemSubtitle}>{supportingText}</Text>
                    </View>
                    <Button
                        text={translate('subscription.billingBanner.earlyDiscount.claimOffer')}
                        onPress={navigateToSubscriptionPayment}
                        small
                        style={styles.widgetItemButton}
                        success
                    />
                </View>
            )}
        </PressableWithoutFeedback>
    );
}

export default EarlyDiscount;
