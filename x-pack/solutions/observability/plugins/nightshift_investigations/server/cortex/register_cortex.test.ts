/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { NIGHTSHIFT_INVESTIGATION_AGENT_ID } from '../agents/investigation';
import { runCortexOptimize } from './register_cortex';
import { createLlmProposeCortexEdits, optimizeCortex } from './optimize';

jest.mock('./optimize', () => ({
  createLlmProposeCortexEdits: jest.fn(() => jest.fn()),
  optimizeCortex: jest.fn(),
}));

jest.mock('./page_store', () => ({
  createCortexPageStore: jest.fn(() => ({})),
}));

describe('runCortexOptimize', () => {
  const esClient = { search: jest.fn() } as never;
  const request = { headers: {} } as never;
  const inferenceClient = { output: jest.fn() };
  const createModelProvider = jest.fn();
  const getAgentBuilder = jest.fn().mockReturnValue({
    runtime: { createModelProvider },
  });

  const run = (agentId?: string, connectorId?: string) =>
    runCortexOptimize({
      request,
      agentId,
      userMessage: 'why?',
      assistantMessage: 'redis',
      esClient,
      spaceId: 'default',
      getAgentBuilder,
      logger: loggerMock.create(),
      connectorId,
    });

  beforeEach(() => {
    jest.clearAllMocks();
    createModelProvider.mockReturnValue({
      getDefaultModel: jest.fn().mockResolvedValue({
        inferenceClient,
        connector: { connectorId: 'connector-1' },
      }),
    });
    getAgentBuilder.mockReturnValue({ runtime: { createModelProvider } });
  });

  it('runs for the Nightshift investigation agent', async () => {
    await run(NIGHTSHIFT_INVESTIGATION_AGENT_ID);
    expect(optimizeCortex).toHaveBeenCalled();
  });

  it('skips another agent', async () => {
    await run('other-agent');
    expect(optimizeCortex).not.toHaveBeenCalled();
  });

  // The optimize workflow has a manual trigger, so it can be invoked without an agent id. Writing
  // to the wiki on behalf of an unidentified caller is worse than not writing at all.
  it('skips a round with no agent_id rather than trusting it', async () => {
    await run(undefined);
    await run('');
    expect(optimizeCortex).not.toHaveBeenCalled();
  });

  it('skips a different agent', async () => {
    await run('some-other-agent');
    expect(optimizeCortex).not.toHaveBeenCalled();
  });

  it('inherits the triggering agent connector via createModelProvider', async () => {
    await run(NIGHTSHIFT_DEDUCTIVE_INVESTIGATION_AGENT_ID, 'anthropic-sonnet');

    expect(createModelProvider).toHaveBeenCalledWith({
      request,
      defaultConnectorId: 'anthropic-sonnet',
    });
    expect(createLlmProposeCortexEdits).toHaveBeenCalledWith({ inferenceClient });
    expect(optimizeCortex).toHaveBeenCalled();
  });
});
