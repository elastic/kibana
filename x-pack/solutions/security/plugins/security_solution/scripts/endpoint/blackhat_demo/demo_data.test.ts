/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cleanupBlackhatDemoData, DEMO_HOSTS } from './demo_data';
import { FORENSIC_HOSTS } from './forensic_seed_data';

describe('blackhat demo seed hosts', () => {
  it('keeps the forensic kill-chain hosts aligned with the demo overlay', () => {
    expect(DEMO_HOSTS.patientZero).toBe(FORENSIC_HOSTS.patientZero);
    expect(DEMO_HOSTS.domainController).toBe(FORENSIC_HOSTS.domainController);
    expect(DEMO_HOSTS.patientZero).toBe('WKSTN-RECV01');
    expect(DEMO_HOSTS.domainController).toBe('SRV-DC01');
    expect(DEMO_HOSTS.lateralFinance).toBe('WIN-FIN-03');
  });
});

describe('cleanupBlackhatDemoData', () => {
  it('deletes demo hosts from endpoint telemetry, endpoint alerts, and Detection Engine indices', async () => {
    const deleteByQuery = jest.fn().mockResolvedValue({});

    await cleanupBlackhatDemoData({
      esClient: { deleteByQuery } as never,
    });

    const indices = deleteByQuery.mock.calls.map((call: [{ index: string }]) => call[0].index);

    expect(indices).toEqual(
      expect.arrayContaining([
        'logs-endpoint.events.process-default',
        'logs-endpoint.events.file-default',
        'logs-endpoint.events.network-default',
        'logs-endpoint.events.registry-default',
        'logs-endpoint.alerts-default',
        '.alerts-security.alerts-default',
      ])
    );

    const hostQuery = deleteByQuery.mock.calls[0][0].query;
    expect(hostQuery.bool.should).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          terms: {
            'host.name': expect.arrayContaining(['WKSTN-RECV01', 'SRV-DC01', 'WIN-FIN-03']),
          },
        }),
      ])
    );
  });
});
