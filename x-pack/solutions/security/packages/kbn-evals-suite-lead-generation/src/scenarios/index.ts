/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Scenario } from '../types';
import { promotionPrecisionScenario } from './promotion_precision';
import { narrativeQualityScenario } from './narrative_quality';

export const SCENARIOS: Scenario[] = [promotionPrecisionScenario, narrativeQualityScenario];
