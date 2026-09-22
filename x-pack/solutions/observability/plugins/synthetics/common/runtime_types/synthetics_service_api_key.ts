/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SchemaOutput } from './schema_output';
import { SyntheticsServiceApiKeyType, SyntheticsServiceApiKeySaveType } from './zod/settings';

export { SyntheticsServiceApiKeyType, SyntheticsServiceApiKeySaveType };

export type SyntheticsServiceApiKey = SchemaOutput<typeof SyntheticsServiceApiKeyType>;
export type SyntheticsServiceApiKeySaveResponse = SchemaOutput<
  typeof SyntheticsServiceApiKeySaveType
>;
