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

/**
 * The golden-path fixture seeds the alerts its examples retrieve BY MARKER, so
 * every field a marker-scoped query can be written against has to be reachable
 * by the query the example's QUESTION implies — and that query is not the
 * fixture's choice. The AD default retrieval query matches the marker against
 * `kibana.alert.rule.name`, `message`, `kibana.alert.rule.description` and
 * `process.command_line`, and keeps `message` in its projection, so the
 * recorded golden runs wrote `WHERE message LIKE "*<marker>*"`. A fixture that
 * carries the marker only in `tags`/`workflow_tags`, `kibana.alert.reason` and
 * `kibana.alert.rule.uuid` is unreachable for that query: it returns 0 rows
 * against a population of 2, and the exact-population assertion fails a
 * retrieval that was correct.
 */
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

    // `kibana.alert.uuid` is the alert's OWN identity, distinct from the rule
    // identity (`kibana.alert.rule.uuid`, one value shared by both alerts): a
    // retrieval that keeps no `_id` metadata still returns this column, so the
    // observed population stays countable by identity rather than by row count.
    for (const { id, source } of documents) {
      const alert = (source.kibana as { alert?: { uuid?: unknown } })?.alert;
      expect(alert?.uuid).toBe(id);
    }
  });
});
