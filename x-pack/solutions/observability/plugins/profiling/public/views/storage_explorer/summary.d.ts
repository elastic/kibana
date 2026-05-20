import React from 'react';
import type { StorageExplorerSummaryAPIResponse } from '../../../common/storage_explorer';
interface Props {
    data?: StorageExplorerSummaryAPIResponse;
    isLoading: boolean;
}
export declare function Summary({ data, isLoading }: Props): React.JSX.Element;
export {};
