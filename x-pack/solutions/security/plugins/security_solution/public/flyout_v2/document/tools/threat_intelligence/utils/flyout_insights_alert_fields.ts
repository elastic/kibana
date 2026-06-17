/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataTableRecord } from '@kbn/discover-utils';
import { getFieldValue } from '@kbn/discover-utils';
import type { FlyoutInsightsRequest } from '../../../../../../common/threat_intelligence/hub';

const asStringArray = (value: unknown): string[] => {
  if (value == null) {
    return [];
  }
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string' && item.length > 0);
  }
  return typeof value === 'string' && value.length > 0 ? [value] : [];
};

const firstString = (value: unknown): string | undefined => {
  const [first] = asStringArray(value);
  return first;
};

/**
 * Builds the flyout insights API body from alert document fields.
 */
export const buildFlyoutInsightsRequest = (hit: DataTableRecord): FlyoutInsightsRequest => {
  const techniqueIds = [
    ...asStringArray(hit.flattened['kibana.alert.rule.threat.technique.id']),
    ...asStringArray(hit.flattened['kibana.alert.rule.threat.technique.subtechnique.id']),
  ];

  return {
    alert_id: hit.raw._id ?? hit.id,
    rule_type: firstString(hit.flattened['kibana.alert.rule.type']),
    indicator_reference: firstString(hit.flattened['kibana.alert.threat.indicator.reference']),
    technique_ids: [...new Set(techniqueIds)],
  };
};

/**
 * Returns true when the document is a Detection Engine alert.
 */
export const isSecurityAlert = (hit: DataTableRecord): boolean =>
  getFieldValue(hit, 'kibana.alert.rule.uuid') != null;
