/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SLOError,
  SLOIdConflict,
  SLONotFound,
  SLOOperationTimeout,
  SLOTemplateNotFound,
  SecurityException,
} from '../../errors';
import { handleSLOError } from './create_slo_server_route';

describe('handleSLOError', () => {
  it.each([
    [new SLONotFound('not found'), 404],
    [new SLOTemplateNotFound('template not found'), 404],
    [new SLOIdConflict('conflict'), 409],
    [new SecurityException('forbidden'), 403],
    [new SLOOperationTimeout('timeout'), 503],
    [new SLOError('bad request'), 400],
  ])('maps %p to a %p response', (error, statusCode) => {
    const boom = handleSLOError(error);

    expect(boom.output.statusCode).toBe(statusCode);
    expect(boom.message).toBe(error.message);
  });
});
