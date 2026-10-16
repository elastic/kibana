/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { asSpaceId } from '@kbn/core-spaces-common';
import type { SpaceId } from '@kbn/core-spaces-common';
import type { StepHandlerContext } from '@kbn/workflows-extensions/server';

/**
 * The space the workflow executes in, as Kibana resolves it.
 *
 * `workflow.spaceId` in the step context can be overridden by a step test's `contextOverride`,
 * so it is not trusted. `callKibanaApi` always prefixes the execution's own space, so the active
 * space it reports is. A `workflow.spaceId` that disagrees is rejected rather than ignored, so
 * the tampering is visible.
 */
export const resolveSpaceId = async (
  contextManager: Pick<StepHandlerContext['contextManager'], 'callKibanaApi' | 'getContext'>
): Promise<SpaceId> => {
  const {
    body: { id },
  } = await contextManager.callKibanaApi<{ id: string }>({
    method: 'GET',
    path: '/internal/spaces/_active_space',
  });

  const spaceId = asSpaceId(id);

  if (contextManager.getContext().workflow.spaceId !== spaceId) {
    throw new Error('workflow.spaceId does not match the execution space');
  }

  return spaceId;
};
