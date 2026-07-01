import {useEffect, useRef, useState} from 'react';
// We use Animated for all functionality related to wide RHP to make it easier
// to interact with react-navigation components (e.g., CardContainer, interpolator), which also use Animated.
// eslint-disable-next-line no-restricted-imports
import {Animated} from 'react-native';

const OVERLAY_TIMING_DURATION = 300;

function useShouldRenderOverlay(condition: boolean, overlayProgress: Animated.Value) {
    const [shouldRenderOverlay, setShouldRenderOverlay] = useState(condition);
    const conditionRef = useRef(condition);
    const animationRef = useRef<Animated.CompositeAnimation | undefined>(undefined);

    useEffect(() => {
        conditionRef.current = condition;
        animationRef.current?.stop();

        if (condition) {
            setShouldRenderOverlay(true);
            animationRef.current = Animated.timing(overlayProgress, {
                toValue: 1,
                duration: OVERLAY_TIMING_DURATION,
                useNativeDriver: false,
            });
            animationRef.current.start();
            return () => {
                animationRef.current?.stop();
            };
        }

        animationRef.current = Animated.timing(overlayProgress, {
            toValue: 0,
            duration: OVERLAY_TIMING_DURATION,
            useNativeDriver: false,
        });
        animationRef.current.start(({finished}) => {
            if (!finished || conditionRef.current) {
                return;
            }

            setShouldRenderOverlay(false);
        });

        return () => {
            animationRef.current?.stop();
        };
    }, [condition, overlayProgress]);

    return condition || shouldRenderOverlay;
}

export default useShouldRenderOverlay;
