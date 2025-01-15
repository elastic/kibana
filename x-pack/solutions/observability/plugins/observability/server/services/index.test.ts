/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AlertDetailsContextualInsightsHandlerQuery,
  AlertDetailsContextualInsightsRequestContext,
  AlertDetailsContextualInsightsService,
} from '.';

describe('AlertDetailsContextualInsightsService', () => {
  it('concatenates context from registered handlers', async () => {
    const service = new AlertDetailsContextualInsightsService();
    service.registerHandler(async () => [{ key: 'foo', description: 'foo', data: 'hello' }]);
    service.registerHandler(async () => [{ key: 'bar', description: 'bar', data: 'hello' }]);
    const context = await service.getAlertDetailsContext(
      {} as AlertDetailsContextualInsightsRequestContext,
      {} as AlertDetailsContextualInsightsHandlerQuery
    );

    expect(context).toEqual([
      { key: 'foo', description: 'foo', data: 'hello' },
      { key: 'bar', description: 'bar', data: 'hello' },
    ]);
  });
});
