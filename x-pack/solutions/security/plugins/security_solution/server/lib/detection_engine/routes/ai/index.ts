/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { SecuritySolutionPluginRouter } from '../../../../types';
import { createAIAssistedRuleRoute } from './create_ai_assisted_rule_route';
import { streamAiAssistedRuleRoute } from './stream_ai_assisted_rule_route';

export const registerAIAssistedRoutes = (router: SecuritySolutionPluginRouter, logger: Logger) => {
  createAIAssistedRuleRoute(router, logger);
  streamAiAssistedRuleRoute(router, logger);
};
