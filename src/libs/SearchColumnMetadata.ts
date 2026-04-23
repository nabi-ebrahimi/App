import type {ValueOf} from 'type-fest';
import type {SearchCustomColumnIds} from '@components/Search/types';
import CONST from '@src/CONST';
import type {TranslationPaths} from '@src/languages/types';
import type {Transaction} from '@src/types/onyx';

type ExpenseSearchColumn = ValueOf<typeof CONST.SEARCH.TABLE_COLUMNS>;

type ExpenseSearchColumnMetadata = {
    columnName: ExpenseSearchColumn;
    translationKey: TranslationPaths;
    isCustomColumn?: boolean;
    shouldKeepWhenSelected?: boolean;
    isSortable?: boolean;
    getTextValue?: (transaction: Transaction) => string;
};

const EXPENSE_SEARCH_COLUMN_METADATA: ExpenseSearchColumnMetadata[] = [
    {columnName: CONST.SEARCH.TABLE_COLUMNS.RECEIPT, translationKey: 'common.receipt', isCustomColumn: true, shouldKeepWhenSelected: true, isSortable: false},
    {columnName: CONST.SEARCH.TABLE_COLUMNS.TYPE, translationKey: 'common.type', shouldKeepWhenSelected: true, isSortable: false},
    {columnName: CONST.SEARCH.TABLE_COLUMNS.DATE, translationKey: 'common.date', isCustomColumn: true, shouldKeepWhenSelected: true, isSortable: true},
    {columnName: CONST.SEARCH.TABLE_COLUMNS.POSTED, translationKey: 'search.filters.posted', isCustomColumn: true, isSortable: true},
    {columnName: CONST.SEARCH.TABLE_COLUMNS.EXPORTED, translationKey: 'search.filters.exported', isCustomColumn: true, isSortable: true},
    {columnName: CONST.SEARCH.TABLE_COLUMNS.SUBMITTED, translationKey: 'common.submitted', isCustomColumn: true, isSortable: true},
    {columnName: CONST.SEARCH.TABLE_COLUMNS.APPROVED, translationKey: 'search.filters.approved', isCustomColumn: true, isSortable: true},
    {columnName: CONST.SEARCH.TABLE_COLUMNS.MERCHANT, translationKey: 'common.merchant', isCustomColumn: true, isSortable: true},
    {columnName: CONST.SEARCH.TABLE_COLUMNS.DESCRIPTION, translationKey: 'common.description', isCustomColumn: true, isSortable: true},
    {columnName: CONST.SEARCH.TABLE_COLUMNS.FROM, translationKey: 'common.from', isCustomColumn: true, isSortable: true},
    {columnName: CONST.SEARCH.TABLE_COLUMNS.TO, translationKey: 'common.to', isCustomColumn: true, isSortable: true},
    {columnName: CONST.SEARCH.TABLE_COLUMNS.POLICY_NAME, translationKey: 'workspace.common.workspace', isCustomColumn: true, isSortable: true},
    {columnName: CONST.SEARCH.TABLE_COLUMNS.CARD, translationKey: 'common.card', isCustomColumn: true, isSortable: true},
    {columnName: CONST.SEARCH.TABLE_COLUMNS.CATEGORY, translationKey: 'common.category', isCustomColumn: true, isSortable: true},
    {columnName: CONST.SEARCH.TABLE_COLUMNS.ATTENDEES, translationKey: 'iou.attendees', isCustomColumn: true, shouldKeepWhenSelected: true, isSortable: false},
    {columnName: CONST.SEARCH.TABLE_COLUMNS.TOTAL_PER_ATTENDEE, translationKey: 'iou.totalPerAttendee', isCustomColumn: true, shouldKeepWhenSelected: true, isSortable: false},
    {columnName: CONST.SEARCH.TABLE_COLUMNS.TAG, translationKey: 'common.tag', isCustomColumn: true, isSortable: true},
    {columnName: CONST.SEARCH.TABLE_COLUMNS.REIMBURSABLE, translationKey: 'common.reimbursable', isCustomColumn: true, shouldKeepWhenSelected: true, isSortable: true},
    {columnName: CONST.SEARCH.TABLE_COLUMNS.BILLABLE, translationKey: 'common.billable', isCustomColumn: true, shouldKeepWhenSelected: true, isSortable: true},
    {columnName: CONST.SEARCH.TABLE_COLUMNS.TAX_RATE, translationKey: 'iou.taxRate', isCustomColumn: true, isSortable: true},
    {columnName: CONST.SEARCH.TABLE_COLUMNS.TAX_AMOUNT, translationKey: 'common.tax', isCustomColumn: true, isSortable: true},
    {columnName: CONST.SEARCH.TABLE_COLUMNS.EXCHANGE_RATE, translationKey: 'common.exchangeRate', isCustomColumn: true, isSortable: true},
    {columnName: CONST.SEARCH.TABLE_COLUMNS.ORIGINAL_AMOUNT, translationKey: 'common.originalAmount', isCustomColumn: true, isSortable: true},
    {
        columnName: CONST.SEARCH.TABLE_COLUMNS.WITHDRAWAL_ID,
        translationKey: 'common.withdrawalID',
        isCustomColumn: true,
        shouldKeepWhenSelected: true,
        isSortable: true,
        getTextValue: (transaction) => transaction.withdrawalID?.toString() ?? '',
    },
    {columnName: CONST.SEARCH.TABLE_COLUMNS.TOTAL_AMOUNT, translationKey: 'iou.amount', isCustomColumn: true, shouldKeepWhenSelected: true, isSortable: true},
    {columnName: CONST.SEARCH.TABLE_COLUMNS.BASE_62_REPORT_ID, translationKey: 'common.reportID', isCustomColumn: true, shouldKeepWhenSelected: true, isSortable: true},
    {columnName: CONST.SEARCH.TABLE_COLUMNS.REPORT_ID, translationKey: 'common.longReportID', isCustomColumn: true, shouldKeepWhenSelected: true, isSortable: true},
    {columnName: CONST.SEARCH.TABLE_COLUMNS.TITLE, translationKey: 'common.title', isCustomColumn: true, shouldKeepWhenSelected: true, isSortable: true},
    {columnName: CONST.SEARCH.TABLE_COLUMNS.STATUS, translationKey: 'common.status', isCustomColumn: true, shouldKeepWhenSelected: true, isSortable: true},
    {columnName: CONST.SEARCH.TABLE_COLUMNS.EXPORTED_TO, translationKey: 'search.exportedTo', isCustomColumn: true, isSortable: false},
    {columnName: CONST.SEARCH.TABLE_COLUMNS.ACTION, translationKey: 'common.action', isCustomColumn: true, shouldKeepWhenSelected: true, isSortable: false},
];

