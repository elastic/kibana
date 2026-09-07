/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { z } from '@kbn/zod/v4';
import { SharedPatchProps } from '../../../model/rule_schema';

/**
 * A PATCH rule request body with its type-independent (shared) props validated.
 */
export const SharedPatchRuleRequestBody = SharedPatchProps.loose();
export type SharedPatchRuleRequestBody = z.infer<typeof SharedPatchRuleRequestBody>;
