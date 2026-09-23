/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginConfigDescriptor } from '@kbn/core/server';
import { schema, type TypeOf } from '@kbn/config-schema';
import type { ExperimentalFeatures } from '../common/experimental_features';

export const configSchema = schema.object({
  enabled: schema.boolean({ defaultValue: false }),
  /**
   * For internal use. A list of string values (comma delimited) that will enable experimental
   * type of functionality that is not yet released. Valid values for this setting need to be
   * defined in `x-pack/solutions/security/plugins/alertzero/common/experimental_features.ts`
   * under the `allowedExperimentalValues` object.
   *
   * @example
   * xpack.alertzero.enableExperimental:
   *   - workerAgentPickerEnabled
   */
  enableExperimental: schema.arrayOf(schema.string(), {
    defaultValue: () => [],
  }),
});

export type AlertZeroConfigSchemaType = TypeOf<typeof configSchema>;

export type AlertZeroConfig = AlertZeroConfigSchemaType & {
  experimentalFeatures: ExperimentalFeatures;
};

export const config: PluginConfigDescriptor<AlertZeroConfigSchemaType> = {
  exposeToBrowser: {
    enabled: true,
    enableExperimental: true,
  },
  schema: configSchema,
};
