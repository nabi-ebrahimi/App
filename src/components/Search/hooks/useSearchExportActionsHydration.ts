import CONST from '@src/CONST';
import type {SearchResults} from '@src/types/onyx';

import {useEffect, useState} from 'react';

import type {SearchExportActions} from '../SearchResultsProviderUtils';

import {EMPTY_SEARCH_EXPORT_ACTIONS, accumulateSnapshotExportActions} from '../SearchResultsProviderUtils';

type ExportActionsAccumulatorState = {
    primaryHash: number;
    actions: SearchExportActions;
    lastCapturedOffset: number | undefined;
};

type UseSearchExportActionsHydrationParams = {
    isEnabled: boolean;
    primaryHash: number;
    snapshotSearchResults: SearchResults | null | undefined;
};

const initialState: ExportActionsAccumulatorState = {
    primaryHash: -1,
    actions: EMPTY_SEARCH_EXPORT_ACTIONS,
    lastCapturedOffset: undefined,
};

/** Accumulates export actions before each paginated Search response replaces the active snapshot data. */
function useSearchExportActionsHydration({isEnabled, primaryHash, snapshotSearchResults}: UseSearchExportActionsHydrationParams) {
    const [accumulator, setAccumulator] = useState<ExportActionsAccumulatorState>(initialState);

    useEffect(() => {
        const snapshotSearch = snapshotSearchResults?.search;
        const hasSnapshotErrors = Object.keys(snapshotSearchResults?.errors ?? {}).length > 0;
        if (
            !isEnabled ||
            !snapshotSearchResults?.data ||
            !snapshotSearch ||
            snapshotSearch.hash !== primaryHash ||
            snapshotSearch.isLoading ||
            snapshotSearch.state === CONST.SEARCH.SNAPSHOT_STATE.LOADING ||
            hasSnapshotErrors
        ) {
            return;
        }

        setAccumulator((previousAccumulator) => {
            const accumulatedActions = previousAccumulator.primaryHash === primaryHash ? previousAccumulator.actions : EMPTY_SEARCH_EXPORT_ACTIONS;
            const nextActions = accumulateSnapshotExportActions(accumulatedActions, snapshotSearchResults.data);
            if (previousAccumulator.primaryHash === primaryHash && previousAccumulator.lastCapturedOffset === snapshotSearch.offset && previousAccumulator.actions === nextActions) {
                return previousAccumulator;
            }

            return {
                primaryHash,
                actions: nextActions,
                lastCapturedOffset: snapshotSearch.offset,
            };
        });
    }, [isEnabled, primaryHash, snapshotSearchResults]);

    if (!isEnabled || accumulator.primaryHash !== primaryHash) {
        return {actions: EMPTY_SEARCH_EXPORT_ACTIONS, lastCapturedOffset: undefined};
    }

    return {actions: accumulator.actions, lastCapturedOffset: accumulator.lastCapturedOffset};
}

export default useSearchExportActionsHydration;
