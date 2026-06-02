import type {TextInput} from 'react-native';
import shouldSetSelectionRange from '@libs/shouldSetSelectionRange';
import type {InputType, Selection} from './types';

const setSelectionRange = shouldSetSelectionRange();

const setTextInputSelection = (textInput: InputType, forcedSelectionRange: Selection) => {
    const inputWithSetSelection = textInput as InputType & {
        setSelection?: (start: number, end: number) => void;
    };

    if (typeof inputWithSetSelection.setSelection === 'function') {
        inputWithSetSelection.setSelection(forcedSelectionRange.start, forcedSelectionRange.end);
        return;
    }

    if (setSelectionRange) {
        (textInput as HTMLTextAreaElement).setSelectionRange?.(forcedSelectionRange.start, forcedSelectionRange.end);
    } else {
        (textInput as TextInput).setSelection?.(forcedSelectionRange.start, forcedSelectionRange.end);
    }
};

export default setTextInputSelection;
