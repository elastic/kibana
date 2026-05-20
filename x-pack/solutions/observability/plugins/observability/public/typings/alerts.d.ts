import type { ParsedTechnicalFields } from '@kbn/rule-registry-plugin/common';
import type { ParsedExperimentalFields } from '@kbn/rule-registry-plugin/common/parse_experimental_fields';
export interface TopAlert<TAdditionalMetaFields extends Record<string, any> = {}> {
    fields: ParsedTechnicalFields & ParsedExperimentalFields & TAdditionalMetaFields;
    start: number;
    lastUpdated: number;
    reason: string;
    link?: string;
    active: boolean;
    hasBasePath?: boolean;
}
