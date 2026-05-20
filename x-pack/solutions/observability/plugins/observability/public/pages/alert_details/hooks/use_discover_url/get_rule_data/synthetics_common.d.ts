import type { DataViewSpec } from '@kbn/data-views-plugin/common';
import { type KueryNode } from '@kbn/es-query';
export declare const SYNTHETICS_TEMP_DATA_VIEW: DataViewSpec;
export declare function mapExtraSyntheticsFilters(extraFilters: Partial<Record<string, string[] | undefined>>, kqlQuery?: string): KueryNode[];
