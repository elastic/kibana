/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { v4 as uuidv4 } from 'uuid';
import { euid, getBuiltInEntityDefinition } from '@kbn/entity-store/common/euid_helpers';
import {
  createSourceExpressions,
  getEuidPainlessRuntimeMapping,
} from '@kbn/entity-store/common/domain/euid/painless';
import { getFieldValue } from '@kbn/entity-store/common/domain/euid/commons';
import { EntityType } from '@kbn/security-solution-plugin/common/entity_analytics/types';
import { deleteAllAlerts, deleteAllRules } from '@kbn/detections-response-ftr-services';

import { dataGeneratorFactory } from '../../../detections_response/utils';
import { buildDocument, createAndSyncRuleAndAlertsFactory } from '../../utils';
import type { FtrProviderContext } from '../../../../ftr_provider_context';

const ALERTS_INDEX = '.alerts-security.alerts-default';
const READER_PARITY_INDEX = 'euid-source-reader-parity';

/**
 * Document shapes both readers must resolve identically. The value each produces is not asserted
 * directly — `getFieldValue` is the reference, so the test runs it rather than transcribing what
 * it is expected to return.
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
 * The EUID for an alert can be derived three ways, and all three are used in production:
 *
 *  - in Node from `_source`, by `euid.getEuidFromObjectForSearch` — what the rule-execution
 *    enrichment stamps onto new alerts;
 *  - in Elasticsearch from doc-values, by the generated Painless — what risk scoring falls back to
 *    for alerts that carry no stamp;
 *  - in Elasticsearch from `_source`, by the same generator with `_source` field expressions —
 *    what the backfill task writes, because an `update_by_query` script has no doc-values.
 *
 * They are generated from the same entity definitions but read fields through different runtimes,
 * so they can disagree where `_source` and doc-values disagree: multi-valued fields resolve
 * first-in-source versus first-sorted, `ignore_above` drops long values from doc-values entirely,
 * and fields absent from the mapping have no doc-values at all.
 */
