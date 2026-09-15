import useSafeAreaInsets from '@hooks/useSafeAreaInsets';
import useStyleUtils from '@hooks/useStyleUtils';
import useThemeStyles from '@hooks/useThemeStyles';

import React from 'react';
import {View} from 'react-native';

import {OnboardingStickyHeaderOverlay, OnboardingStickyHeaderProvider} from './OnboardingStickyHeader';

type OnboardingModalNavigatorContentWrapperProps = {
    children: React.ReactNode;
    onboardingIsMediumOrLargerScreenWidth: boolean;
};

function OnboardingModalNavigatorContentWrapper({children, onboardingIsMediumOrLargerScreenWidth}: OnboardingModalNavigatorContentWrapperProps) {
    const styles = useThemeStyles();
    const StyleUtils = useStyleUtils();
    const insets = useSafeAreaInsets();
    const {paddingLeft, paddingRight} = StyleUtils.getPlatformSafeAreaPadding(insets);

    // Add padding left and right to the style to account for the safe area insets
    return (
        <OnboardingStickyHeaderProvider>
            <View
                onClick={(e) => e.stopPropagation()}
                style={[styles.maxHeight100Percentage, styles.overflowHidden, styles.OnboardingNavigatorInnerView(onboardingIsMediumOrLargerScreenWidth), {paddingLeft, paddingRight}]}
            >
                {children}
                {/* Sticky back-caret rendered once as an overlay on top of the Stack.Navigator so it stays put across
                    screen transitions. It is absolutely positioned and consumes no layout height, so every onboarding
                    card keeps the exact same geometry (surface paint, safe-area inset, KeyboardAvoidingView) as before. */}
                <OnboardingStickyHeaderOverlay />
            </View>
        </OnboardingStickyHeaderProvider>
    );
}

export default OnboardingModalNavigatorContentWrapper;
