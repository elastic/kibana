/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Logger } from '@kbn/core/server';
import { APMTracer } from '@kbn/langchain/server/tracers/apm';
import { getLangSmithTracer } from '@kbn/langchain/server/tracers/langsmith';
import type { Callbacks } from '@langchain/core/callbacks/manager';
import type { LangSmithOptions } from '../../../../../../common/siem_migrations/model/common.gen';

export const createTracersCallbacks = (
  langsmithOptions: LangSmithOptions | undefined,
  logger: Logger
): Callbacks => {
  const { api_key: apiKey, project_name: projectName = 'default' } = langsmithOptions ?? {};
  const callbacks: Callbacks = [new APMTracer({ projectName }, logger)];
  if (langsmithOptions) {
    callbacks.push(...getLangSmithTracer({ apiKey, projectName, logger }));
  }
  return callbacks;
};
