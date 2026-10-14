/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpHandler } from '@kbn/core/public';
import type { ToolingLog } from '@kbn/tooling-log';
import { configureAlertAnalysisWorkflow } from './space_config';

describe('configureAlertAnalysisWorkflow', () => {
  it('keeps createConversation on so the ai.agent step reports a conversation id for the trace join', async () => {
    const fetch = jest.fn().mockResolvedValue({});
    const log = { info: jest.fn() } as unknown as ToolingLog;

    await configureAlertAnalysisWorkflow({
      fetch: fetch as unknown as HttpHandler,
      log,
      connectorId: 'connector-1',
      agentId: 'agent-1',
    });

    expect(fetch).toHaveBeenCalledTimes(1);
    const body = JSON.parse(fetch.mock.calls[0][1].body);
    expect(body).toEqual(
      expect.objectContaining({
        workflowEnabled: true,
        connectorId: 'connector-1',
        agentId: 'agent-1',
        createConversation: true,
        autoCloseEnabled: false,
      })
    );
  });
});
