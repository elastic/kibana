/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SEVERITY_LEVELS } from '@kbn/alerting-v2-schemas';
import { CLASSIC_ALERT_SOURCE } from '@kbn/nightshift-investigations-plugin/common';
import { ALERT_SEVERITY_VALUES, type AlertSeverity } from '@kbn/rule-data-utils';
import type { CatalogRule } from '../../../../data/rules/use_rule_catalog';
import type { TriggerFormValues } from './automation_form_values';

/** Returns the severity options supported by the selected alert families. */
export const getSupportedAlertSeverities = (
  trigger: Extract<TriggerFormValues, { kind: 'alert' }>,
  catalog?: CatalogRule[]
): readonly AlertSeverity[] => {
  const sources = trigger.alertSources.map((source) => source.trim()).filter(Boolean);
  const allowsClassic =
    sources.length === 0 ||
    sources.includes(CLASSIC_ALERT_SOURCE) === (trigger.alertSourceMode !== 'exclude');
  const allowsUniversal =
    sources.length === 0 ||
    trigger.alertSourceMode === 'exclude' ||
    sources.some((source) => source !== CLASSIC_ALERT_SOURCE);

  // Tags, patterns and incomplete catalogs cannot rule out classic alerts, including future rules.
  const onlyUniversalRules =
    catalog !== undefined &&
    trigger.ruleNames.length > 0 &&
    trigger.ruleTags.length === 0 &&
    !trigger.ruleNamePattern.trim() &&
    trigger.ruleNames.every((name) => {
      const matchingRules = catalog.filter((rule) => rule.name === name);
      return matchingRules.length > 0 && matchingRules.every((rule) => rule.family === 'universal');
    });

  if (!allowsClassic || (allowsUniversal && onlyUniversalRules)) {
    return ALERT_SEVERITY_VALUES.filter((severity) =>
      SEVERITY_LEVELS.some((supported) => supported === severity)
    );
  }
  return ALERT_SEVERITY_VALUES;
};
