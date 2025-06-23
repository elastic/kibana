/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, type TypeOf } from '@kbn/config-schema';
import type { PluginConfigDescriptor, PluginInitializerContext } from '@kbn/core/server';
import type { SecuritySolutionPluginSetup } from '@kbn/security-solution-plugin/server/plugin_contract';

import { commonConfigSchema, exposeToBrowser } from '../common/config';
import type { ExperimentalFeatures } from '../common/experimental_features';
import { parseExperimentalConfigValue } from '../common/experimental_features';
import { METERING_TASK as ENDPOINT_METERING_TASK } from './endpoint/constants/metering';
import { METERING_TASK as AI4SOC_METERING_TASK } from './ai4soc/constants/metering';

const tlsConfig = schema.object({
  certificate: schema.string(),
  key: schema.string(),
  ca: schema.string(),
});
export type TlsConfigSchema = TypeOf<typeof tlsConfig>;

const usageApiConfig = schema.object({
  enabled: schema.boolean({ defaultValue: false }),
  url: schema.maybe(schema.string()),
  tls: schema.maybe(tlsConfig),
});
export type UsageApiConfigSchema = TypeOf<typeof usageApiConfig>;

export const serverConfigSchema = schema.object({
  enabled: schema.boolean({ defaultValue: false }),
  /**
   * Usage Reporting: the interval between runs of the endpoint task
   */

  usageReportingTaskInterval: schema.string({ defaultValue: ENDPOINT_METERING_TASK.INTERVAL }),

  /**
   * Usage Reporting: the interval between runs of the cloud security task
   */
  cloudSecurityUsageReportingTaskInterval: schema.string({ defaultValue: '30m' }),

  /**
   * Usage Reporting: the interval between runs of the ai4soc metering task
   */

  ai4SocUsageReportingTaskInterval: schema.string({ defaultValue: AI4SOC_METERING_TASK.INTERVAL }),

  /**
   * Usage Reporting: timeout value for how long the task should run.
   */
  usageReportingTaskTimeout: schema.string({ defaultValue: '1m' }),

  usageApi: usageApiConfig,
});
const configSchema = schema.allOf([commonConfigSchema, serverConfigSchema]);

export type ServerlessSecuritySchema = TypeOf<typeof configSchema>;

export const config: PluginConfigDescriptor<ServerlessSecuritySchema> = {
  exposeToBrowser,
  schema: configSchema,
  deprecations: ({ renameFromRoot }) => [
    renameFromRoot(
      'xpack.serverless.security.productTypes',
      'xpack.securitySolutionServerless.productTypes',
      { silent: true, level: 'warning' }
    ),
  ],
};

export type ServerlessSecurityConfig = Omit<ServerlessSecuritySchema, 'enableExperimental'> & {
  experimentalFeatures: ExperimentalFeatures;
};

export const createConfig = (
  context: PluginInitializerContext,
  securitySolution: SecuritySolutionPluginSetup
): ServerlessSecurityConfig => {
  const { enableExperimental, ...pluginConfig } = context.config.get<ServerlessSecuritySchema>();
  const logger = context.logger.get('config');

  const {
    invalid,
    duplicated,
    features: experimentalFeatures,
  } = parseExperimentalConfigValue(enableExperimental, securitySolution.experimentalFeatures);

  if (invalid.length) {
    logger.warn(`Unsupported "xpack.securitySolutionServerless.enableExperimental" values detected.
The following configuration values are not supported and should be removed from the configuration:

    xpack.securitySolutionServerless.enableExperimental:
${invalid.map((key) => `      - ${key}`).join('\n')}
`);
  }

  if (duplicated.length) {
    logger.warn(`Duplicated "xpack.securitySolutionServerless.enableExperimental" values detected.
The following configuration values are should only be defined using the generic "xpack.securitySolution.enableExperimental":

    xpack.securitySolutionServerless.enableExperimental:
${duplicated.map((key) => `      - ${key}`).join('\n')}
`);
  }

  return {
    ...pluginConfig,
    experimentalFeatures,
  };
};
