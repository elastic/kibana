/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_RULE_CONSUMER, ALERT_RULE_TYPE, ALERT_RULE_TYPE_ID } from '@kbn/rule-data-utils';
import { ruleTypeMappings } from '@kbn/securitysolution-rules';

export const createMappingsFor818Compatibility = () => ({
  runtime: {
    [ALERT_RULE_CONSUMER]: {
      type: 'keyword',
      script: { source: "emit('siem')" },
    },
    [ALERT_RULE_TYPE_ID]: {
      type: 'keyword',
      script: { source: mapRuleTypeToRuleTypeIdScript(ruleTypeMappings) },
    },
  },
});

const mapRuleTypeToRuleTypeIdScript = (ruleTypeToRuleTypeIdMap: Record<string, string>): string => `
  String rule_type = doc['${ALERT_RULE_TYPE}'].value;
  ${Object.entries(ruleTypeToRuleTypeIdMap)
    .map(
      ([ruleType, ruleTypeId]) => `if (rule_type == '${ruleType}') return emit('${ruleTypeId}');`
    )
    .join('')}`;
