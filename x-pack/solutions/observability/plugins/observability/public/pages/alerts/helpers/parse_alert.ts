/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  TIMESTAMP,
  ALERT_START,
  ALERT_STATUS,
  ALERT_STATUS_ACTIVE,
  ALERT_RULE_TYPE_ID,
  ALERT_RULE_NAME,
  ALERT_REASON,
} from '@kbn/rule-data-utils';
import { legacyExperimentalFieldMap } from '@kbn/alerts-as-data-utils';
import { parseTechnicalFields } from '@kbn/rule-registry-plugin/common/parse_technical_fields';
import { parseExperimentalFields } from '@kbn/rule-registry-plugin/common/parse_experimental_fields';
import { asDuration, asPercent } from '../../../../common/utils/formatters';
import { ObservabilityRuleTypeRegistry } from '../../../rules/create_observability_rule_type_registry';
import type { TopAlert } from '../../../typings/alerts';

export const parseAlert =
  (observabilityRuleTypeRegistry: ObservabilityRuleTypeRegistry) =>
  (alert: Record<string, unknown>): TopAlert => {
    const experimentalFields = Object.keys(legacyExperimentalFieldMap);
    const alertWithExperimentalFields = experimentalFields.reduce((acc, key) => {
      if (alert[key]) {
        return { ...acc, [key]: alert[key] };
      }
      return acc;
    }, {});

    const parsedFields = {
      ...parseTechnicalFields(alert, true),
      ...parseExperimentalFields(alertWithExperimentalFields, true),
    };

    const formatter = observabilityRuleTypeRegistry.getFormatter(parsedFields[ALERT_RULE_TYPE_ID]!);
    let formattedFields = {};
    try {
      formattedFields =
        formatter?.({ fields: parsedFields, formatters: { asDuration, asPercent } }) ?? {};
    } catch (error) {
      // Ignore formatted fields if there is a formatting error
    }
    const formatted = {
      link: undefined,
      reason: parsedFields[ALERT_REASON] ?? parsedFields[ALERT_RULE_NAME] ?? '',
      ...formattedFields,
    };

    return {
      ...formatted,
      fields: parsedFields,
      active: parsedFields[ALERT_STATUS] === ALERT_STATUS_ACTIVE,
      start: new Date(parsedFields[ALERT_START] ?? 0).getTime(),
      lastUpdated: new Date(parsedFields[TIMESTAMP] ?? 0).getTime(),
    };
  };
