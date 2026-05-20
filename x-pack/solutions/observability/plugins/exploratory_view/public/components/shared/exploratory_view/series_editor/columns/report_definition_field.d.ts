import React from 'react';
import type { ExistsFilter, PhraseFilter } from '@kbn/es-query';
import type { PersistableFilter } from '@kbn/lens-plugin/common';
import type { SeriesConfig, SeriesUrl } from '../../types';
interface Props {
    seriesId: number;
    series: SeriesUrl;
    singleSelection?: boolean;
    keepHistory?: boolean;
    field: string | {
        field: string;
        nested: string;
    };
    seriesConfig: SeriesConfig;
    onChange: (field: string, value?: string[]) => void;
    filters?: Array<PersistableFilter | ExistsFilter | PhraseFilter>;
}
export declare function ReportDefinitionField({ singleSelection, keepHistory, series, field: fieldProp, seriesConfig, onChange, filters, }: Props): React.JSX.Element | null;
export {};
