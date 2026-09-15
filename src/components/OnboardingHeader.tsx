import useThemeStyles from '@hooks/useThemeStyles';

import {useOnboardingStickyHeader} from '@libs/Navigation/AppNavigator/Navigators/OnboardingModalNavigatorContentWrapper/OnboardingStickyHeader';

import React from 'react';
import {View} from 'react-native';

type OnboardingHeaderProps = {
    onBackButtonPress?: () => void;

    shouldShowBackButton?: boolean;

    /** Mirrors this screen's ScreenWrapper `shouldEnableMaxHeight` so the sticky caret tracks the card on mobile Safari. */
    shouldEnableMaxHeight?: boolean;

    /** Accounting only: collapse the caret with its title when the landscape keyboard opens. */
    shouldCollapseOnKeyboard?: boolean;
};

/**
 * Reserves the back-caret strip inside each onboarding card and registers the caret's config with the sticky
 * header rendered once above the Stack.Navigator (see OnboardingStickyHeader). The visible caret is drawn by the
 * sticky overlay so it never animates with the card, while this fixed-height strip keeps the card layout unchanged.
 */
function OnboardingHeader({onBackButtonPress, shouldShowBackButton = true, shouldEnableMaxHeight = false, shouldCollapseOnKeyboard = false}: OnboardingHeaderProps) {
    const styles = useThemeStyles();

    useOnboardingStickyHeader({shouldShowBackButton, onBackButtonPress, shouldEnableMaxHeight, shouldCollapseOnKeyboard});

    return <View style={[styles.onboardingHeaderContainer]} />;
}

export default OnboardingHeader;
