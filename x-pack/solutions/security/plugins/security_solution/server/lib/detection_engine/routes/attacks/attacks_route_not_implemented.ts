/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, KibanaRequest, KibanaResponseFactory } from '@kbn/core/server';

import { buildSiemResponse } from '../utils';

/**
 * Placeholder handler until attack route implementations land in
 * https://github.com/elastic/security-team/issues/17472
 */
export const attacksRouteNotImplemented = async (
  _context: unknown,
  _request: KibanaRequest,
  response: KibanaResponseFactory
): Promise<IKibanaResponse> => {
  return buildSiemResponse(response).error({
    statusCode: 501,
    body: 'Not Implemented',
  });
};
