import type {SearchQueryString} from '@components/Search/types';

function getSearchPageInputQueryForSubmit(queryString: SearchQueryString, originalInputQuery: SearchQueryString, shouldShowQuery: boolean): SearchQueryString {
    if (shouldShowQuery || !queryString.trim() || !originalInputQuery.trim()) {
        return queryString;
    }

    return `${originalInputQuery} ${queryString}`;
}

export default getSearchPageInputQueryForSubmit;
