/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiTest, ELASTIC_INTERNAL_ORIGIN_HEADER } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/api';
import {
  ENTITY_LATEST,
  getEntitiesAlias,
  getLatestEntityIndexPattern,
} from '@kbn/entity-store/common';
import { RISK_SCORE_ENTITY_CALCULATION_V2_URL } from '../../../../../../common/entity_analytics/risk_score/constants';
import {
  PUBLIC_HEADERS,
  INTERNAL_HEADERS,
  ENTITY_STORE_ROUTES,
  ENTITY_STORE_TAGS,
} from '../../fixtures/maintainers/constants';
import {
  clearEntityStoreIndices,
  seedHostEntity,
  triggerMaintainerRun,
  waitForEntityStoreRunning,
} from '../../fixtures/maintainers/helpers';

const HOST_NAME = 'risk-calculation-privileges-host';
const HOST_ID = `host:${HOST_NAME}`;

const ENTITIES_ALIAS_INDEX = getEntitiesAlias(ENTITY_LATEST, 'default');
const LATEST_ENTITY_INDEX = getLatestEntityIndexPattern('default');
const RISK_SCORE_INDEX_PATTERN = 'risk-score.risk-score-*';
const LOOKUP_INDEX_PATTERN = '.entity_analytics.risk_score.lookup-*';
// Read by the calculation to find the alerts to score and the watchlists that modify the score.
const CALCULATION_INPUT_INDICES = ['.alerts-security*', '.entity_analytics.watchlists.*'];
const RISK_ENGINE_CONFIGURATION_URL =
  'api/saved_objects/risk-engine-configuration/risk-engine-configuration-default';

