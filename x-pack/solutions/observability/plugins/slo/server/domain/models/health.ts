/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { transformHealthSchema } from '@kbn/slo-schema';
import type * as t from 'io-ts';

type TransformHealth = t.OutputOf<typeof transformHealthSchema>;

export type { TransformHealth };
