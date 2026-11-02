/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsClient } from '@kbn/scout-security';
import { apiTest } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/api';
import { euid, getBuiltInEntityDefinition } from '@kbn/entity-store/common/euid_helpers';
import {
  createSourceExpressions,
  getEuidPainlessRuntimeMapping,
} from '@kbn/entity-store/common/domain/euid/painless';
import { EntityType } from '../../../../../../common/entity_analytics/types';

import {
  ALERTS_INDEX,
  BACKFILL_TAGS,
  deleteSeededAlerts,
  seedDocuments,
} from '../../fixtures/alert_entity_id_backfill/helpers';

/**
 * The EUID for an alert can be derived four ways, and all four are used in production:
 *
 *  - in Node from `_source`, by `euid.getEuidFromObjectForSearch` — what the rule-execution
 *    enrichment stamps onto new alerts;
 *  - in Elasticsearch from doc-values, by the generated Painless — what risk scoring falls back to
 *    for alerts that carry no stamp;
 *  - in Elasticsearch from `_source`, by the same generator with `_source` field expressions —
 *    what the backfill task writes, because an `update_by_query` script has no doc-values;
 *  - in ES|QL, by `euid.esql.getEuidEvaluation` — what extraction, the maintainers and the entity
 *    analytics page use.
 *
 * They are generated from the same entity definitions but read fields through different runtimes,
 * so they can disagree where `_source` and doc-values disagree: `ignore_above` drops long values
 * from doc-values entirely, and fields absent from the mapping have no doc-values at all. A
 * multi-valued field resolves to its lowest non-empty value on every path.
 */
