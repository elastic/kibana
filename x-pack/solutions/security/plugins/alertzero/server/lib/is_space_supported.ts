/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';

interface IsSpaceSupportedParams {
  isServerless: boolean;
  spaces: SpacesPluginStart | undefined;
  request: KibanaRequest;
}

/**
 * AlertZero belongs to the Security solution, so only a space with the Security solution view can
 * reach it, even when the advanced setting is on. A space without a solution is a Classic space.
 *
 * Serverless projects have no spaces with a solution view, so the check does not apply there. When the active
 * space cannot be read, the answer is `false`: no access is the safe default.
 */
export const isSpaceSupported = async ({
  isServerless,
  spaces,
  request,
}: IsSpaceSupportedParams): Promise<boolean> => {
  if (isServerless) {
    return true;
  }
  if (!spaces) {
    return false;
  }
  try {
    const { solution } = await spaces.spacesService.getActiveSpace(request);
    return solution === 'security';
  } catch {
    return false;
  }
};
