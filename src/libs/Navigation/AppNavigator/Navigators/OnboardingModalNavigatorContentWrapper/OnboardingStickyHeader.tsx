import CaretBackHeader from '@components/CaretBackHeader';
import CollapsibleHeaderOnKeyboard from '@components/CollapsibleHeaderOnKeyboard';
import FocusTrapContainerElement from '@components/FocusTrap/FocusTrapContainerElement';

import useSafeAreaInsets from '@hooks/useSafeAreaInsets';
import useStyleUtils from '@hooks/useStyleUtils';
import useThemeStyles from '@hooks/useThemeStyles';
import useViewportOffsetTop from '@hooks/useViewportOffsetTop';

import Navigation from '@libs/Navigation/Navigation';

import {useFocusEffect} from '@react-navigation/native';
import React, {createContext, useCallback, useContext, useEffect, useRef, useState} from 'react';
import {View} from 'react-native';

type OnboardingStickyHeaderConfig = {
    /** Whether the sticky caret is shown for the currently focused onboarding screen */
    shouldShowBackButton: boolean;

    /** Back handler for the focused screen. Falls back to Navigation.goBack() when omitted. */
    onBackButtonPress?: () => void;

    /**
     * Mirrors the focused screen's ScreenWrapper `shouldEnableMaxHeight`. On mobile Safari the card is shifted
     * down by the visual-viewport offset only when this is set, so the floating caret must mirror the exact same
     * conditional shift to stay glued to the in-card slot. Off on every other platform (offset is always 0).
     */
    shouldEnableMaxHeight?: boolean;

    /** Accounting only: collapse the caret together with its title when the landscape keyboard opens. */
    shouldCollapseOnKeyboard?: boolean;
};

type SetOnboardingStickyHeaderConfig = React.Dispatch<React.SetStateAction<OnboardingStickyHeaderConfig>>;

// The first onboarding screen never shows a back button, so seed the default hidden to avoid a caret flash before the focused screen registers.
const defaultConfig: OnboardingStickyHeaderConfig = {shouldShowBackButton: false};

// Split data vs. setter so screens that only register config don't re-render when the config value changes.
const OnboardingStickyHeaderConfigContext = createContext<OnboardingStickyHeaderConfig>(defaultConfig);
const SetOnboardingStickyHeaderConfigContext = createContext<SetOnboardingStickyHeaderConfig>(() => {});

// The sticky caret renders outside every onboarding screen's web focus trap, so it would be skipped by keyboard Tab.
// The overlay publishes its DOM node here and each screen adds it to its focus trap's `containerElements` (web only),
// so the caret rejoins the Tab order. Always null on native (no DOM).
const OnboardingStickyHeaderContainerElementContext = createContext<HTMLElement | null>(null);
const SetOnboardingStickyHeaderContainerElementContext = createContext<React.Dispatch<React.SetStateAction<HTMLElement | null>>>(() => {});

/**
 * Holds the back-header config for the currently focused onboarding screen so a single sticky caret can be
 * rendered once, as an overlay above the Stack.Navigator, instead of inside each animated card.
 */
function OnboardingStickyHeaderProvider({children}: {children: React.ReactNode}) {
    const [config, setConfig] = useState<OnboardingStickyHeaderConfig>(defaultConfig);
    const [containerElement, setContainerElement] = useState<HTMLElement | null>(null);

    return (
        <SetOnboardingStickyHeaderConfigContext.Provider value={setConfig}>
            <SetOnboardingStickyHeaderContainerElementContext.Provider value={setContainerElement}>
                <OnboardingStickyHeaderContainerElementContext.Provider value={containerElement}>
                    <OnboardingStickyHeaderConfigContext.Provider value={config}>{children}</OnboardingStickyHeaderConfigContext.Provider>
                </OnboardingStickyHeaderContainerElementContext.Provider>
            </SetOnboardingStickyHeaderContainerElementContext.Provider>
        </SetOnboardingStickyHeaderConfigContext.Provider>
    );
}

/**
 * Returns the sticky caret's DOM node (web) so a screen can include it in its focus trap's `containerElements`.
 * Always null on native. Returned as a stable single-element array only when the node exists.
 */
