/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FieldMap } from '@kbn/index-adapter';
import { mitreAttackFieldMap as commonFieldMap } from '@kbn/security-mitre-attack-common';

/**
 * Re-export the shared field map cast to the `FieldMap` type from
 * `@kbn/index-adapter`. The shared package keeps the field map flat and
 * dependency-free so it can be imported from anywhere; this module is the only
 * spot that reaches into the index-adapter type system.
 */
export const mitreAttackFieldMap: FieldMap = commonFieldMap as unknown as FieldMap;
