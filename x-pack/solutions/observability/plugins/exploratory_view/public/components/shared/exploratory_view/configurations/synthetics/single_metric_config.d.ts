import type { LegacyMetricState } from '@kbn/lens-plugin/common';
import type { ConfigProps, SeriesConfig } from '../../types';
export declare const FINAL_SUMMARY_KQL = "summary.final_attempt: true";
export declare function getSyntheticsSingleMetricConfig({ dataView }: ConfigProps): SeriesConfig;
export declare const getColorPalette: (color: "danger" | "warning" | "success" | string) => LegacyMetricState["palette"];
