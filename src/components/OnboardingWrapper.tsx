import useThemeStyles from '@hooks/useThemeStyles';

import {useOnboardingStickyHeaderContainerElements} from '@libs/Navigation/AppNavigator/Navigators/OnboardingModalNavigatorContentWrapper/OnboardingStickyHeader';

import React, {useState} from 'react';
import {View} from 'react-native';

import FocusTrapContainerElement from './FocusTrap/FocusTrapContainerElement';
import FocusTrapForScreens from './FocusTrap/FocusTrapForScreen';

type OnboardingWrapperProps = {
    children: React.ReactNode;
};

function OnboardingWrapper({children}: OnboardingWrapperProps) {
    const styles = useThemeStyles();
    // The sticky Back caret renders outside this screen's card. To keep it in the keyboard Tab order on web we add it
    // to the focus trap's `containerElements`. But `containerElements` REPLACES the trap scope (it does not extend the
    // default child container), so we must also include the onboarding content itself — otherwise Tab would be confined
    // to just the Back caret and the form/inputs/Continue would become unreachable.
    const stickyHeaderElements = useOnboardingStickyHeaderContainerElements();
    const [contentElement, setContentElement] = useState<HTMLElement | null>(null);

    // Only take over the trap scope once both nodes exist (web). Otherwise fall back to the default child-as-container
    // behavior — which is also what happens on native, where FocusTrapContainerElement is a no-op and both are null.
    // Header first so the Back caret keeps its place at the start of the Tab order (as on main, where it rendered
    // before the form). The onboarding content follows.
    const focusTrapSettings = stickyHeaderElements && contentElement ? {containerElements: [...stickyHeaderElements, contentElement]} : undefined;

    return (
        <FocusTrapForScreens focusTrapSettings={focusTrapSettings}>
            <View style={styles.h100}>
                <FocusTrapContainerElement
                    onContainerElementChanged={setContentElement}
                    style={styles.h100}
                >
                    {children}
                </FocusTrapContainerElement>
            </View>
        </FocusTrapForScreens>
    );
}

export default OnboardingWrapper;
