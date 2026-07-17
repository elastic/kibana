/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FixtureInvestigation } from './types';
// @ts-expect-error JSON import
import data from './data/investigations.json';

export const investigations: FixtureInvestigation[] = data;
