import React from 'react';
import type { DataView } from '@kbn/data-views-plugin/common';
export declare function buildFilterLabel({ field, value, label, dataView, negate, }: {
    label: string;
    value: string | Array<string | number>;
    negate: boolean;
    field: string;
    dataView: DataView;
}): import("@kbn/es-query").PhraseFilter | import("@kbn/es-query").PhrasesFilter | import("@kbn/es-query").ScriptedPhraseFilter;
export interface FilterValueLabelProps {
    field: string;
    label: string;
    value: string | Array<string | number>;
    negate: boolean;
    removeFilter: (field: string, value: string | Array<string | number>, notVal: boolean) => void;
    invertFilter: (val: {
        field: string;
        value: string | Array<string | number>;
        negate: boolean;
    }) => void;
    dataView: DataView;
    allowExclusion?: boolean;
}
export declare function FilterValueLabel({ label, field, value, negate, dataView, invertFilter, removeFilter, allowExclusion, }: FilterValueLabelProps): React.JSX.Element | null;
export default FilterValueLabel;
