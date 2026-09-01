import {renderHook} from '@testing-library/react-native';

import useSearchExportActionsHydration from '@components/Search/hooks/useSearchExportActionsHydration';
import {
    EMPTY_SEARCH_EXPORT_ACTIONS,
    accumulateSnapshotExportActions,
    getNextExportActionsHydrationOffset,
    mergeExportActionsIntoLiveData,
    shouldHydrateSearchExportActions,
} from '@components/Search/SearchResultsProviderUtils';
import type {SearchExportActions} from '@components/Search/SearchResultsProviderUtils';
import type {SearchQueryJSON} from '@components/Search/types';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type {ReportAction, ReportActions, SearchResults} from '@src/types/onyx';
import type {SearchResultsInfo} from '@src/types/onyx/SearchResults';

const PRIMARY_HASH = 123;

function makeAction(actionName: ReportAction['actionName'], created: string): ReportAction {
    return {actionName, created} as ReportAction;
}

function makeSearchInfo(overrides: Partial<SearchResultsInfo> = {}): SearchResultsInfo {
    return {
        offset: 0,
        hash: PRIMARY_HASH,
        sortBy: CONST.SEARCH.TABLE_COLUMNS.DATE,
        sortOrder: CONST.SEARCH.SORT_ORDER.DESC,
        type: CONST.SEARCH.DATA_TYPES.EXPENSE_REPORT,
        hasMoreResults: true,
        hasResults: true,
        isLoading: false,
        state: CONST.SEARCH.SNAPSHOT_STATE.LOADED,
        ...overrides,
    };
}

function makeSnapshot(hash: number, offset: number, data: SearchResults['data']): SearchResults {
    return {data, search: makeSearchInfo({hash, offset})};
}

function makeSearchData(entries: Record<string, unknown>): SearchResults['data'] {
    const data: SearchResults['data'] = {};
    Object.assign(data, entries);
    return data;
}

function makeSearchExportActions(actionsByReportID: Record<string, ReportActions>): SearchExportActions {
    const exportActions: SearchExportActions = {};
    for (const [reportID, reportActions] of Object.entries(actionsByReportID)) {
        exportActions[`${ONYXKEYS.COLLECTION.REPORT_ACTIONS}${reportID}`] = reportActions;
    }
    return exportActions;
}

