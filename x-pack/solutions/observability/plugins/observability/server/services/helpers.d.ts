import type { SavedObjectReference } from '@kbn/core/server';
import type { LensSavedObjectAttributes } from '@kbn/lens-plugin/public';
declare const SUGGESTED_DASHBOARDS_VALID_RULE_TYPE_IDS: readonly ["observability.rules.custom_threshold"];
export type SuggestedDashboardsValidRuleTypeIds = (typeof SUGGESTED_DASHBOARDS_VALID_RULE_TYPE_IDS)[number];
export declare const isSuggestedDashboardsValidRuleTypeId: (ruleTypeId?: string) => ruleTypeId is SuggestedDashboardsValidRuleTypeIds;
declare const SUGGESTED_DASHBOARDS_VALID_PANEL_TYPES: readonly ["vis"];
export type SuggestedDashboardsValidPanelType = (typeof SUGGESTED_DASHBOARDS_VALID_PANEL_TYPES)[number];
export declare const isSuggestedDashboardsValidPanelType: (type: string) => type is SuggestedDashboardsValidPanelType;
declare const PANEL_TYPE_TO_ATTR: {
    vis: LensSavedObjectAttributes;
};
export type ReferencedPanelAttributes = (typeof PANEL_TYPE_TO_ATTR)[keyof typeof PANEL_TYPE_TO_ATTR];
export type ReferencedPanelAttributesWithReferences = ReferencedPanelAttributes & {
    references: SavedObjectReference[];
};
export {};
