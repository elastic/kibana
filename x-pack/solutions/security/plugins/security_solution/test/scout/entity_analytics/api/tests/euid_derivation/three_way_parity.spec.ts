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

    return response.hits.hits.map((hit) => ({
      source: hit._source as Record<string, unknown>,
      fromDocValues: (hit.fields?.euid_doc_values as string[] | undefined)?.[0],
      fromPainlessSource: (hit.fields?.euid_source as string[] | undefined)?.[0],
    }));
  };

  /** Seeds one alert and returns all three derivations for it. */
  const deriveAllWays = async (
    esClient: EsClient,
    entityType: EntityType,
    document: Record<string, unknown>
  ) => {
    const [alertId] = await seedDocuments(esClient, ALERTS_INDEX, [document]);

    const alerts = await deriveInElasticsearch(esClient, entityType, alertId);
    expect(alerts).toHaveLength(1);

    const definition = getBuiltInEntityDefinition(entityType);
    return alerts.map(({ source, fromDocValues, fromPainlessSource }) => ({
      fromDocValues,
      fromPainlessSource,
      fromSource: euid.getEuidFromObjectForSearch(definition, source),
    }));
  };

  const expectAgreement = async (
    esClient: EsClient,
    entityType: EntityType,
    document: Record<string, unknown>
  ) => {
    for (const { fromSource, fromDocValues, fromPainlessSource } of await deriveAllWays(
      esClient,
      entityType,
      document
    )) {
      expect(fromDocValues).toStrictEqual(fromSource);
      // The Painless `_source` expressions must match the TypeScript ones they mirror — that
      // equality is what the backfill rests on.
      expect(fromPainlessSource).toStrictEqual(fromSource);
    }
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

    for (const { fromSource, fromDocValues, fromPainlessSource } of results) {
      expect(fromSource).toBeUndefined();
      expect(fromDocValues).toBeUndefined();
      expect(fromPainlessSource).toBeUndefined();
    }
  });

  apiTest('agrees on the single-field service identity', async ({ esClient }) => {
    await expectAgreement(esClient, EntityType.service, { 'service.name': 'nginx' });
  });

  apiTest(
    'derives from different array elements when the identity field is multi-valued',
    async ({ esClient }) => {
      // The one case where the derivations disagree, and it predates this backfill: `_source` keeps
      // insertion order so the TypeScript path takes the first value written, while doc-values are
      // sorted so Painless takes the lowest. The same alert therefore resolves to one entity when
      // it was stamped at rule execution and another when it was not.
      //
      // The backfill stamps the `_source` value, matching what the enrichment writes on new alerts.
      // On these alerts that moves the score, but towards the value the enrichment would have
      // produced — the fallback is transitional, so the dataset converges rather than splitting by
      // when an alert happened to be written.
      const results = await deriveAllWays(esClient, EntityType.host, {
        'host.id': ['zzz-host', 'aaa-host'],
      });

      for (const { fromSource, fromDocValues, fromPainlessSource } of results) {
        expect(fromSource).toBe('host:zzz-host');
        expect(fromDocValues).toBe('host:aaa-host');
        // The Painless `_source` expressions side with the TypeScript ones, as they must.
        expect(fromPainlessSource).toBe('host:zzz-host');
      }
    }
  );
});
