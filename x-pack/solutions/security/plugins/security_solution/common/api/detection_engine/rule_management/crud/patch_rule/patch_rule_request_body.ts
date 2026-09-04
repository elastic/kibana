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
 *
 * The body cannot be validated against the `RulePatchProps` union at the route boundary:
 * `type` is optional in PATCH bodies, so a typeless body matches the union's first branch
 * (EQL) and strip-mode parsing silently drops the actual rule type's fields (e.g.
 * `threshold`). Type-specific fields are therefore preserved unvalidated here and validated
 * by `patchTypeSpecificParams` once the existing rule - and so its type - is known.
 */
export const SharedPatchRuleRequestBody = SharedPatchProps.loose();
export type SharedPatchRuleRequestBody = z.infer<typeof SharedPatchRuleRequestBody>;
