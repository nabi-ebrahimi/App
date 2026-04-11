import type {NavigationAction} from '@react-navigation/native';
import {useIsFocused} from '@react-navigation/native';
import {useCallback, useEffect, useRef} from 'react';
import {ModalActions} from '@components/Modal/Global/ModalContext';
import useBeforeRemove from '@hooks/useBeforeRemove';
import useConfirmModal from '@hooks/useConfirmModal';
import useLocalize from '@hooks/useLocalize';
import setNavigationActionToMicrotaskQueue from '@libs/Navigation/helpers/setNavigationActionToMicrotaskQueue';
import navigateAfterInteraction from '@libs/Navigation/navigateAfterInteraction';
import navigationRef from '@libs/Navigation/navigationRef';
import type UseDiscardChangesConfirmationOptions from './types';

type BrowserBackGuard = {
    shouldBlock: () => boolean;
    onBlock: () => void;
};

type BrowserBackGuardWindow = Window & {
    expensifyBrowserBackGuard?: BrowserBackGuard;
};

function useDiscardChangesConfirmation({getHasUnsavedChanges, onCancel, onVisibilityChange, isEnabled = true}: UseDiscardChangesConfirmationOptions) {
    const isFocused = useIsFocused();
    const {translate} = useLocalize();
    const {showConfirmModal, closeModal} = useConfirmModal();
    const blockedNavigationAction = useRef<NavigationAction>(undefined);
    const shouldNavigateBack = useRef(false);
    const isDiscardModalOpenRef = useRef(false);

    const navigateBack = useCallback(() => {
        if (blockedNavigationAction.current) {
            navigationRef.current?.dispatch(blockedNavigationAction.current);
            blockedNavigationAction.current = undefined;
            return;
        }
        if (!shouldNavigateBack.current) {
            return;
        }
        navigationRef.current?.goBack();
    }, []);

    const showDiscardModal = useCallback(() => {
        onVisibilityChange?.(true);
        isDiscardModalOpenRef.current = true;
        showConfirmModal({
            title: translate('discardChangesConfirmation.title'),
            prompt: translate('discardChangesConfirmation.body'),
            danger: true,
            confirmText: translate('discardChangesConfirmation.confirmText'),
            cancelText: translate('common.cancel'),
            shouldIgnoreBackHandlerDuringTransition: true,
        }).then((result) => {
            isDiscardModalOpenRef.current = false;
            onVisibilityChange?.(false);
            if (result.action === ModalActions.CONFIRM) {
                shouldNavigateBack.current = true;
                setNavigationActionToMicrotaskQueue(navigateBack);
            } else {
                blockedNavigationAction.current = undefined;
                shouldNavigateBack.current = false;
                onCancel?.();
            }
        });
    }, [showConfirmModal, translate, navigateBack, onCancel, onVisibilityChange]);

    useBeforeRemove(
        useCallback(
            (e) => {
                if (!isEnabled || !isFocused || !getHasUnsavedChanges() || shouldNavigateBack.current) {
                    return;
                }

                e.preventDefault();
                blockedNavigationAction.current = e.data.action;
                navigateAfterInteraction(showDiscardModal);
            },
            [getHasUnsavedChanges, isFocused, isEnabled, showDiscardModal],
        ),
        isEnabled && isFocused,
    );

    useEffect(() => {
        if (!isEnabled || !isFocused) {
            return undefined;
        }
        const browserWindow = window as BrowserBackGuardWindow;
        const browserBackGuard = {
            shouldBlock: () => {
                return getHasUnsavedChanges() && !shouldNavigateBack.current && !isDiscardModalOpenRef.current;
            },
            onBlock: () => {
                showDiscardModal();
            },
        };

        browserWindow.expensifyBrowserBackGuard = browserBackGuard;

        return () => {
            if (browserWindow.expensifyBrowserBackGuard !== browserBackGuard) {
                return;
            }
            delete browserWindow.expensifyBrowserBackGuard;
        };
    }, [getHasUnsavedChanges, isFocused, isEnabled, showDiscardModal]);

    /**
     * When the screen loses focus (or is disabled) while the discard modal is open,
     * close the modal and reset refs so we don't leave the modal visible or stale state.
     */
    useEffect(() => {
        if ((isFocused && isEnabled) || !isDiscardModalOpenRef.current) {
            return;
        }
        closeModal();
        blockedNavigationAction.current = undefined;
        shouldNavigateBack.current = false;
    }, [isFocused, isEnabled, closeModal]);
}

export default useDiscardChangesConfirmation;
