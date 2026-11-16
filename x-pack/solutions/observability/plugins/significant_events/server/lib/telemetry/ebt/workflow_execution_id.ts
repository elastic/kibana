/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { getEventChainContext } from '@kbn/workflows-extensions/server';

/** Workflow run that invoked the current code, read from the engine's in-process request stamp or its `kibana.request` headers. */
export const getWorkflowExecutionIdFromRequest = (request: KibanaRequest): string | undefined =>
  getEventChainContext(request)?.sourceExecutionId;
