/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OriginalRule } from '../../../../../../common/siem_migrations/model/rule_migration.gen';
import type { QradarRule } from '../../../../../../common/siem_migrations/parsers/qradar/types';

/**
 * Transforms a QRadar rule from the parsed XML to the OriginalRule format.
 * The rule_data field contains base64 encoded XML which is decoded and stored in the query field.
 */
export function transformQRadarRuleToOriginalRule(qradarRule: QradarRule): OriginalRule {
  // xml2js returns arrays for elements, so we need to access the first element
  const id = Array.isArray(qradarRule.id) ? qradarRule.id[0] : qradarRule.id;
  const ruleData = Array.isArray(qradarRule.rule_data)
    ? qradarRule.rule_data[0]
    : qradarRule.rule_data;

  if (!id) {
    throw new Error('QRadar rule is missing required field: id');
  }

  if (!ruleData) {
    throw new Error('QRadar rule is missing required field: rule_data');
  }

  const originalRule: OriginalRule = {
    id,
    vendor: 'qradar',
    title: qradarRule.title,
    description: qradarRule.description, // QRadar rules may not have a description field in the export
    query: qradarRule.rule_data, // Store the decoded XML in the query field
    query_language: 'xml',
  };

  return originalRule;
}
