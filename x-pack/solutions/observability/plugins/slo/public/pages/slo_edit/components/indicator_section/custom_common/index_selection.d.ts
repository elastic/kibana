import type { DataView } from '@kbn/data-views-plugin/public';
import React from 'react';
export declare const DATA_VIEW_FIELD = "indicator.params.dataViewId";
export declare function IndexSelection({ selectedDataView }: {
    selectedDataView?: DataView;
}): React.JSX.Element;
