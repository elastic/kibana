/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { createListSandboxConnectors } from './list_sandbox_connectors';

const connector = (
  id: string,
  { isPreconfigured = true, actionTypeId = '.http' } = {}
): { id: string; name: string; actionTypeId: string; isPreconfigured: boolean } => ({
  id,
  name: `Connector ${id}`,
  actionTypeId,
  isPreconfigured,
});

const setup = ({
  connectors = [] as ReturnType<typeof connector>[],
  disabledIds = [] as string[],
  getAll = jest.fn().mockResolvedValue(connectors),
}: {
  connectors?: ReturnType<typeof connector>[];
  disabledIds?: string[];
  getAll?: jest.Mock;
} = {}) => {
  const logger = loggerMock.create();
  const actions = {
    getActionsClientWithRequest: jest.fn().mockResolvedValue({ getAll }),
  };
  const getDisabledConnectorIds = jest.fn().mockResolvedValue(disabledIds);
  const listSandboxConnectors = createListSandboxConnectors({
    getActions: () => actions as never,
    getDisabledConnectorIds,
    logger,
  });
  return { listSandboxConnectors, getAll, logger, request: httpServerMock.createKibanaRequest() };
};

describe('createListSandboxConnectors', () => {
  it('lists sandbox-capable connectors in the public connector shape', async () => {
    const { listSandboxConnectors, getAll, request } = setup({
      connectors: [connector('telemetry'), connector('github')],
    });

    await expect(listSandboxConnectors(request)).resolves.toEqual([
      {
        id: 'telemetry',
        name: 'Connector telemetry',
        connector_type_id: '.http',
        is_preconfigured: true,
        enabled: true,
      },
      {
        id: 'github',
        name: 'Connector github',
        connector_type_id: '.http',
        is_preconfigured: true,
        enabled: true,
      },
    ]);
    // The actions plugin decides sandbox capability; the lister only asks for capable ones.
    expect(getAll).toHaveBeenCalledWith({ includeSystemActions: false, sandboxCapableOnly: true });
  });

  it('lists saved connectors next to preconfigured ones', async () => {
    const { listSandboxConnectors, request } = setup({
      connectors: [connector('saved', { isPreconfigured: false }), connector('preconfigured')],
    });

    await expect(listSandboxConnectors(request)).resolves.toEqual([
      expect.objectContaining({ id: 'saved', is_preconfigured: false }),
      expect.objectContaining({ id: 'preconfigured', is_preconfigured: true }),
    ]);
  });

  it('marks the connectors an admin switched off', async () => {
    const { listSandboxConnectors, request } = setup({
      connectors: [connector('telemetry'), connector('github', { isPreconfigured: false })],
      disabledIds: ['github', 'gone'],
    });

    await expect(listSandboxConnectors(request)).resolves.toEqual([
      expect.objectContaining({ id: 'telemetry', enabled: true }),
      expect.objectContaining({ id: 'github', enabled: false }),
    ]);
  });

  it('returns no connectors when the actions plugin is not available', async () => {
    const logger = loggerMock.create();
    const listSandboxConnectors = createListSandboxConnectors({
      getActions: () => undefined,
      getDisabledConnectorIds: jest.fn().mockResolvedValue([]),
      logger,
    });

    await expect(listSandboxConnectors(httpServerMock.createKibanaRequest())).resolves.toEqual([]);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('returns no connectors and warns when listing fails', async () => {
    const { listSandboxConnectors, logger, request } = setup({
      getAll: jest.fn().mockRejectedValue(new Error('boom')),
    });

    await expect(listSandboxConnectors(request)).resolves.toEqual([]);
    expect(logger.warn).toHaveBeenCalledWith('Failed to list sandbox connectors: boom');
  });
});
