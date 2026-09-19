/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MakeSchemaFrom } from '@kbn/usage-collection-plugin/server';
import type { RuleBaseVersionCounts } from '../types';

export const ruleBaseVersionStatusSchema: MakeSchemaFrom<RuleBaseVersionCounts> = {
  customized_with_base_version: {
    type: 'long',
    _meta: {
      description: 'The number of customized prebuilt rules that still have a base version',
    },
  },
  customized_without_base_version: {
    type: 'long',
    _meta: {
      description: 'The number of customized prebuilt rules that no longer have a base version',
    },
  },
  noncustomized_with_base_version: {
    type: 'long',
    _meta: {
      description: 'The number of non-customized prebuilt rules that still have a base version',
    },
  },
  noncustomized_without_base_version: {
    type: 'long',
    _meta: {
      description: 'The number of non-customized prebuilt rules that no longer have a base version',
    },
  },
};
