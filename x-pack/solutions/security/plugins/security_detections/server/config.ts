/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { TypeOf } from '@kbn/config-schema';

export const configSchema = schema.object({
  /**
   * Enables the Detection Engine v2 routes, builder type registrations, and UI
   * page. Requires a Kibana restart to take effect. Off by default; enable in
   * kibana.dev.yml or kibana.yml for local development and testing.
   *
   * @example
   * xpack.securityDetections.enableDetectionsOnV2: true
   */
  enableDetectionsOnV2: schema.boolean({ defaultValue: false }),
});

export type ConfigType = TypeOf<typeof configSchema>;
