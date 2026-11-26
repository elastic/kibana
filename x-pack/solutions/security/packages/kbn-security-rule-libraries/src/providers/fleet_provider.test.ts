/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { PackageClient } from '@kbn/fleet-plugin/server';
import { FleetProvider } from './fleet_provider';

const rulePath = (name: string) =>
  `security_detection_engine-9.6.2/kibana/security_rule/${name}.json`;

const entry = (name: string, ruleId: string, version: number) => ({
  path: rulePath(name),
  buffer: Buffer.from(
    JSON.stringify({ type: 'security-rule', attributes: { rule_id: ruleId, version, name } })
  ),
});

describe('FleetProvider', () => {
  const entries = [
    entry('a_1', 'a', 1),
    entry('a_3', 'a', 3),
    entry('a_2', 'a', 2),
    entry('b_1', 'b', 1),
  ];
  const traverseEntries = jest.fn(async (callback: (e: unknown) => Promise<void>) => {
    for (const item of entries) {
      await callback(item);
    }
  });
  const packages = {
    getPackageStream: jest.fn().mockResolvedValue({ archiveIterator: { traverseEntries } }),
  } as unknown as PackageClient;
  const logger = { debug: jest.fn() } as unknown as Logger;

  it('marks the older versions of a rule, and only those, as replaced by a newer one', async () => {
    const provider = new FleetProvider({ packages, logger });
    const read: Array<{ rule_id: string; version: number; superseded?: boolean }> = [];

    await provider.readLatestItems({}, { version: '9.6.2' }, async (items) => {
      read.push(...items);
    });

    expect(
      read.map(({ rule_id: id, version, superseded }) => [id, version, Boolean(superseded)])
    ).toEqual([
      ['a', 1, true],
      ['a', 3, false],
      ['a', 2, true],
      ['b', 1, false],
    ]);
  });
});
