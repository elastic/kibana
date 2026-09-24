/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializerContext, Logger } from '@kbn/core/server';
import type { AlertZeroConfig, AlertZeroConfigSchemaType } from './config';
import { parseExperimentalConfigValue } from '../common/experimental_features';

export const createConfig = (
  context: PluginInitializerContext,
  logger: Logger = context.logger.get('config')
): Readonly<AlertZeroConfig> => {
  const pluginConfig = context.config.get<AlertZeroConfigSchemaType>();

  const { invalid, features: experimentalFeatures } = parseExperimentalConfigValue(
    pluginConfig.enableExperimental
  );

  if (invalid.length) {
    logger.warn(`Unsupported "xpack.alertzero.enableExperimental" values detected.
The following configuration values are not supported and should be removed from the configuration:

    xpack.alertzero.enableExperimental:
${invalid.map((key) => `      - ${key}`).join('\n')}
`);
  }

  return {
    ...pluginConfig,
    experimentalFeatures,
  };
};
