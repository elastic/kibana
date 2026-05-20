import type { Indicator } from '@kbn/slo-schema';
export declare function useDebouncedGetPreviewData(isIndicatorValid: boolean, indicator: Indicator, range: {
    from: Date;
    to: Date;
}, groupBy?: string | string[]): import("../../../hooks/use_get_preview_data").UseGetPreviewData;