// The calculation route is internal and versioned independently of the Entity Store routes.
const CALCULATION_HEADERS = {
  'kbn-xsrf': 'some-xsrf-token',
  'Content-Type': 'application/json;charset=UTF-8',
  ...ELASTIC_INTERNAL_ORIGIN_HEADER,
  'elastic-api-version': '1',
};
const CALCULATION_URL = RISK_SCORE_ENTITY_CALCULATION_V2_URL.replace(/^\//, '');
const CALCULATION_BODY = {
  identifier_type: 'host',
  identifier: HOST_NAME,
  entity_id: HOST_ID,
};
const MISSING_INDEX_PRIVILEGES_MESSAGE = 'index privileges required';

// None of these roles has cluster privileges: the calculation must not need the ones required to
// install or run the risk engine (manage_transform, manage_index_templates, manage_ingest_pipelines).
// The calculation checks that the alerts index and the entity store index exist, which needs
// `view_index_metadata`.
const grants = {
  entityStoreReadWrite: {
    names: [ENTITIES_ALIAS_INDEX, LATEST_ENTITY_INDEX],
    privileges: ['read', 'write', 'view_index_metadata'],
  },
  entityStoreReadWriteNoMetadata: {
    names: [ENTITIES_ALIAS_INDEX, LATEST_ENTITY_INDEX],
    privileges: ['read', 'write'],
  },
  entityStoreRead: {
    names: [ENTITIES_ALIAS_INDEX, LATEST_ENTITY_INDEX],
    privileges: ['read', 'view_index_metadata'],
  },
  riskScoreReadWrite: { names: [RISK_SCORE_INDEX_PATTERN], privileges: ['read', 'write'] },
  riskScoreRead: { names: [RISK_SCORE_INDEX_PATTERN], privileges: ['read'] },
  lookupRead: { names: [LOOKUP_INDEX_PATTERN], privileges: ['read'] },
  calculationInputsRead: {
    names: CALCULATION_INPUT_INDICES,
    privileges: ['read', 'view_index_metadata'],
  },
};

const buildUser = (indices: Array<{ names: string[]; privileges: string[] }>) => ({
  elasticsearch: { cluster: [], indices },
  kibana: [{ base: [], feature: { siemV5: ['all'] }, spaces: ['*'] }],
});

const allRequiredGrants = [
  grants.entityStoreReadWrite,
  grants.riskScoreReadWrite,
  grants.lookupRead,
  grants.calculationInputsRead,
];

/**
 * Permissions matrix for the on-demand entity risk score calculation route.
 *
 * The route runs as the requesting user, so it checks up front the indices the calculation reads
 * and writes and returns a 403 if any privilege is missing:
 * - alerts index: `read` and `view_index_metadata`
 * - risk score index: `read`, `write`
 * - risk score lookup index: `read`
 * - entity store: `read`, `write`, and `view_index_metadata` on the latest index
 * It must not require the cluster privileges needed to install or run the risk engine.
 */
apiTest.describe('Entity risk score calculation privileges', { tag: ENTITY_STORE_TAGS }, () => {
  apiTest.setTimeout(180_000);

  let adminHeaders: Record<string, string>;
  let publicAdminHeaders: Record<string, string>;

  apiTest.beforeAll(async ({ apiClient, esClient, samlAuth }) => {
    const admin = await samlAuth.asInteractiveUser('admin');
    publicAdminHeaders = { ...admin.cookieHeader, ...PUBLIC_HEADERS };
    const internalHeaders = { ...admin.cookieHeader, ...INTERNAL_HEADERS };
    adminHeaders = { ...admin.cookieHeader, ...CALCULATION_HEADERS };

    await apiClient
      .post(ENTITY_STORE_ROUTES.public.UNINSTALL, {
        headers: publicAdminHeaders,
        responseType: 'json',
        body: {},
      })
      .catch(() => {});
    await clearEntityStoreIndices(esClient);

    const install = await apiClient.post(ENTITY_STORE_ROUTES.public.INSTALL, {
      headers: publicAdminHeaders,
      responseType: 'json',
      body: {},
    });
    expect([200, 201]).toContain(install.statusCode);
    await waitForEntityStoreRunning(apiClient, publicAdminHeaders);

    const init = await apiClient.post(ENTITY_STORE_ROUTES.internal.ENTITY_MAINTAINERS_INIT, {
      headers: internalHeaders,
      responseType: 'json',
      body: {},
    });
    expect([200, 201]).toContain(init.statusCode);

    // Creates the risk score lookup index and the risk engine configuration the calculation needs.
    await triggerMaintainerRun(apiClient, internalHeaders, 'risk-score', { sync: true });

    await seedHostEntity(esClient, { entityId: HOST_ID, hostName: HOST_NAME });
  });

  apiTest.afterAll(async ({ apiClient, esClient }) => {
    await esClient.deleteByQuery({
      index: RISK_SCORE_INDEX_PATTERN,
      refresh: true,
      ignore_unavailable: true,
      query: { term: { 'host.risk.id_value': HOST_ID } },
    });
    // Created by the risk score maintainer run in setup.
    await apiClient.delete(RISK_ENGINE_CONFIGURATION_URL, {
      headers: publicAdminHeaders,
      responseType: 'json',
    });
    await apiClient
      .post(ENTITY_STORE_ROUTES.public.UNINSTALL, {
        headers: publicAdminHeaders,
        responseType: 'json',
        body: {},
      })
      .catch(() => {});
    await clearEntityStoreIndices(esClient);
  });

  apiTest('an admin can recalculate the risk score of an entity', async ({ apiClient }) => {
    const response = await apiClient.post(CALCULATION_URL, {
      headers: adminHeaders,
      responseType: 'json',
      body: CALCULATION_BODY,
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body).toMatchObject({ success: true });
  });

  apiTest(
    'a user with only the index privileges the calculation needs can recalculate, without cluster privileges',
    async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser(buildUser(allRequiredGrants));

      const response = await apiClient.post(CALCULATION_URL, {
        headers: { ...cookieHeader, ...CALCULATION_HEADERS },
        responseType: 'json',
        body: CALCULATION_BODY,
      });

      // Include the body so a denial says which index or action Elasticsearch rejected.
      expect(response.statusCode, JSON.stringify(response.body)).toBe(200);
      expect(response.body).toMatchObject({ success: true });
    }
  );

  [
    {
      name: 'read access to the risk score lookup index',
      indices: [
        grants.entityStoreReadWrite,
        grants.riskScoreReadWrite,
        grants.calculationInputsRead,
      ],
    },
    {
      name: 'write access to the risk score index',
      indices: [
        grants.entityStoreReadWrite,
        grants.riskScoreRead,
        grants.lookupRead,
        grants.calculationInputsRead,
      ],
    },
    {
      name: 'view_index_metadata on the alerts index, which the alerts index exists check needs',
      indices: [
        ...allRequiredGrants.filter((grant) => grant !== grants.calculationInputsRead),
        { ...grants.calculationInputsRead, privileges: ['read'] },
      ],
    },
    {
      name: 'view_index_metadata on the entity store, which its installed check needs',
      indices: [
        grants.entityStoreReadWriteNoMetadata,
        grants.riskScoreReadWrite,
        grants.lookupRead,
        grants.calculationInputsRead,
      ],
    },
    {
      name: 'write access to the entity store',
      indices: [
        grants.entityStoreRead,
        grants.riskScoreReadWrite,
        grants.lookupRead,
        grants.calculationInputsRead,
      ],
    },
  ].forEach(({ name, indices }) => {
    apiTest(`a user without ${name} is rejected with a 403`, async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser(buildUser(indices));

      const response = await apiClient.post(CALCULATION_URL, {
        headers: { ...cookieHeader, ...CALCULATION_HEADERS },
        responseType: 'json',
        body: CALCULATION_BODY,
      });

      expect(response).toHaveStatusCode(403);
      // Rejected by the up front privilege check, not by Elasticsearch part way through.
      expect(response.body.message).toContain(MISSING_INDEX_PRIVILEGES_MESSAGE);
    });
  });

  apiTest(
    'a user without the entity analytics feature privilege is rejected with a 403',
    async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser({
        elasticsearch: {
          cluster: [],
          indices: allRequiredGrants,
        },
        kibana: [{ base: [], feature: { discover: ['all'] }, spaces: ['*'] }],
      });

      const response = await apiClient.post(CALCULATION_URL, {
        headers: { ...cookieHeader, ...CALCULATION_HEADERS },
        responseType: 'json',
        body: CALCULATION_BODY,
      });

      expect(response).toHaveStatusCode(403);
    }
  );
});
