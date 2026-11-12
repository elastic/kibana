/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { attackDiscoveryFixtureMarker, seedAttackDiscoveryFixtures } from './fixtures';

/** The documents `seedAttackDiscoveryFixtures` actually sends to the index. */
const seededDocuments = async (): Promise<
  Array<{ id: string; source: Record<string, unknown> }>
> => {
  const operations: unknown[] = [];
  const esClient = {
    bulk: jest.fn(async (request: { operations: unknown[] }) => {
      operations.push(...request.operations);
      return {};
    }),
  };
  const fetch = jest.fn(async () => ({}));

  await seedAttackDiscoveryFixtures(esClient as never, fetch as never);

  // `bulk` operations alternate action metadata and document body.
  return operations
    .filter((_, index) => index % 2 === 0)
    .map((action, index) => ({
      id: String((action as { index: { _id: string } }).index._id),
      source: operations[index * 2 + 1] as Record<string, unknown>,
    }));
};

describe('the golden fixture is retrievable by the query its question implies', () => {
  it('seeds the marker into the text field a marker search targets', async () => {
    const documents = await seededDocuments();

    expect(documents.length).toBeGreaterThan(0);
    for (const { source } of documents) {
      expect(String(source.message)).toContain(attackDiscoveryFixtureMarker);
    }
  });

  it('gives every alert its own identity, countable without the _id metadata', async () => {
    const documents = await seededDocuments();
    const ids = documents.map(({ id }) => id);
    expect(new Set(ids).size).toBe(ids.length);

    for (const { id, source } of documents) {
      const alert = (source.kibana as { alert?: { uuid?: unknown } })?.alert;
      expect(alert?.uuid).toBe(id);
    }
  });
});

describe('the golden fixture seeds a chain that spans more than one rule', () => {
  const seededRules = async (): Promise<Array<{ name: unknown; uuid: unknown }>> =>
    (await seededDocuments()).map(({ source }) => {
      const { rule } = (source.kibana as { alert: { rule: { name: unknown; uuid: unknown } } })
        .alert;
      return { name: rule.name, uuid: rule.uuid };
    });

  it('seeds each alert under its own rule uuid', async () => {
    const rules = await seededRules();

    expect(rules).toHaveLength(2);
    expect(new Set(rules.map(({ uuid }) => uuid)).size).toBe(rules.length);
  });

  it('keeps rule names and rule uuids one-to-one', async () => {
    const rules = await seededRules();

    expect(new Set(rules.map(({ name }) => name)).size).toBe(rules.length);
  });
});
