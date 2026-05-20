import type { FlameSpec } from '@elastic/charts';
import type { ElasticFlameGraph } from '@kbn/profiling-utils';
import React from 'react';
import type { ComparisonMode } from '../normalization_menu';
interface Props {
    id: string;
    comparisonMode?: ComparisonMode;
    primaryFlamegraph?: ElasticFlameGraph;
    comparisonFlamegraph?: ElasticFlameGraph;
    baseline?: number;
    comparison?: number;
    searchText?: string;
    onChangeSearchText?: FlameSpec['onSearchTextChange'];
    isEmbedded?: boolean;
}
export declare function FlameGraph({ id, comparisonMode, primaryFlamegraph, comparisonFlamegraph, baseline, comparison, searchText, onChangeSearchText, isEmbedded, }: Props): React.JSX.Element;
export {};