export default ({ getService }: FtrProviderContext): void => {
  const es = getService('es');
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertest');
  const log = getService('log');

  const createAndSyncRuleAndAlerts = createAndSyncRuleAndAlertsFactory({ supertest, log });
  const { indexListOfDocuments } = dataGeneratorFactory({ es, index: 'ecs_compliant', log });

  /**
   * The EUIDs Elasticsearch derives for every alert in the index, by doc-values and by `_source`.
   *
   * Every alert, rather than ones matching the seeded document: `afterEach` clears the index, so
   * each test sees only its own. There is no reliable way to filter anyway — the source document's
   * `id` field is not ECS, so on a `dynamic: false` alerts index it is unmapped and unsearchable,
   * and `kibana.alert.ancestors.id` holds the source document's generated `_id`, not that field.
   */
  const deriveInElasticsearch = async (entityType: EntityType) => {
    await es.indices.refresh({ index: ALERTS_INDEX });

    const response = await es.search({
      index: ALERTS_INDEX,
      size: 100,
      query: { match_all: {} },
      runtime_mappings: {
        euid_doc_values: euid.painless.getEuidRuntimeMapping(
          getBuiltInEntityDefinition(entityType),
          {
            applyPostAggFilter: false,
          }
        ),
        // `params._source` rather than `ctx._source`: same accessor, addressed for a search context.
        euid_source: getEuidPainlessRuntimeMapping(getBuiltInEntityDefinition(entityType), {
          applyPostAggFilter: false,
          expressions: createSourceExpressions('params._source'),
        }),
      },
      fields: ['euid_doc_values', 'euid_source'],
    });

    return response.hits.hits.map((hit) => ({
      source: hit._source as Record<string, unknown>,
      fromDocValues: (hit.fields?.euid_doc_values as string[] | undefined)?.[0],
      fromPainlessSource: (hit.fields?.euid_source as string[] | undefined)?.[0],
    }));
  };

  /**
   * Seeds one source document, runs a rule over it, and returns both derivations for each alert.
   */
  const deriveBothWays = async (entityType: EntityType, body: object) => {
    const documentId = uuidv4();
    await indexListOfDocuments([buildDocument(body, documentId)]);
    await createAndSyncRuleAndAlerts({ query: `id: ${documentId}` });

    const alerts = await deriveInElasticsearch(entityType);
    expect(alerts.length).to.be.greaterThan(0);

    return alerts.map(({ source, fromDocValues, fromPainlessSource }) => ({
      fromDocValues,
      fromPainlessSource,
      fromSource: euid.getEuidFromObjectForSearch(getBuiltInEntityDefinition(entityType), source),
    }));
  };

  /**
   * Indexes one document and reads `field` back out of it with the generated Painless reader.
   *
   * The reader is the one `createSourceExpressions` emits, taken through its public surface rather
   * than the internal constant, so the test covers what callers actually get. `value()` refers to
   * the source by the parameter name `rootBinding` declares, which a wrapping function would
   * normally supply — here the script declares it itself.
   */
  const readWithPainless = async (
    field: string,
    document: Record<string, unknown>
  ): Promise<string | undefined> => {
    const { preamble, rootBinding, value } = createSourceExpressions('params._source');

    const { _id: documentId } = await es.index({
      index: READER_PARITY_INDEX,
      document,
      refresh: true,
    });

    const response = await es.search({
      index: READER_PARITY_INDEX,
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

  const expectAgreement = async (entityType: EntityType, body: object) => {
    for (const { fromSource, fromDocValues, fromPainlessSource } of await deriveBothWays(
      entityType,
      body
    )) {
      expect(fromDocValues).to.eql(fromSource);
      // The Painless `_source` accessor must match the TypeScript one it mirrors — that equality is
      // what an update_by_query backfill would rest on.
      expect(fromPainlessSource).to.eql(fromSource);
    }
  };

  describe('@ess @serverless @skipInServerlessMKI EUID derivation parity', () => {
    before(async () => {
      await esArchiver.load(
        'x-pack/solutions/security/test/fixtures/es_archives/security_solution/ecs_compliant'
      );
    });

    after(async () => {
      await esArchiver.unload(
        'x-pack/solutions/security/test/fixtures/es_archives/security_solution/ecs_compliant'
      );
    });

    afterEach(async () => {
      await deleteAllAlerts(supertest, log, es);
      await deleteAllRules(supertest, log);
    });

    describe('host', () => {
      it('agrees when the ranked field is present', async () => {
        await expectAgreement(EntityType.host, { host: { id: 'host-id-1', name: 'host-1' } });
      });

      it('agrees when falling back down the ranking', async () => {
        // No host.id, so the EUID must come from host.name.
        await expectAgreement(EntityType.host, { host: { name: 'host-1' } });
      });

      it('agrees when the identity field is written as a dotted key', async () => {
        // Alerts copy the source document's `_source` shape, so both forms reach the alert.
        await expectAgreement(EntityType.host, { 'host.id': 'host-id-2' });
      });

      it('derives from different array elements when the identity field is multi-valued', async () => {
        // The one case where the two derivations disagree, and it predates this backfill: `_source`
        // keeps insertion order so the TypeScript path takes the first value written, while
        // doc-values are sorted so Painless takes the lowest. The same data therefore resolves to
        // one entity when an alert was stamped at rule execution and another when it was not.
        //
        // The backfill stamps the `_source` value, matching what the enrichment writes on new
        // alerts. On these alerts that moves the score, but it moves it towards the value the
        // enrichment would have produced — the fallback is transitional, so the dataset converges
        // rather than splitting by when an alert happened to be written.
        const results = await deriveBothWays(EntityType.host, {
          host: { id: ['zzz-host', 'aaa-host'] },
        });

        for (const { fromSource, fromDocValues, fromPainlessSource } of results) {
          expect(fromSource).to.be('host:zzz-host');
          expect(fromDocValues).to.be('host:aaa-host');
          // The Painless `_source` accessor sides with the TypeScript one, as it must.
          expect(fromPainlessSource).to.be('host:zzz-host');
        }
      });
    });

    describe('user', () => {
      it('agrees on the local path', async () => {
        // user.name + host.id composes `user:<name>@<host.id>@local`.
        await expectAgreement(EntityType.user, {
          user: { name: 'alice' },
          host: { id: 'host-id-1' },
        });
      });

      it('agrees when the namespace comes from event.module', async () => {
        await expectAgreement(EntityType.user, {
          user: { email: 'alice@acme.com' },
          event: { module: 'okta', kind: 'asset' },
        });
      });

      it('agrees when the namespace comes from data_stream.dataset', async () => {
        // `data_stream.*` is constant_keyword in ECS but remapped to keyword on alerts, so it has
        // doc-values here. This asserts that remapping actually holds.
        await expectAgreement(EntityType.user, {
          user: { email: 'bob@acme.com' },
          data_stream: { dataset: 'okta.system' },
          event: { kind: 'asset' },
        });
      });

      it('agrees when no EUID can be derived', async () => {
        // Neither derivation should invent one.
        const results = await deriveBothWays(EntityType.user, { host: { name: 'host-1' } });

        for (const { fromSource, fromDocValues, fromPainlessSource } of results) {
          expect(fromSource).to.be(undefined);
          expect(fromDocValues).to.be(undefined);
          expect(fromPainlessSource).to.be(undefined);
        }
      });
    });

    describe('service', () => {
      it('agrees on the single-field identity', async () => {
        await expectAgreement(EntityType.service, { service: { name: 'nginx' } });
      });
    });

    /**
     * The Painless `_source` reader against the one it mirrors.
     *
     * The suites above compare whole EUIDs on real alerts, which only exercises the document
     * shapes those alerts happen to have. This compares the readers directly, on shapes chosen to
     * probe where they could disagree — the lookup order between a flattened key and a nested
     * path, arrays, empty values, and types the mapping does not prevent appearing in `_source`.
     *
     * Reading `_source` is the whole of what the update-by-query backfill reimplements in
     * Painless, so this is the evidence that the reimplementation is faithful.
     */
    describe('Painless _source reader against getFieldValue', () => {
      before(async () => {
        // `dynamic: false` accepts any shape and still stores `_source` whole, so one index can
        // hold documents that would otherwise conflict on field type.
        await es.indices.create({
          index: READER_PARITY_INDEX,
          mappings: { dynamic: false },
        });
      });

      after(async () => {
        await es.indices.delete({ index: READER_PARITY_INDEX }, { ignore: [404] });
      });

      for (const { name, field, document } of AGREEING_CASES) {
        it(`agrees on ${name}`, async () => {
          expect(await readWithPainless(field, document)).to.eql(getFieldValue(document, field));
        });
      }

      /**
       * Where the two differ, pinned rather than reconciled.
       *
       * All three need a `_source` holding something an identity field's keyword mapping would
       * never have produced, so none is reachable from a document Elasticsearch indexed normally.
       * In each, the Painless reader declines to produce a value while the in-memory one produces
       * something — a throw, or a string assembled from a structure.
       *
       * Declining is the behaviour the backfill wants: a throw inside `update_by_query` fails that
       * document, and `"[object Object]"` would be stamped as an entity id.
       */
      describe('known divergences', () => {
        it('returns nothing for an object value, where the in-memory implementation throws', async () => {
          const document = { host: { id: { unexpected: 'object' } } };

          expect(await readWithPainless('host.id', document)).to.be(undefined);
          expect(() => getFieldValue(document, 'host.id')).to.throwError();
        });

        it('returns nothing for a nested array, which the in-memory implementation joins', async () => {
          const document = { 'host.id': [['a', 'b']] };

          expect(await readWithPainless('host.id', document)).to.be(undefined);
          expect(getFieldValue(document, 'host.id')).to.be('a,b');
        });

        it('returns nothing for an array of objects, which the in-memory implementation stringifies', async () => {
          const document = { 'host.id': [{ unexpected: 'object' }] };

          expect(await readWithPainless('host.id', document)).to.be(undefined);
          expect(getFieldValue(document, 'host.id')).to.be('[object Object]');
        });
      });
    });
  });
};
