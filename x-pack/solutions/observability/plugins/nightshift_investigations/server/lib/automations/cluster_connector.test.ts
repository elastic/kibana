/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resolveClusterConnector } from './cluster_connector';
import type { NightshiftTriggerRow } from './types';

const getConnector = jest.fn();
const actionsClient = { get: getConnector };

const alertRow = (extra: object = {}): NightshiftTriggerRow => ({
  kind: 'webhook',
  mode: 'alert',
  connectorId: 'hook-1',
  ...extra,
});

beforeEach(() => {
  getConnector.mockReset();
});

describe('resolveClusterConnector', () => {
  it('records the name of an External Elasticsearch connector on an alert-mode webhook', async () => {
    getConnector.mockResolvedValue({ name: 'Cluster A', actionTypeId: '.elasticsearch' });
    const rows = await resolveClusterConnector(actionsClient, [
      alertRow({ clusterConnectorId: 'es-1', clusterConnectorName: 'old name' }),
    ]);
    expect(getConnector).toHaveBeenCalledWith({ id: 'es-1' });
    expect(rows).toEqual([
      alertRow({ clusterConnectorId: 'es-1', clusterConnectorName: 'Cluster A' }),
    ]);
  });

  it('rejects a connector that does not exist', async () => {
    getConnector.mockRejectedValue(new Error('Saved object not found'));
    await expect(
      resolveClusterConnector(actionsClient, [alertRow({ clusterConnectorId: 'missing' })])
    ).rejects.toThrow('Cluster connector missing not found');
  });

  it('rejects a connector of another type', async () => {
    getConnector.mockResolvedValue({ name: 'Slack', actionTypeId: '.slack' });
    await expect(
      resolveClusterConnector(actionsClient, [alertRow({ clusterConnectorId: 'slack-1' })])
    ).rejects.toThrow('must be an External Elasticsearch connector');
  });

  it('drops the cluster from a webhook that is not in alert mode, without calling actions', async () => {
    const rows = await resolveClusterConnector(actionsClient, [
      alertRow({ mode: 'generic', clusterConnectorId: 'es-1', clusterConnectorName: 'Cluster A' }),
    ]);
    expect(rows).toEqual([alertRow({ mode: 'generic' })]);
    expect(getConnector).not.toHaveBeenCalled();
  });

  it('leaves other triggers and a cluster-less alert webhook alone', async () => {
    const schedule: NightshiftTriggerRow = {
      kind: 'schedule',
      schedulePreset: 'daily',
      time: '09:00',
    };
    const rows = await resolveClusterConnector(actionsClient, [schedule, alertRow()]);
    expect(rows).toEqual([schedule, alertRow()]);
    expect(getConnector).not.toHaveBeenCalled();
  });

  it('needs the actions client only when a cluster connector is named', async () => {
    await expect(resolveClusterConnector(undefined, [alertRow()])).resolves.toEqual([alertRow()]);
    await expect(
      resolveClusterConnector(undefined, [alertRow({ clusterConnectorId: 'es-1' })])
    ).rejects.toThrow('Actions is not available');
  });
});
