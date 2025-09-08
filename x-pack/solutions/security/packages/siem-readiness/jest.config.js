/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

<<<<<<<< HEAD:x-pack/platform/plugins/shared/alerting/server/saved_objects/schemas/raw_rule_template/index.ts
import type { TypeOf } from '@kbn/config-schema';

import { rawRuleTemplateSchema } from './v1';

export { rawRuleTemplateSchema as rawRuleTemplateSchemaV1 };
export type RawRuleTemplate = TypeOf<typeof rawRuleTemplateSchema>;
========
module.exports = {
  preset: '@kbn/test',
  rootDir: '../../../../..',
  roots: ['<rootDir>/x-pack/solutions/security/packages/siem-readiness'],
};
>>>>>>>> main:x-pack/solutions/security/packages/siem-readiness/jest.config.js
