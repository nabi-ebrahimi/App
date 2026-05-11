import React, {useEffect, useState} from 'react';
import SingleSelectListItem from '@components/SelectionList/ListItem/SingleSelectListItem';
import SelectionListWithSections from '@components/SelectionList/SelectionListWithSections';
import useDebouncedState from '@hooks/useDebouncedState';
import useLocalize from '@hooks/useLocalize';
import Navigation from '@libs/Navigation/Navigation';
import type {OptionData} from '@libs/ReportUtils';
import {sortOptionsWithEmptyValue} from '@libs/SearchQueryUtils';
import ROUTES from '@src/ROUTES';
import type {Route} from '@src/ROUTES';
import SearchFilterPageFooterButtons from './SearchFilterPageFooterButtons';

type SearchSingleSelectionPickerItem = {
    name: string;
    value: string;
};

type SearchSingleSelectionPickerProps = {
    items: SearchSingleSelectionPickerItem[];
    initiallySelectedItem: SearchSingleSelectionPickerItem | undefined;
    pickerTitle?: string;
    onSaveSelection: (value: string | undefined) => void;
    backToRoute?: Route;
    shouldAutoSave?: boolean;
    shouldShowTextInput?: boolean;
    shouldShowNoneOption?: boolean;
};

const NONE_OPTION_KEY = '__none__';

function SearchSingleSelectionPicker({
    items,
    initiallySelectedItem,
    pickerTitle,
    onSaveSelection,
    backToRoute,
    shouldAutoSave,
    shouldShowTextInput = true,
    shouldShowNoneOption = false,
}: SearchSingleSelectionPickerProps) {
    const {translate, localeCompare} = useLocalize();

    const [searchTerm, debouncedSearchTerm, setSearchTerm] = useDebouncedState('');
    const [selectedItem, setSelectedItem] = useState<SearchSingleSelectionPickerItem | undefined>(initiallySelectedItem);
    const noneOptionName = translate('common.none');

    const getKeyForList = (item: SearchSingleSelectionPickerItem) => item.value || item.name || NONE_OPTION_KEY;

    const sortItems = (a: SearchSingleSelectionPickerItem, b: SearchSingleSelectionPickerItem) => {
        if (a.value === '' && b.value !== '') {
            return -1;
        }
        if (a.value !== '' && b.value === '') {
            return 1;
        }
        return sortOptionsWithEmptyValue(a.name.toString(), b.name.toString(), localeCompare);
    };

    useEffect(() => {
        setSelectedItem(initiallySelectedItem);
    }, [initiallySelectedItem]);

    const emptyValueItemsSection = (shouldShowNoneOption ? [] : items)
        .filter((item) => item.value === '' && item.name.toLowerCase().includes(debouncedSearchTerm?.toLowerCase()))
        .map((item) => ({
            text: item.name,
            keyForList: getKeyForList(item),
            isSelected: selectedItem?.value === item.value,
            value: item.value,
        }));
    const noneItemSection =
        shouldShowNoneOption && noneOptionName.toLowerCase().includes(debouncedSearchTerm?.toLowerCase())
            ? [
                  {
                      text: noneOptionName,
                      keyForList: NONE_OPTION_KEY,
                      isSelected: selectedItem?.value === '' || (!selectedItem && !initiallySelectedItem),
                      value: '',
                  },
              ]
            : [];

    const initiallySelectedItemSection =
        initiallySelectedItem?.value !== '' && initiallySelectedItem?.name.toLowerCase().includes(debouncedSearchTerm?.toLowerCase())
            ? [
                  {
                      text: initiallySelectedItem.name,
                      keyForList: getKeyForList(initiallySelectedItem),
                      isSelected: selectedItem?.value === initiallySelectedItem.value,
                      value: initiallySelectedItem.value,
                  },
              ]
            : [];

    const remainingItemsSection = items
        .filter((item) => item.value !== '' && item.value !== initiallySelectedItem?.value && item.name.toLowerCase().includes(debouncedSearchTerm?.toLowerCase()))
        .sort(sortItems)
        .map((item) => ({
            text: item.name,
            keyForList: getKeyForList(item),
            isSelected: selectedItem?.value === item.value,
            value: item.value,
        }));

    const topItemsSection = [...noneItemSection, ...emptyValueItemsSection];
    const noResultsFound = !topItemsSection.length && !initiallySelectedItemSection.length && !remainingItemsSection.length;

    const sections = noResultsFound
        ? []
        : [
              {
                  title: undefined,
                  data: topItemsSection,
                  sectionIndex: 0,
              },
              {
                  title: undefined,
                  data: initiallySelectedItemSection,
                  sectionIndex: 1,
              },
              {
                  title: pickerTitle,
                  data: remainingItemsSection,
                  sectionIndex: 2,
              },
          ];

    const onSelectItem = (item: Partial<OptionData & SearchSingleSelectionPickerItem>) => {
        if (!item.text || item.keyForList === undefined || item.keyForList === null || item.value === undefined || item.value === null) {
            return;
        }
        if (shouldAutoSave) {
            onSaveSelection(item.isSelected ? '' : item.value);
            Navigation.goBack(backToRoute ?? ROUTES.SEARCH_ADVANCED_FILTERS.getRoute());
            return;
        }
        if (!item.isSelected) {
            setSelectedItem({name: item.text, value: item.value});
        }
    };

    const resetChanges = () => {
        setSelectedItem(undefined);
    };

    const applyChanges = () => {
        onSaveSelection(selectedItem?.value);
        Navigation.goBack(backToRoute ?? ROUTES.SEARCH_ADVANCED_FILTERS.getRoute());
    };

    const footerContent = (
        <SearchFilterPageFooterButtons
            applyChanges={applyChanges}
            resetChanges={resetChanges}
        />
    );

    const textInputOptions = {
        value: searchTerm,
        label: translate('common.search'),
        onChangeText: setSearchTerm,
        headerMessage: noResultsFound ? translate('common.noResultsFound') : undefined,
    };
    const initiallyFocusedItemKey = initiallySelectedItem?.value === '' && shouldShowNoneOption ? NONE_OPTION_KEY : initiallySelectedItem ? getKeyForList(initiallySelectedItem) : undefined;
    const focusedItemKey = initiallyFocusedItemKey ?? (shouldShowNoneOption ? NONE_OPTION_KEY : undefined);

    return (
        <SelectionListWithSections
            sections={sections}
            onSelectRow={onSelectItem}
            ListItem={SingleSelectListItem}
            initiallyFocusedItemKey={focusedItemKey}
            shouldShowTextInput={shouldShowTextInput}
            textInputOptions={textInputOptions}
            footerContent={shouldAutoSave ? undefined : footerContent}
            shouldShowLoadingPlaceholder={!noResultsFound}
            shouldUpdateFocusedIndex
            shouldStopPropagation
        />
    );
}

export default SearchSingleSelectionPicker;
export type {SearchSingleSelectionPickerItem};
