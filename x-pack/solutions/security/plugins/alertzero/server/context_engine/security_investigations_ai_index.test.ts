/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ContextEnginePluginSetup } from '@kbn/context-engine-plugin/server';
import { loggerMock } from '@kbn/logging-mocks';
import {
  registerSecurityInvestigationsAiIndex,
  SECURITY_INVESTIGATIONS_AI_INDEX_ID,
  SECURITY_INVESTIGATIONS_AI_INDEX_NAME,
} from './security_investigations_ai_index';

describe('security investigations AI index', () => {
  it('registers a managed index dest the workers already search', () => {
    const registerAiIndex = jest.fn();
    const contextEngine = { registerAiIndex } as unknown as ContextEnginePluginSetup;
    const logger = loggerMock.create();

    registerSecurityInvestigationsAiIndex(contextEngine, logger);

    expect(registerAiIndex).toHaveBeenCalledWith(SECURITY_INVESTIGATIONS_AI_INDEX_ID, {
      description: expect.any(String),
      dest: { type: 'index', value: SECURITY_INVESTIGATIONS_AI_INDEX_NAME },
      automations: [],
      sources: [],
      traces: [],
    });
    expect(SECURITY_INVESTIGATIONS_AI_INDEX_NAME).toBe('ai-index-idx-security-investigations');
  });

  it('skips registration when context engine is not installed', () => {
    const logger = loggerMock.create();

    registerSecurityInvestigationsAiIndex(undefined, logger);

    expect(logger.debug).toHaveBeenCalled();
  });
});