function useOnboardingStickyHeaderContainerElements(): HTMLElement[] | undefined {
    const containerElement = useContext(OnboardingStickyHeaderContainerElementContext);
    return containerElement ? [containerElement] : undefined;
}

/**
 * Registers the focused onboarding screen's back-header config into the shared sticky overlay.
 *
 * Uses useFocusEffect (not a plain effect) so the *incoming* screen re-asserts its config the moment focus flips
 * during a transition, and the outgoing screen's cleanup only resets to the default if it still owns the config —
 * so a leaving screen can never clear the screen taking focus.
 *
 * `onBackButtonPress` is read through a ref so a fresh inline handler each render doesn't trigger re-registration,
 * while the caret still always invokes the latest handler.
 */
function useOnboardingStickyHeader({shouldShowBackButton, onBackButtonPress, shouldEnableMaxHeight, shouldCollapseOnKeyboard}: OnboardingStickyHeaderConfig) {
    const setConfig = useContext(SetOnboardingStickyHeaderConfigContext);
    const onBackButtonPressRef = useRef(onBackButtonPress);

    useEffect(() => {
        onBackButtonPressRef.current = onBackButtonPress;
    }, [onBackButtonPress]);

    useFocusEffect(
        useCallback(() => {
            const registeredConfig: OnboardingStickyHeaderConfig = {
                shouldShowBackButton,
                shouldEnableMaxHeight,
                shouldCollapseOnKeyboard,
                onBackButtonPress: () => {
                    const handler = onBackButtonPressRef.current;

                    if (handler) {
                        handler();
                        return;
                    }

                    Navigation.goBack();
                },
            };

            setConfig(registeredConfig);

            return () => {
                setConfig((currentConfig) => (currentConfig === registeredConfig ? defaultConfig : currentConfig));
            };
        }, [shouldShowBackButton, shouldEnableMaxHeight, shouldCollapseOnKeyboard, setConfig]),
    );
}

/**
 * The single sticky caret rendered once above the onboarding Stack.Navigator. It is absolutely positioned and
 * `box-none`, so it sits on top of each animated card (which still paints the modal surface, keeps its own safe-area
 * inset and its own KeyboardAvoidingView) without consuming any layout height — the card geometry is untouched.
 *
 * It owns its own top offset: the safe-area top inset, plus the visual-viewport offset when (and only when) the
 * focused screen enabled max height, so it stays aligned with that screen's in-card slot on mobile Safari.
 */
function OnboardingStickyHeaderOverlay() {
    const styles = useThemeStyles();
    const StyleUtils = useStyleUtils();
    const insets = useSafeAreaInsets();
    const config = useContext(OnboardingStickyHeaderConfigContext);
    const setContainerElement = useContext(SetOnboardingStickyHeaderContainerElementContext);
    const viewportOffsetTop = useViewportOffsetTop();
    const {paddingTop} = StyleUtils.getPlatformSafeAreaPadding(insets);

    const topOffset = paddingTop + (config.shouldEnableMaxHeight ? viewportOffsetTop : 0);

    const caret = (
        <CaretBackHeader
            shouldShowBackButton={config.shouldShowBackButton}
            onBackButtonPress={config.onBackButtonPress}
        />
    );

    return (
        <View
            style={[styles.pAbsolute, styles.l0, styles.r0, {top: topOffset}]}
            pointerEvents="box-none"
        >
            {/* FocusTrapContainerElement publishes this node so each onboarding screen can add it to its focus trap's
                containerElements, keeping the Back caret in the keyboard Tab order on web. No-op on native. */}
            <FocusTrapContainerElement onContainerElementChanged={setContainerElement}>
                {config.shouldCollapseOnKeyboard ? <CollapsibleHeaderOnKeyboard alwaysCollapseHeaderOnKeyboard>{caret}</CollapsibleHeaderOnKeyboard> : caret}
            </FocusTrapContainerElement>
        </View>
    );
}

export {OnboardingStickyHeaderProvider, OnboardingStickyHeaderOverlay, useOnboardingStickyHeader, useOnboardingStickyHeaderContainerElements};
