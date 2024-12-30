/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_BUCKETS } from '@kbn/profiling-data-access-plugin/common';
import { ProfilingSetupOptions } from '@kbn/profiling-data-access-plugin/common/setup';

export async function setMaximumBuckets({ client }: ProfilingSetupOptions) {
  await client.getEsClient().cluster.putSettings({
    persistent: {
      search: {
        max_buckets: MAX_BUCKETS,
      },
    },
  });
}

export async function enableResourceManagement({ client }: ProfilingSetupOptions) {
  await client.getEsClient().cluster.putSettings({
    persistent: { xpack: { profiling: { templates: { enabled: true } } } },
  });
}
