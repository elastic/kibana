/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { createToken } from '@kbn/core-di';

/**
 * The engine's own Elasticsearch client: `asInternalUser` (the kibana_system user). Every read
 * and write on `.nightshift-detection_engine-*` goes through it, so the indices stay writable
 * without giving the detection service account any privilege on them.
 *
 * No service takes a client from `core` directly; it asks for this token or for
 * {@link DetectionEngineDataClient}.
 */
export const DetectionEngineSystemClient = createToken<ElasticsearchClient>(
  'nightshiftDetection.EngineSystemClient'
);

/**
 * Request-scoped client authenticated as the space's detection service account. Generators read
 * customer data with it, and it is the only client that touches customer indices.
 *
 * Bound per tick, when the tick route builds the request scope; it is unbound until then.
 */
export const DetectionEngineDataClient = createToken<ElasticsearchClient>(
  'nightshiftDetection.EngineDataClient'
);
