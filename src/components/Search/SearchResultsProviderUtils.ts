import type {SearchQueryJSON} from '@components/Search/types';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type {ReportAction, ReportActions, SearchResults} from '@src/types/onyx';
import type {SearchResultsInfo} from '@src/types/onyx/SearchResults';

type ReportActionsKey = `${typeof ONYXKEYS.COLLECTION.REPORT_ACTIONS}${string}`;
type SearchExportActions = Partial<Record<ReportActionsKey, ReportActions>>;

type GetNextExportActionsHydrationOffsetParams = {
    isEnabled: boolean;
    isFocused: boolean;
    isOffline: boolean;
    hasSnapshotErrors: boolean;
    primaryHash: number;
    currentOffset: number;
    lastCapturedOffset: number | undefined;
    snapshotSearch: SearchResultsInfo | undefined;
};

const EMPTY_SEARCH_EXPORT_ACTIONS: SearchExportActions = {};

function isReportActionsKey(key: string): key is ReportActionsKey {
    return key.startsWith(ONYXKEYS.COLLECTION.REPORT_ACTIONS);
}

function isExportAction(action: ReportAction): boolean {
    return action.actionName === CONST.REPORT.ACTIONS.TYPE.EXPORTED_TO_CSV || action.actionName === CONST.REPORT.ACTIONS.TYPE.EXPORTED_TO_INTEGRATION;
}

/** Returns whether the active query needs the supplemental export actions supplied by Search snapshots. */
function shouldHydrateSearchExportActions(queryJSON: Readonly<SearchQueryJSON> | undefined): boolean {
    if (!queryJSON) {
        return false;
    }

    const columns = Array.isArray(queryJSON.columns) ? queryJSON.columns : queryJSON.columns ? [queryJSON.columns] : [];
    return (
        columns.includes(CONST.SEARCH.TABLE_COLUMNS.EXPORTED) ||
        columns.includes(CONST.SEARCH.TABLE_COLUMNS.EXPORTED_TO) ||
        queryJSON.sortBy === CONST.SEARCH.TABLE_COLUMNS.EXPORTED ||
        queryJSON.sortBy === CONST.SEARCH.TABLE_COLUMNS.EXPORTED_TO
    );
}

/**
 * Retains only export actions from an incoming snapshot page. Existing actions are preserved so replacing
 * the snapshot with the next page cannot remove export details captured from earlier pages.
 */
function accumulateSnapshotExportActions(accumulatedActions: SearchExportActions, snapshotData: SearchResults['data'] | undefined): SearchExportActions {
    if (!snapshotData) {
        return accumulatedActions;
    }

    let nextActions = accumulatedActions;

    for (const key of Object.keys(snapshotData)) {
        if (!isReportActionsKey(key)) {
            continue;
        }

        const pageActions = snapshotData[key] as ReportActions | undefined;
        if (!pageActions) {
            continue;
        }

        const existingActions = accumulatedActions[key];
        let nextReportActions = existingActions;

        for (const [actionID, action] of Object.entries(pageActions)) {
            if (!isExportAction(action) || existingActions?.[actionID] === action) {
                continue;
            }

            nextReportActions = {...(nextReportActions ?? {}), [actionID]: action};
        }

        if (nextReportActions === existingActions) {
            continue;
        }

        if (nextActions === accumulatedActions) {
            nextActions = {...accumulatedActions};
        }
        nextActions[key] = nextReportActions;
    }

    return nextActions;
}

/**
 * Adds accumulated export actions only to reports still selected by the live to-do predicate. Live actions
 * are spread last so a newer live action wins when both sources contain the same action ID.
 */
function mergeExportActionsIntoLiveData(liveData: SearchResults['data'], accumulatedActions: SearchExportActions): SearchResults['data'] {
    let mergedData = liveData;

    for (const [actionsKey, snapshotActions] of Object.entries(accumulatedActions) as Array<[ReportActionsKey, ReportActions | undefined]>) {
        if (!snapshotActions) {
            continue;
        }

        const reportID = actionsKey.slice(ONYXKEYS.COLLECTION.REPORT_ACTIONS.length);
        const reportKey = `${ONYXKEYS.COLLECTION.REPORT}${reportID}` as const;
        if (!liveData[reportKey]) {
            continue;
        }

        const liveActions = liveData[actionsKey] as ReportActions | undefined;
        if (mergedData === liveData) {
            mergedData = {...liveData};
        }
        Object.assign(mergedData, {[actionsKey]: {...snapshotActions, ...(liveActions ?? {})}});
    }

    return mergedData;
}

/** Returns the next sequential hydration offset only after the current snapshot page has been safely captured. */
function getNextExportActionsHydrationOffset({
    isEnabled,
    isFocused,
    isOffline,
    hasSnapshotErrors,
    primaryHash,
    currentOffset,
    lastCapturedOffset,
    snapshotSearch,
}: GetNextExportActionsHydrationOffsetParams): number | undefined {
    if (
        !isEnabled ||
        !isFocused ||
        isOffline ||
        hasSnapshotErrors ||
        !snapshotSearch ||
        snapshotSearch.hash !== primaryHash ||
        snapshotSearch.isLoading ||
        snapshotSearch.state === CONST.SEARCH.SNAPSHOT_STATE.LOADING ||
        !snapshotSearch.hasMoreResults ||
        snapshotSearch.offset !== currentOffset ||
        lastCapturedOffset !== currentOffset
    ) {
        return undefined;
    }

    return currentOffset + CONST.SEARCH.RESULTS_PAGE_SIZE;
}

export {EMPTY_SEARCH_EXPORT_ACTIONS, accumulateSnapshotExportActions, getNextExportActionsHydrationOffset, mergeExportActionsIntoLiveData, shouldHydrateSearchExportActions};
export type {SearchExportActions};
