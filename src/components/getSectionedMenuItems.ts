type SectionableMenuItem<TValue extends string> = {
    value: TValue;
    shouldShow?: boolean;
    shouldShowDivider?: boolean;
};

function getSectionedMenuItems<TValue extends string, TItem extends SectionableMenuItem<TValue>>(
    itemValues: TValue[],
    itemSections: ReadonlyArray<readonly TValue[]>,
    getItem: (value: TValue) => TItem | undefined,
    excludedValue?: string,
): TItem[] {
    const knownValues = new Set(itemSections.flat());
    const uncategorizedValues = itemValues.filter((value) => !knownValues.has(value));
    const lastSectionIndex = itemSections.length - 1;
    const sections = itemSections.flatMap((section, index) => {
        if (index !== lastSectionIndex || !uncategorizedValues.length) {
            return [section];
        }

        return [uncategorizedValues, section];
    });
    const remainingValues = new Set(itemValues);
    let hasRenderedSection = false;

    return sections.flatMap((section) => {
        const sectionItems = section
            .filter((value) => remainingValues.delete(value))
            .map(getItem)
            .filter((item): item is TItem => !!item && item.shouldShow !== false && item.value !== excludedValue);

        if (!sectionItems.length) {
            return [];
        }

        const shouldShowDivider = hasRenderedSection;
        hasRenderedSection = true;

        if (!shouldShowDivider) {
            return sectionItems;
        }

        return sectionItems.map((item, index) => (index === 0 ? {...item, shouldShowDivider: true} : item));
    });
}

export default getSectionedMenuItems;
