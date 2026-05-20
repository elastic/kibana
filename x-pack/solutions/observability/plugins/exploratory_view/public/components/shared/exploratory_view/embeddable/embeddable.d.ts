import type { Position } from '@elastic/charts';
import React from 'react';
import type { LensPublicStart, XYVisualizationState } from '@kbn/lens-plugin/public';
import type { AnalyticsServiceSetup } from '@kbn/core-analytics-browser';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { AllSeries } from '../../../..';
import type { AppDataType, ReportViewType } from '../types';
import type { DataViewState } from '../hooks/use_app_data_view';
import type { ReportConfigMap } from '../contexts/exploratory_view_config';
import type { ActionTypes } from './use_actions';
export interface ExploratoryEmbeddableProps {
    id?: string;
    appendTitle?: JSX.Element;
    attributes: AllSeries;
    axisTitlesVisibility?: XYVisualizationState['axisTitlesVisibilitySettings'];
    gridlinesVisibilitySettings?: XYVisualizationState['gridlinesVisibilitySettings'];
    customHeight?: string;
    customTimeRange?: {
        from: string;
        to: string;
    };
    dataTypesIndexPatterns?: Partial<Record<AppDataType, string>>;
    isSingleMetric?: boolean;
    legendIsVisible?: boolean;
    legendPosition?: Position;
    hideTicks?: boolean;
    onBrushEnd?: (param: {
        range: number[];
    }) => void;
    onLoad?: (loading: boolean) => void;
    caseOwner?: string;
    reportConfigMap?: ReportConfigMap;
    reportType: ReportViewType;
    showCalculationMethod?: boolean;
    title?: string | JSX.Element;
    withActions?: boolean | ActionTypes[];
    align?: 'left' | 'right' | 'center';
    sparklineMode?: boolean;
    noLabel?: boolean;
    fontSize?: number;
    lineHeight?: number;
    dataTestSubj?: string;
    searchSessionId?: string;
    dslFilters?: QueryDslQueryContainer[];
}
export interface ExploratoryEmbeddableComponentProps extends ExploratoryEmbeddableProps {
    lens: LensPublicStart;
    dataViewState: DataViewState;
    analytics?: AnalyticsServiceSetup;
}
export default function Embeddable(props: ExploratoryEmbeddableComponentProps): React.JSX.Element | null;
