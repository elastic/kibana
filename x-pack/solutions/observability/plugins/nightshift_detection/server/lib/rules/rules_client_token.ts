/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RulesClientApi } from '@kbn/alerting-v2-plugin/server';
import { createToken } from '@kbn/core-di';

/**
 * The Alerting v2 rules client of the scope's space, authenticated as the detection service
 * account. Bound per scope, next to the request it is built from.
 */
export const DetectionRulesClient = createToken<RulesClientApi>(
  'nightshiftDetection.DetectionRulesClient'
);
