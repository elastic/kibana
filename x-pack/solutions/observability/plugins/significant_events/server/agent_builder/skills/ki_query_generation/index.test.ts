/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { SIGNIFICANT_EVENTS_GET_FEATURES_TOOL_ID } from './get_features/tool';
import { SIGNIFICANT_EVENTS_VALIDATE_QUERIES_TOOL_ID } from './validate_queries/tool';
import { createKIQueryGenerationSkill } from '.';

describe('createKIQueryGenerationSkill', () => {
  it('returns query-generation tools as inline tools', () => {
    const skill = createKIQueryGenerationSkill({
      getScopedClients: jest.fn(),
      logger: loggerMock.create(),
    });

    expect(skill.getInlineTools?.()).toEqual([
      expect.objectContaining({ id: SIGNIFICANT_EVENTS_GET_FEATURES_TOOL_ID }),
      expect.objectContaining({ id: SIGNIFICANT_EVENTS_VALIDATE_QUERIES_TOOL_ID }),
    ]);
    expect(skill.getRegistryTools).toBeUndefined();
  });
});
