/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client as EsClient } from '@elastic/elasticsearch';
import type { HttpHandler } from '@kbn/core/public';
import { seedAttackDiscoveryFixtures } from './fixtures';

interface SeededAlert {
  kibana: { alert: { rule: { name: string; uuid: string } } };
  process: { name: string; entity_id?: string; parent?: { name: string; entity_id: string } };
}

const seedAndCollect = async (): Promise<SeededAlert[]> => {
  const bulk = jest.fn().mockResolvedValue({ errors: false, items: [] });
  const esClient = { bulk } as unknown as EsClient;
  const fetch = jest.fn().mockResolvedValue({}) as unknown as HttpHandler;

  await seedAttackDiscoveryFixtures(esClient, fetch);

  const [{ operations }] = bulk.mock.calls[0];
  return (operations as Array<Record<string, unknown>>).filter(
    (_operation, index) => index % 2 === 1
  ) as unknown as SeededAlert[];
};

describe('seedAttackDiscoveryFixtures', () => {
  // The skill requires an attack chain to span more than one rule. Alerts from
  // two differently named rules that share one rule uuid read as a single rule
  // by id, so the seeded chain must carry a distinct rule identity per alert.
  it('seeds each alert under its own rule uuid', async () => {
    const alerts = await seedAndCollect();
    const ruleUuids = new Set(alerts.map(({ kibana }) => kibana.alert.rule.uuid));

    expect(alerts).toHaveLength(2);
    expect(ruleUuids.size).toBe(alerts.length);
  });

  it('keeps rule names and rule uuids one-to-one', async () => {
    const alerts = await seedAndCollect();
    const ruleNames = new Set(alerts.map(({ kibana }) => kibana.alert.rule.name));

    expect(ruleNames.size).toBe(alerts.length);
  });

  it('links the LSASS access to the encoded PowerShell process as its child', async () => {
    const [powershell, lsass] = await seedAndCollect();

    expect(lsass.process.parent).toEqual(
      expect.objectContaining({
        name: powershell.process.name,
        entity_id: powershell.process.entity_id,
      })
    );
  });
});
