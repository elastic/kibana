/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CreateRulesSchema } from '@kbn/security-solution-plugin/common/detection_engine/schemas/request';

/**
 * Given a rule this will convert it to an ndjson buffer which is useful for
 * testing upload features.
 * @param rule The rule to convert to ndjson
 */
export const ruleToNdjson = (rule: CreateRulesSchema): Buffer => {
  const stringified = JSON.stringify(rule);
  return Buffer.from(`${stringified}\n`);
};
