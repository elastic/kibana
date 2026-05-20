import React from 'react';
import type { SeriesConfig, SeriesUrl } from '../../types';
interface Props {
    seriesId: number;
    series: SeriesUrl;
    field: string;
    seriesConfig: SeriesConfig;
    onChange: (field: string, value: string) => void;
}
export declare function TextReportDefinitionField({ series, field, seriesConfig, onChange }: Props): React.JSX.Element;
export {};
