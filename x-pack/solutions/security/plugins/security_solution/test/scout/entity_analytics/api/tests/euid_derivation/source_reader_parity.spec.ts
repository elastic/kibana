/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsClient } from '@kbn/scout-security';
import { apiTest } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/api';
import { createSourceExpressions } from '@kbn/entity-store/common/domain/euid/painless';
import { getFieldValue } from '@kbn/entity-store/common/domain/euid/commons';

import { BACKFILL_TAGS } from '../../fixtures/alert_entity_id_backfill/helpers';

const INDEX = 'euid-source-reader-parity';

/**
 * Document shapes both readers must resolve identically. The expected value is not written out —
 * `getFieldValue` is the reference, so the test runs it rather than transcribing what it returns.
 */
const AGREEING_CASES: Array<{ name: string; field: string; document: Record<string, unknown> }> = [
  { name: 'a flattened dotted key', field: 'host.id', document: { 'host.id': 'flat-1' } },
  { name: 'a nested object path', field: 'host.id', document: { host: { id: 'nested-1' } } },
  {
    // Both readers try the flattened key first; a document carrying both shapes pins that order.
    name: 'both shapes at once',
    field: 'host.id',
    document: { 'host.id': 'flat-2', host: { id: 'nested-2' } },
  },
  { name: 'an absent field', field: 'host.id', document: { user: { name: 'alice' } } },
  { name: 'an empty string', field: 'host.id', document: { 'host.id': '' } },
  { name: 'an empty string nested', field: 'host.id', document: { host: { id: '' } } },
  {
    // Neither should fall through to the nested value once the flattened key is present.
    name: 'an empty flattened key shadowing a nested value',
    field: 'host.id',
    document: { 'host.id': '', host: { id: 'shadowed' } },
  },
  { name: 'an empty array', field: 'host.id', document: { 'host.id': [] } },
  { name: 'an array of one', field: 'host.id', document: { 'host.id': ['only'] } },
  {
    // First written, not lowest sorted — the difference from doc-values the backfill accepts.
    name: 'a multi-valued field',
    field: 'host.id',
    document: { 'host.id': ['zzz-host', 'aaa-host'] },
  },
  {
    // The mapping makes identity fields keywords, but `_source` keeps whatever JSON arrived, so a
    // non-string value is reachable. Both readers stringify it, matching what ES would index.
    name: 'a numeric value',
    field: 'host.id',
    document: { 'host.id': 12345 },
  },
  { name: 'a boolean value', field: 'host.id', document: { 'host.id': true } },
  {
    name: 'a three-segment path',
    field: 'cloud.account.id',
    document: { cloud: { account: { id: 'acc-1' } } },
  },
  {
    // Neither reader should invent a value by splitting a key it did not find whole.
    name: 'a partially flattened path',
    field: 'cloud.account.id',
    document: { cloud: { 'account.id': 'acc-2' } },
  },
];

/**
 * The Painless `_source` reader against the one it mirrors.
 *
 * Reading `_source` is the whole of what the update-by-query backfill reimplements in Painless —
 * `__euid_src` is a hand-port of `getFieldValue` — so this is the evidence that the port is
 * faithful. The shapes are chosen to probe where they could disagree: the lookup order between a
 * flattened key and a nested path, arrays, empty values, and types the mapping does not prevent
 * appearing in `_source`.
 */
apiTest.describe('EUID source reader parity', { tag: BACKFILL_TAGS }, () => {
  apiTest.beforeAll(async ({ esClient }) => {
    // `dynamic: false` accepts any shape and still stores `_source` whole, so one index can hold
    // documents that would otherwise conflict on field type.
    await esClient.indices.create({ index: INDEX, mappings: { dynamic: false } });
  });

  apiTest.afterAll(async ({ esClient }) => {
    await esClient.indices.delete({ index: INDEX }, { ignore: [404] });
  });

  /**
   * Indexes one document and reads `field` back out of it with the generated Painless reader.
   *
   * Built from `createSourceExpressions`' public surface rather than the private constant, so the
   * test covers what callers get. `value()` refers to the source by the parameter name
   * `rootBinding` declares, which a wrapping function would normally supply — here the script
   * declares it itself.
   */
  const readWithPainless = async (
    esClient: EsClient,
    field: string,
    document: Record<string, unknown>
  ): Promise<string | undefined> => {
    const { preamble, rootBinding, value } = createSourceExpressions('params._source');

    const { _id: documentId } = await esClient.index({ index: INDEX, document, refresh: true });

    const response = await esClient.search({
      index: INDEX,
      query: { ids: { values: [documentId] } },
      script_fields: {
        read: {
          script: {
            lang: 'painless',
            source: `${preamble} def ${rootBinding.param} = ${
              rootBinding.expression
            }; return ${value(field)};`,
          },
        },
      },
    });

    const [hit] = response.hits.hits;
    const read = (hit?.fields?.read as Array<string | null> | undefined)?.[0];

    // `getFieldValue` reports "no value" as undefined, Painless as null; normalise so the two are
    // comparable.
    return read === null ? undefined : read;
  };

  for (const { name, field, document } of AGREEING_CASES) {
    apiTest(`agrees on ${name}`, async ({ esClient }) => {
      expect(await readWithPainless(esClient, field, document)).toStrictEqual(
        getFieldValue(document, field)
      );
    });
  }

  apiTest('declines a value that is not a single scalar', async ({ esClient }) => {
    // Elasticsearch flattens `[['a','b']]` for a keyword field, so this shape does reach the alerts
    // index even though `_source` keeps it nested. Assembling a value out of the structure would
    // invent an entity id matching nothing; returning nothing leaves the alert to the risk scoring
    // fallback, which derives a real one from doc-values.
    expect(
      await readWithPainless(esClient, 'host.id', { 'host.id': [['a', 'b']] })
    ).toBeUndefined();
  });
});
