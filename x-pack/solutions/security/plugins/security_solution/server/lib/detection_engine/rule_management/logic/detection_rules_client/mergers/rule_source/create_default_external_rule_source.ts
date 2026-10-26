/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExternalRuleSource } from '../../../../../../../../common/api/detection_engine/model/rule_schema';

export const createDefaultExternalRuleSource = (): ExternalRuleSource => ({
  type: 'external',
  is_customized: false,
  customized_fields: [],
  has_base_version: true,
});