apiTest.describe('EUID derivation parity', { tag: BACKFILL_TAGS }, () => {
  apiTest.afterEach(async ({ esClient }) => {
    await deleteSeededAlerts(esClient);
  });

  /** The EUIDs Elasticsearch derives for one alert, by doc-values and by `_source`. */
  const deriveInElasticsearch = async (
    esClient: EsClient,
    entityType: EntityType,
    alertId: string
  ) => {
    const definition = getBuiltInEntityDefinition(entityType);
    await esClient.indices.refresh({ index: ALERTS_INDEX });

    const response = await esClient.search({
      index: ALERTS_INDEX,
      size: 1,
      query: { ids: { values: [alertId] } },
      runtime_mappings: {
        euid_doc_values: euid.painless.getEuidRuntimeMapping(definition, {
          applyPostAggFilter: false,
        }),
        // `params._source` rather than `ctx._source`: same expressions, addressed for a search.
        euid_source: getEuidPainlessRuntimeMapping(definition, {
          applyPostAggFilter: false,
          expressions: createSourceExpressions('params._source'),
        }),
      },
      fields: ['euid_doc_values', 'euid_source'],
    });

    // The ES|QL evaluation has no gate of its own, which the documents below all pass anyway.
    const esqlResponse = await esClient.esql.query({
      query: [
        'SET unmapped_fields="nullify";',
        `FROM ${ALERTS_INDEX} METADATA _id`,
        `| WHERE _id == "${alertId}"`,
        `| EVAL ${euid.esql.getEuidEvaluation(definition, 'euid_esql')}`,
        '| KEEP euid_esql',
      ].join('\n'),
    });
    const [[fromEsql] = []] = esqlResponse.values as Array<Array<string | null>>;

    return response.hits.hits.map((hit) => ({
      source: hit._source as Record<string, unknown>,
      fromDocValues: (hit.fields?.euid_doc_values as string[] | undefined)?.[0],
      fromPainlessSource: (hit.fields?.euid_source as string[] | undefined)?.[0],
      // ES|QL reports "no value" as null, the other paths as undefined.
      fromEsql: fromEsql ?? undefined,
    }));
  };

  /** Seeds one alert and returns all four derivations for it. */
  const deriveAllWays = async (
    esClient: EsClient,
    entityType: EntityType,
    document: Record<string, unknown>
  ) => {
    const [alertId] = await seedDocuments(esClient, ALERTS_INDEX, [document]);

    const alerts = await deriveInElasticsearch(esClient, entityType, alertId);
    expect(alerts).toHaveLength(1);

    const definition = getBuiltInEntityDefinition(entityType);
    return alerts.map(({ source, fromDocValues, fromPainlessSource, fromEsql }) => ({
      fromDocValues,
      fromPainlessSource,
      fromEsql,
      fromSource: euid.getEuidFromObjectForSearch(definition, source),
    }));
  };

  const expectAgreement = async (
    esClient: EsClient,
    entityType: EntityType,
    document: Record<string, unknown>
  ) => {
    const results = await deriveAllWays(esClient, entityType, document);
    for (const { fromSource, fromDocValues, fromPainlessSource, fromEsql } of results) {
      expect(fromDocValues).toStrictEqual(fromSource);
      // The Painless `_source` expressions must match the TypeScript ones they mirror — that
      // equality is what the backfill rests on.
      expect(fromPainlessSource).toStrictEqual(fromSource);
      expect(fromEsql).toStrictEqual(fromSource);
    }
    return results;
  };

  apiTest('agrees when the ranked host field is present', async ({ esClient }) => {
    await expectAgreement(esClient, EntityType.host, {
      'host.id': 'host-id-1',
      'host.name': 'host-1',
    });
  });

  apiTest('agrees when falling back down the host ranking', async ({ esClient }) => {
    // No host.id, so the EUID must come from host.name.
    await expectAgreement(esClient, EntityType.host, { 'host.name': 'host-1' });
  });

  apiTest('agrees when the identity field is nested rather than dotted', async ({ esClient }) => {
    // Alerts carry whichever shape the source document used, so both forms reach the alert.
    await expectAgreement(esClient, EntityType.host, { host: { id: 'host-id-2' } });
  });

  apiTest('agrees on the local user path', async ({ esClient }) => {
    // user.name + host.id composes `user:<name>@<host.id>@local`.
    await expectAgreement(esClient, EntityType.user, {
      'user.name': 'alice',
      'host.id': 'host-id-1',
    });
  });

  apiTest('agrees when the user namespace comes from event.module', async ({ esClient }) => {
    await expectAgreement(esClient, EntityType.user, {
      'user.email': 'alice@acme.com',
      'event.module': 'okta',
      'event.kind': 'asset',
    });
  });

  apiTest('agrees when the user namespace comes from data_stream.dataset', async ({ esClient }) => {
    // `data_stream.*` is constant_keyword in ECS but remapped to keyword on alerts, so it has
    // doc-values here. This asserts that remapping actually holds.
    await expectAgreement(esClient, EntityType.user, {
      'user.email': 'bob@acme.com',
      'data_stream.dataset': 'okta.system',
      'event.kind': 'asset',
    });
  });

  apiTest('agrees when no EUID can be derived', async ({ esClient }) => {
    // Neither derivation should invent one.
    const results = await deriveAllWays(esClient, EntityType.user, { 'host.name': 'host-1' });

    for (const { fromSource, fromDocValues, fromPainlessSource, fromEsql } of results) {
      expect(fromSource).toBeUndefined();
      expect(fromDocValues).toBeUndefined();
      expect(fromPainlessSource).toBeUndefined();
      expect(fromEsql).toBeUndefined();
    }
  });

  apiTest('agrees on the single-field service identity', async ({ esClient }) => {
    await expectAgreement(esClient, EntityType.service, { 'service.name': 'nginx' });
  });

  /** Asserts every path agrees, and on `expected`. */
  const expectAgreementOn = async (
    esClient: EsClient,
    entityType: EntityType,
    document: Record<string, unknown>,
    expected: string
  ) => {
    for (const { fromSource } of await expectAgreement(esClient, entityType, document)) {
      expect(fromSource).toBe(expected);
    }
  };

  apiTest(
    'agrees on the lowest value when the identity field is multi-valued',
    async ({ esClient }) => {
      // `_source` keeps insertion order and doc-values are sorted, so every path reduces the field to
      // its lowest value rather than taking whichever comes first.
      await expectAgreementOn(
        esClient,
        EntityType.host,
        { 'host.id': ['zzz-host', 'aaa-host'], 'host.name': 'host-1' },
        'host:aaa-host'
      );
    }
  );

  apiTest('agrees when a multi-valued identity field repeats its value', async ({ esClient }) => {
    // `logsdb_columnar` keeps duplicates, which ES|QL used to treat as a missing field.
    await expectAgreementOn(
      esClient,
      EntityType.host,
      { 'host.id': ['hid-a', 'hid-a'], 'host.name': 'host-1' },
      'host:hid-a'
    );
  });

  apiTest('skips an empty value in a multi-valued identity field', async ({ esClient }) => {
    await expectAgreementOn(
      esClient,
      EntityType.host,
      { 'host.id': ['', 'hid-b'], 'host.name': 'host-1' },
      'host:hid-b'
    );
  });

  apiTest('skips a null value in a multi-valued identity field', async ({ esClient }) => {
    await expectAgreementOn(
      esClient,
      EntityType.host,
      { 'host.id': [null, 'hid-c'], 'host.name': 'host-1' },
      'host:hid-c'
    );
  });

  apiTest(
    'falls back when a multi-valued identity field has only empty values',
    async ({ esClient }) => {
      await expectAgreementOn(
        esClient,
        EntityType.host,
        { 'host.id': [''], 'host.name': 'host-1' },
        'host:host-1'
      );
    }
  );

  apiTest('agrees on a local user with a multi-valued host.id', async ({ esClient }) => {
    await expectAgreementOn(
      esClient,
      EntityType.user,
      { 'user.name': 'alice', 'host.id': ['zzz-host', 'aaa-host'] },
      'user:alice@aaa-host@local'
    );
  });
});
