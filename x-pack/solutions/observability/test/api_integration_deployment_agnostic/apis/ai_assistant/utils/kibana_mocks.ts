/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Client } from '@elastic/elasticsearch';
import { CoreSetup } from '@kbn/core/server';
import { Logger } from '@kbn/logging';
import { ObservabilityAIAssistantConfig } from '@kbn/observability-ai-assistant-plugin/server/config';
import { ObservabilityAIAssistantPluginStartDependencies } from '@kbn/observability-ai-assistant-plugin/server/types';
import { ToolingLog } from '@kbn/tooling-log';

export function getLoggerMock(toolingLog: ToolingLog) {
  return {
    debug: (...args: any[]) => toolingLog.debug(...args),
    error: (errorOrMessage: Error) => toolingLog.error(errorOrMessage),
    info: (...args: any[]) => toolingLog.info(...args),
    warn: (...args: any[]) => toolingLog.warning(...args),
    fatal: (...args: any[]) => toolingLog.warning(...args),
    trace: (...args: any[]) => toolingLog.debug(...args),
    get: () => getLoggerMock(toolingLog),
  } as unknown as Logger;
}

export function getCoreMock(es: Client) {
  return {
    getStartServices: async () => [{ elasticsearch: { client: { asInternalUser: es } } }],
  } as unknown as CoreSetup<ObservabilityAIAssistantPluginStartDependencies>;
}

export function getConfigMock(config: Partial<ObservabilityAIAssistantConfig>) {
  return {
    enableKnowledgeBase: true,
    ...config,
  } as ObservabilityAIAssistantConfig;
}
