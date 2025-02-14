/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sloHealthSchema } from '@kbn/slo-schema';
import * as t from 'io-ts';

type SLOHealth = t.TypeOf<typeof sloHealthSchema>;

export type { SLOHealth };
