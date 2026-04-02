import {useCallback} from 'react';
import {ModalActions} from '@components/Modal/Global/ModalContext';
import type {SearchQueryJSON, SearchStatus} from '@components/Search/types';
import {queueExportSearchItemsToCSV, queueExportSearchWithTemplate} from '@libs/actions/Search';
import {serializeQueryJSONForBackend} from '@libs/SearchQueryUtils';
import useConfirmModal from './useConfirmModal';
import useLocalize from './useLocalize';

type UseQueuedSearchExportParams = {
    onConfirmed?: () => void;
};

type QueueBasicSearchExportParams = {
    query: SearchStatus;
    queryJSON?: SearchQueryJSON;
    reportIDList: string[];
    transactionIDList: string[];
};

type QueueTemplateSearchExportParams = {
    templateName: string;
    templateType: string;
    queryJSON?: SearchQueryJSON;
    reportIDList: string[];
    transactionIDList: string[];
    policyID?: string;
    fallbackJSONQuery?: string;
};

function useQueuedSearchExport({onConfirmed}: UseQueuedSearchExportParams = {}) {
    const {showConfirmModal} = useConfirmModal();
    const {translate} = useLocalize();

    const getSerializedQueryJSON = useCallback((queryJSON?: SearchQueryJSON, fallbackJSONQuery = '{}') => {
        if (!queryJSON) {
            return fallbackJSONQuery;
        }

        return serializeQueryJSONForBackend(queryJSON);
    }, []);

    const showQueuedExportProgressModal = useCallback(async () => {
        const result = await showConfirmModal({
            title: translate('export.exportInProgress'),
            prompt: translate('export.conciergeWillSend'),
            confirmText: translate('common.buttonConfirm'),
            shouldShowCancelButton: false,
        });

        if (result.action === ModalActions.CONFIRM) {
            onConfirmed?.();
        }
    }, [showConfirmModal, translate, onConfirmed]);

    const queueBasicSearchExport = useCallback(
        async ({query, queryJSON, reportIDList, transactionIDList}: QueueBasicSearchExportParams) => {
            queueExportSearchItemsToCSV({
                query,
                jsonQuery: getSerializedQueryJSON(queryJSON),
                reportIDList,
                transactionIDList,
            });

            await showQueuedExportProgressModal();
        },
        [getSerializedQueryJSON, showQueuedExportProgressModal],
    );

    const queueTemplateSearchExport = useCallback(
        async ({templateName, templateType, queryJSON, reportIDList, transactionIDList, policyID, fallbackJSONQuery = '{}'}: QueueTemplateSearchExportParams) => {
            queueExportSearchWithTemplate({
                templateName,
                templateType,
                jsonQuery: getSerializedQueryJSON(queryJSON, fallbackJSONQuery),
                reportIDList,
                transactionIDList,
                policyID,
            });

            await showQueuedExportProgressModal();
        },
        [getSerializedQueryJSON, showQueuedExportProgressModal],
    );

    return {
        queueBasicSearchExport,
        queueTemplateSearchExport,
    };
}

export default useQueuedSearchExport;
