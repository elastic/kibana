/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createToolingLogger } from '../../../../common/endpoint/data_loaders/utils';

/**
 * Sets the default log level for `ToolingLog` instances crated via `createToolingLogger()`
 * based on the `TOOLING_LOG_LEVEL` env. variable in the cypress config
 * @param config
 */
export const setupToolingLogLevel = (config: Cypress.PluginConfigOptions) => {
  const log = createToolingLogger();
  const defaultToolingLogLevel = config.env.TOOLING_LOG_LEVEL;

  log.info(`Cypress config 'env.TOOLING_LOG_LEVEL': ${defaultToolingLogLevel}`);

  if (defaultToolingLogLevel && defaultToolingLogLevel !== createToolingLogger.defaultLogLevel) {
    createToolingLogger.defaultLogLevel = defaultToolingLogLevel;
    log.info(`Default log level for 'createToolingLogger()' set to ${defaultToolingLogLevel}`);
  }
};
