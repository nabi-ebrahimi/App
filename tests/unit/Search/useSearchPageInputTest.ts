import getSearchPageInputQueryForSubmit from '@components/Search/SearchPageHeader/getSearchPageInputQueryForSubmit';

describe('getSearchPageInputQueryForSubmit', () => {
    test('appends typed search text to the current query when the full query is hidden', () => {
        const result = getSearchPageInputQueryForSubmit('groupBy:reports', 'type:expense from:12345', false);

        expect(result).toBe('type:expense from:12345 groupBy:reports');
    });

    test('uses typed search text as-is when the full query is already visible', () => {
        const result = getSearchPageInputQueryForSubmit('type:expense from:12345 groupBy:reports', 'type:expense from:12345', true);

        expect(result).toBe('type:expense from:12345 groupBy:reports');
    });
});