const expenseSearchColumnMetadataMap = new Map<ExpenseSearchColumn, ExpenseSearchColumnMetadata>(
    EXPENSE_SEARCH_COLUMN_METADATA.map((columnMetadata) => [columnMetadata.columnName, columnMetadata]),
);

function getExpenseSearchColumnMetadata(column: ExpenseSearchColumn): ExpenseSearchColumnMetadata | undefined {
    return expenseSearchColumnMetadataMap.get(column);
}

function getExpenseSearchCustomColumns(): SearchCustomColumnIds[] {
    return Object.values(CONST.SEARCH.TYPE_CUSTOM_COLUMNS.EXPENSE).filter((column) => getExpenseSearchColumnMetadata(column)?.isCustomColumn);
}

function getExpenseSearchColumnTranslationKey(column: ExpenseSearchColumn): TranslationPaths | undefined {
    return getExpenseSearchColumnMetadata(column)?.translationKey;
}

function isExpenseSearchColumnSortable(column: ExpenseSearchColumn): boolean | undefined {
    return getExpenseSearchColumnMetadata(column)?.isSortable;
}

function getExpenseSearchAlwaysVisibleColumns(): ExpenseSearchColumn[] {
    return EXPENSE_SEARCH_COLUMN_METADATA.filter((columnMetadata) => columnMetadata.shouldKeepWhenSelected).map((columnMetadata) => columnMetadata.columnName);
}

function getExpenseSearchColumnTextValue(column: ExpenseSearchColumn, transaction: Transaction): string | undefined {
    return getExpenseSearchColumnMetadata(column)?.getTextValue?.(transaction);
}

export {
    getExpenseSearchAlwaysVisibleColumns,
    getExpenseSearchColumnMetadata,
    getExpenseSearchColumnTextValue,
    getExpenseSearchColumnTranslationKey,
    getExpenseSearchCustomColumns,
    isExpenseSearchColumnSortable,
};
