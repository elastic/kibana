import type { Action } from '@kbn/ui-actions-plugin/public';
import type { ReportViewType } from '../types';
import type { AllSeries } from '../hooks/use_series_storage';
export type ActionTypes = 'explore' | 'save' | 'addToCase' | 'openInLens';
export declare function useActions({ withActions, attributes, reportType, setIsSaveOpen, setAddToCaseOpen, timeRange, lensAttributes, }: {
    withActions?: boolean | ActionTypes[];
    reportType: ReportViewType;
    attributes: AllSeries;
    setIsSaveOpen: (val: boolean) => void;
    setAddToCaseOpen: (val: boolean) => void;
    timeRange: {
        from: string;
        to: string;
    };
    lensAttributes: any;
}): Action<object, object>[];
