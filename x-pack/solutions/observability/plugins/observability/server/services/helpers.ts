/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectReference } from '@kbn/core/server';
import { OBSERVABILITY_THRESHOLD_RULE_TYPE_ID } from '@kbn/rule-data-utils';
import type { LensSavedObjectAttributes } from '@kbn/lens-plugin/public';
import { LENS_CONTENT_TYPE } from '@kbn/lens-common/content_management/constants';

const SUGGESTED_DASHBOARDS_VALID_RULE_TYPE_IDS = [OBSERVABILITY_THRESHOLD_RULE_TYPE_ID] as const;

export type SuggestedDashboardsValidRuleTypeIds =
  (typeof SUGGESTED_DASHBOARDS_VALID_RULE_TYPE_IDS)[number];

export const isSuggestedDashboardsValidRuleTypeId = (
  ruleTypeId?: string
): ruleTypeId is SuggestedDashboardsValidRuleTypeIds => {
  return (
    ruleTypeId !== undefined &&
    Object.values<string>(SUGGESTED_DASHBOARDS_VALID_RULE_TYPE_IDS).includes(ruleTypeId)
  );
};

// When adding a new panel type TS will make sure we update ReferencedPanelAttributes, getPanelIndicesMap and getPanelFieldsMap
const SUGGESTED_DASHBOARDS_VALID_PANEL_TYPES = [LENS_CONTENT_TYPE] as const;

export type SuggestedDashboardsValidPanelType =
  (typeof SUGGESTED_DASHBOARDS_VALID_PANEL_TYPES)[number];

export const isSuggestedDashboardsValidPanelType = (
  type: string
): type is SuggestedDashboardsValidPanelType => {
  return Object.values<string>(SUGGESTED_DASHBOARDS_VALID_PANEL_TYPES).includes(type);
};

const PANEL_TYPE_TO_ATTR = {
  lens: {} as LensSavedObjectAttributes,
} satisfies Record<SuggestedDashboardsValidPanelType, unknown>;

export type ReferencedPanelAttributes =
  (typeof PANEL_TYPE_TO_ATTR)[keyof typeof PANEL_TYPE_TO_ATTR];

export type ReferencedPanelAttributesWithReferences = ReferencedPanelAttributes & {
  references: SavedObjectReference[];
};
