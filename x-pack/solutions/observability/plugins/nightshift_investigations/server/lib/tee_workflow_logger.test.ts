/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { teeWorkflowLogger } from './tee_workflow_logger';

describe('teeWorkflowLogger', () => {
  it('keeps debug details out of persistent workflow logs', () => {
    const pluginLogger = loggerMock.create();
    const workflowLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };
    const logger = teeWorkflowLogger(pluginLogger, workflowLogger as never);

    logger.debug('customer-derived page id');
    logger.info('aggregate operation count');

    expect(pluginLogger.debug).toHaveBeenCalledWith('customer-derived page id');
    expect(workflowLogger.debug).not.toHaveBeenCalled();
    expect(workflowLogger.info).toHaveBeenCalledWith('aggregate operation count');
  });
});
