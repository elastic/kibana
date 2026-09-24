/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { createMemoryStore } from './register_memory';

describe('createMemoryStore', () => {
  it('rejects unsupported agents at the Semantic Memory service boundary', () => {
    expect(() =>
      createMemoryStore({
        esClient: {} as never,
        logger: loggerMock.create(),
        spaceId: 'default',
        agentId: 'another-agent',
      })
    ).toThrow('Semantic Memory is only available to the Nightshift deductive investigator');
  });
});
