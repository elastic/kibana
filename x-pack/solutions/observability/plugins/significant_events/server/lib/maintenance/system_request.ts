/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FakeRawRequest, KibanaRequest } from '@kbn/core/server';
import { kibanaRequestFactory } from '@kbn/core-http-server-utils';
import { asSpaceId, DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';

/**
 * Synthetic request for maintenance control-plane work that runs outside a
 * user HTTP handler (e.g. re-asserting pause after a feature-flag workflow install).
 */
export const createMaintenanceSystemRequest = (): KibanaRequest => {
  const fakeRawRequest: FakeRawRequest = {
    headers: {},
    spaceId: asSpaceId(DEFAULT_SPACE_ID),
  };
  return kibanaRequestFactory(fakeRawRequest);
};
