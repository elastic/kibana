import React from 'react';
import type { StorageExplorerHostDetails } from '../../../../common/storage_explorer';
interface Props {
    data?: StorageExplorerHostDetails[];
    hasDistinctProbabilisticValues: boolean;
}
export declare function HostsTable({ data, hasDistinctProbabilisticValues }: Props): React.JSX.Element;
export {};
