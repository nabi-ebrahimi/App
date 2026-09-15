import {useMemoizedLazyExpensifyIcons} from '@hooks/useLazyAsset';
import useLocalize from '@hooks/useLocalize';
import useTheme from '@hooks/useTheme';
import useThemeStyles from '@hooks/useThemeStyles';

import variables from '@styles/variables';

import CONST from '@src/CONST';

import React from 'react';
import {View} from 'react-native';

import Icon from './Icon';
import {PressableWithoutFeedback} from './Pressable';
import Text from './Text';

type CaretBackHeaderProps = {
    /** Handler invoked when the back caret is pressed */
    onBackButtonPress?: () => void;

    /** Whether to render the back caret. When false, only the fixed-height strip is rendered so layout stays stable. */
    shouldShowBackButton?: boolean;

    /** Optional label shown next to the caret (defaults to the translated "Back"). */
    label?: string;

    /** Sentry label for the pressable. */
    sentryLabel?: string;
};

/**
 * Reusable popover-style back link: caret + "Back" label.
 * Matches the submenu back row used by PopoverMenu. Not tied to onboarding — can be dropped into any modal flow.
 */
function CaretBackHeader({onBackButtonPress, shouldShowBackButton = true, label, sentryLabel = 'CaretBackHeader-Back'}: CaretBackHeaderProps) {
    const styles = useThemeStyles();
    const {translate} = useLocalize();
    const theme = useTheme();
    const icons = useMemoizedLazyExpensifyIcons(['BackArrow']);
    const backLabel = label ?? translate('common.back');

    return (
        <View style={[styles.onboardingHeaderContainer]}>
            {shouldShowBackButton ? (
                <PressableWithoutFeedback
                    onPress={onBackButtonPress}
                    style={[styles.flexRow, styles.alignItemsCenter, styles.gap3]}
                    role={CONST.ROLE.BUTTON}
                    accessibilityLabel={backLabel}
                    sentryLabel={sentryLabel}
                >
                    <Icon
                        src={icons.BackArrow}
                        fill={theme.icon}
                        width={variables.iconSizeNormal}
                        height={variables.iconSizeNormal}
                    />
                    <Text style={styles.createMenuHeaderText}>{backLabel}</Text>
                </PressableWithoutFeedback>
            ) : null}
        </View>
    );
}

CaretBackHeader.displayName = 'CaretBackHeader';

export default CaretBackHeader;
