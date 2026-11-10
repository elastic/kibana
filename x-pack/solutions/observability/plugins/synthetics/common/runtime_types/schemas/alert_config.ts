/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod';

export const AlertConfigCodec = lazySchema(() =>
  z.looseObject({
    enabled: z.boolean(),
    groupBy: z.string().optional(),
  })
);

export const AlertConfigsCodec = lazySchema(() =>
  z.looseObject({
    tls: AlertConfigCodec.optional(),
    status: AlertConfigCodec.optional(),
  })
);
