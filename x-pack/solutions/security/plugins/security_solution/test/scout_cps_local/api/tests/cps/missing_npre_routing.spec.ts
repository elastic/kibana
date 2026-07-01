/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import { apiTest, tags } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/api';
import type { EsClient } from '@kbn/scout-security';

/**
 * CPS routing behavior when the supplied NPRE (Named Project Routing Expression)
 * does not exist.
 *
 * Background (internal thread on `no_matching_project_exception`): Kibana injects
 * an NPRE *reference* (e.g. `@kibana_space_default_default`) for space-scoped
 * requests. The dispute was whether a reference that was never provisioned at ES
 * falls back to origin-only (`_alias:_origin`) or to flat world (`_alias:*`).
 *
 * Finding (ES 9.5.0 serverless CPS), verified here with a connected linked
 * project and the request driven THROUGH Kibana (so it carries UIAM auth):
 *
 *   project_routing            -> resolved projects
 *   ----------------------------------------------------
 *   `_alias:_origin`           -> origin only
 *   `_alias:*`                 -> origin + linked   (flat world)
 *   <non-existent NPRE>        -> origin + linked   (flat world)  + a `299`
 *                                 deprecation warning
 *   <no project_routing>       -> origin only
 *
 * So a non-existent NPRE reference FANS OUT TO FLAT WORLD — it resolves the same
 * projects as `_alias:*`, NOT origin-only. It is non-fatal (200, not
 * `no_matching_project_exception`). Note this is distinct from omitting
 * `project_routing` entirely, which stays origin-only.
 *
 * Requires (linked project must be CONNECTED — `GET /_remote/info` on the origin
 * shows `linked_local_project: { connected: true }`):
 *   node scripts/scout start-server --arch serverless \
 *     --domain security_complete --serverConfigSet cps_local
 *
 * Run the local stack on Docker Desktop or Linux, NOT colima: registering the
 * linked project rewrites the origin's operator settings from the host, and
 * colima's virtiofs mount does not propagate that change as an inotify event into
 * the ES container, so ES never reloads and the link stays unconnected
 * (`no_matching_project_exception: No such project: [linked_local_project]`).
 * Docker Desktop also needs enough memory (≥ ~12–16 GB) or the linked ES node is
 * OOM-killed (exit 137).
 */

const FIELDS_FOR_WILDCARD_PATH = '/internal/data_views/_fields_for_wildcard';

/** NPRE expression: search only the origin project. */
const PROJECT_ROUTING_ORIGIN = '_alias:_origin';
/** NPRE expression: flat world — search origin plus every linked project. */
const PROJECT_ROUTING_ALL = '_alias:*';

const INTERNAL_HEADERS = {
  'kbn-xsrf': 'some-xsrf-token',
  'x-elastic-internal-origin': 'kibana',
  'elastic-api-version': '1',
  'Content-Type': 'application/json;charset=UTF-8',
};

interface FieldsForWildcardResponse {
  fields: Array<{ name: string }>;
  indices: string[];
}

/**
 * Creates an index with a marker field unique to its cluster and points an alias
 * at it. The same alias is seeded on both the origin and the linked cluster, so a
 * request that fans out to flat world resolves BOTH markers, while an origin-only
 * request resolves only the origin marker.
 */
const seedAliasedMarkerIndex = async (
  esClient: EsClient,
  { index, alias, markerField }: { index: string; alias: string; markerField: string }
): Promise<void> => {
  await esClient.indices.create({
    index,
    aliases: { [alias]: {} },
    mappings: {
      properties: {
        '@timestamp': { type: 'date' },
        [markerField]: { type: 'keyword' },
      },
    },
  });
  await esClient.index({
    index,
    refresh: 'wait_for',
    document: { '@timestamp': new Date().toISOString(), [markerField]: 'present' },
  });
};

apiTest.describe(
  'CPS routing with a non-existent NPRE',
  { tag: tags.serverless.security.complete },
  () => {
    const runId = randomUUID().slice(0, 8);
    // Avoid `logs-*` so serverless data-stream templates do not hijack the index.
    const originIndex = `scout-cps-missing-npre-origin-${runId}`;
    const linkedIndex = `scout-cps-missing-npre-linked-${runId}`;
    const alias = `scout-cps-missing-npre-${runId}`;
    const originMarkerField = `origin_marker_${runId}`;
    const linkedMarkerField = `linked_marker_${runId}`;

    let headers: Record<string, string>;

    const fieldsForWildcard = async (
      apiClient: { post: Function },
      projectRouting?: string
    ): Promise<FieldsForWildcardResponse> => {
      const response = await apiClient.post(`${FIELDS_FOR_WILDCARD_PATH}?pattern=${alias}`, {
        headers,
        responseType: 'json',
        body: {
          ...(projectRouting ? { project_routing: projectRouting } : {}),
        },
      });
      expect(response.statusCode, JSON.stringify(response.body)).toBe(200);
      return response.body as FieldsForWildcardResponse;
    };

    const fieldNames = (res: FieldsForWildcardResponse): string[] =>
      (res.fields ?? []).map((f) => f.name).sort();

    apiTest.beforeAll(async ({ samlAuth, esClient, linkedProject }) => {
      const credentials = await samlAuth.asInteractiveUser('admin');
      headers = { ...credentials.cookieHeader, ...INTERNAL_HEADERS };

      await seedAliasedMarkerIndex(esClient, {
        index: originIndex,
        alias,
        markerField: originMarkerField,
      });
      await seedAliasedMarkerIndex(linkedProject.esClient, {
        index: linkedIndex,
        alias,
        markerField: linkedMarkerField,
      });
    });

    apiTest.afterAll(async ({ esClient, linkedProject }) => {
      await esClient.indices.delete({ index: originIndex }, { ignore: [404] });
      await linkedProject.esClient.indices.delete({ index: linkedIndex }, { ignore: [404] });
    });

    // Baselines that anchor the two ends of the spectrum, so the missing-NPRE
    // assertion below is interpreted against known-good origin-only and
    // flat-world resolutions in this exact environment.
    apiTest('`_alias:_origin` resolves the origin project only', async ({ apiClient }) => {
      const result = await fieldsForWildcard(apiClient, PROJECT_ROUTING_ORIGIN);
      expect(fieldNames(result)).toContain(originMarkerField);
      expect(fieldNames(result)).not.toContain(linkedMarkerField);
    });

    apiTest('`_alias:*` fans out to flat world (origin + linked)', async ({ apiClient }) => {
      const result = await fieldsForWildcard(apiClient, PROJECT_ROUTING_ALL);
      expect(fieldNames(result)).toContain(originMarkerField);
      expect(fieldNames(result)).toContain(linkedMarkerField);
    });

    // The behavior under dispute. A reference to an NPRE that was never
    // provisioned at ES does NOT fall back to origin-only and does NOT throw
    // `no_matching_project_exception`. It resolves the SAME projects as
    // `_alias:*` (origin + every linked project) — i.e. it fans out to flat
    // world — and ES emits a `299` deprecation warning.
    apiTest(
      'a non-existent NPRE fans out to flat world (same as `_alias:*`)',
      async ({ apiClient }) => {
        const missingNpre = `@kibana_space_does_not_exist_${runId}`;

        const result = await fieldsForWildcard(apiClient, missingNpre);

        expect(
          fieldNames(result),
          'a non-existent NPRE should still resolve the origin project'
        ).toContain(originMarkerField);
        expect(
          fieldNames(result),
          'a non-existent NPRE should fan out to the linked project (flat world), not fall back to origin-only'
        ).toContain(linkedMarkerField);
      }
    );
  }
);