describe('SearchResultsProviderUtils', () => {
    it('detects when export action hydration is required', () => {
        const query = {columns: [CONST.SEARCH.TABLE_COLUMNS.DATE, CONST.SEARCH.TABLE_COLUMNS.EXPORTED_TO]} as SearchQueryJSON;
        expect(shouldHydrateSearchExportActions(query)).toBe(true);
        expect(shouldHydrateSearchExportActions({...query, columns: [CONST.SEARCH.TABLE_COLUMNS.DATE]})).toBe(false);
        expect(shouldHydrateSearchExportActions({...query, columns: undefined, sortBy: CONST.SEARCH.TABLE_COLUMNS.EXPORTED})).toBe(true);
    });

    it('accumulates export actions across replaced snapshot pages and ignores unrelated actions', () => {
        const firstExport = makeAction(CONST.REPORT.ACTIONS.TYPE.EXPORTED_TO_INTEGRATION, '2026-01-01');
        const secondExport = makeAction(CONST.REPORT.ACTIONS.TYPE.EXPORTED_TO_CSV, '2026-01-02');
        const approved = makeAction(CONST.REPORT.ACTIONS.TYPE.APPROVED, '2026-01-03');
        const firstPage = makeSearchData({
            [`${ONYXKEYS.COLLECTION.REPORT_ACTIONS}1`]: {export1: firstExport, approved},
        });
        const secondPage = makeSearchData({
            [`${ONYXKEYS.COLLECTION.REPORT_ACTIONS}2`]: {export2: secondExport},
        });

        const afterFirstPage = accumulateSnapshotExportActions(EMPTY_SEARCH_EXPORT_ACTIONS, firstPage);
        const afterSecondPage = accumulateSnapshotExportActions(afterFirstPage, secondPage);

        expect(afterSecondPage).toEqual({
            [`${ONYXKEYS.COLLECTION.REPORT_ACTIONS}1`]: {export1: firstExport},
            [`${ONYXKEYS.COLLECTION.REPORT_ACTIONS}2`]: {export2: secondExport},
        });
    });

    it('retains captured pages for the active hash and discards them when the hash changes', () => {
        const firstExport = makeAction(CONST.REPORT.ACTIONS.TYPE.EXPORTED_TO_INTEGRATION, '2026-01-01');
        const secondExport = makeAction(CONST.REPORT.ACTIONS.TYPE.EXPORTED_TO_CSV, '2026-01-02');
        const nextQueryExport = makeAction(CONST.REPORT.ACTIONS.TYPE.EXPORTED_TO_CSV, '2026-01-03');
        const firstPage = makeSnapshot(
            PRIMARY_HASH,
            0,
            makeSearchData({
                [`${ONYXKEYS.COLLECTION.REPORT_ACTIONS}1`]: {export1: firstExport},
            }),
        );
        const secondPage = makeSnapshot(
            PRIMARY_HASH,
            50,
            makeSearchData({
                [`${ONYXKEYS.COLLECTION.REPORT_ACTIONS}2`]: {export2: secondExport},
            }),
        );
        const nextQueryPage = makeSnapshot(
            PRIMARY_HASH + 1,
            0,
            makeSearchData({
                [`${ONYXKEYS.COLLECTION.REPORT_ACTIONS}3`]: {export3: nextQueryExport},
            }),
        );

        const {result, rerender} = renderHook(({primaryHash, snapshotSearchResults}) => useSearchExportActionsHydration({isEnabled: true, primaryHash, snapshotSearchResults}), {
            initialProps: {primaryHash: PRIMARY_HASH, snapshotSearchResults: firstPage},
        });

        expect(result.current.lastCapturedOffset).toBe(0);
        rerender({primaryHash: PRIMARY_HASH, snapshotSearchResults: secondPage});
        expect(result.current.actions).toEqual({
            [`${ONYXKEYS.COLLECTION.REPORT_ACTIONS}1`]: {export1: firstExport},
            [`${ONYXKEYS.COLLECTION.REPORT_ACTIONS}2`]: {export2: secondExport},
        });

        rerender({primaryHash: PRIMARY_HASH + 1, snapshotSearchResults: nextQueryPage});
        expect(result.current.actions).toEqual({
            [`${ONYXKEYS.COLLECTION.REPORT_ACTIONS}3`]: {export3: nextQueryExport},
        });
        expect(result.current.lastCapturedOffset).toBe(0);
    });

    it('enriches only live reports and lets live actions win duplicate IDs without mutating either input', () => {
        const snapshotExport = makeAction(CONST.REPORT.ACTIONS.TYPE.EXPORTED_TO_INTEGRATION, '2026-01-01');
        const newerLiveExport = makeAction(CONST.REPORT.ACTIONS.TYPE.EXPORTED_TO_INTEGRATION, '2026-01-02');
        const excludedExport = makeAction(CONST.REPORT.ACTIONS.TYPE.EXPORTED_TO_CSV, '2026-01-03');
        const liveData = makeSearchData({
            [`${ONYXKEYS.COLLECTION.REPORT}1`]: {reportID: '1'},
            [`${ONYXKEYS.COLLECTION.REPORT_ACTIONS}1`]: {sameID: newerLiveExport},
        });
        const accumulatedActions = makeSearchExportActions({
            '1': {sameID: snapshotExport},
            '2': {excluded: excludedExport},
        });

        const mergedData = mergeExportActionsIntoLiveData(liveData, accumulatedActions);

        expect(mergedData[`${ONYXKEYS.COLLECTION.REPORT_ACTIONS}1`]).toEqual({sameID: newerLiveExport});
        expect(mergedData[`${ONYXKEYS.COLLECTION.REPORT_ACTIONS}2`]).toBeUndefined();
        expect(liveData[`${ONYXKEYS.COLLECTION.REPORT_ACTIONS}1`]).toEqual({sameID: newerLiveExport});
        expect(accumulatedActions[`${ONYXKEYS.COLLECTION.REPORT_ACTIONS}1`]).toEqual({sameID: snapshotExport});
    });

    it('advances exactly one page only after the matching loaded page is captured', () => {
        const baseParams = {
            isEnabled: true,
            isFocused: true,
            isOffline: false,
            hasSnapshotErrors: false,
            primaryHash: PRIMARY_HASH,
            currentOffset: 50,
            lastCapturedOffset: 50,
            snapshotSearch: makeSearchInfo({offset: 50}),
        };

        expect(getNextExportActionsHydrationOffset(baseParams)).toBe(100);
        expect(getNextExportActionsHydrationOffset({...baseParams, lastCapturedOffset: 0})).toBeUndefined();
        expect(getNextExportActionsHydrationOffset({...baseParams, snapshotSearch: makeSearchInfo({offset: 50, isLoading: true})})).toBeUndefined();
        expect(getNextExportActionsHydrationOffset({...baseParams, hasSnapshotErrors: true})).toBeUndefined();
        expect(getNextExportActionsHydrationOffset({...baseParams, snapshotSearch: makeSearchInfo({offset: 50, hasMoreResults: false})})).toBeUndefined();
        expect(getNextExportActionsHydrationOffset({...baseParams, snapshotSearch: makeSearchInfo({offset: 50, hash: PRIMARY_HASH + 1})})).toBeUndefined();
    });
});
