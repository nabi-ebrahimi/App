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

    return (
        <OnboardingStickyHeaderProvider>
            <View
                onClick={(e) => e.stopPropagation()}
                style={[styles.maxHeight100Percentage, styles.overflowHidden, styles.OnboardingNavigatorInnerView(onboardingIsMediumOrLargerScreenWidth)]}
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
