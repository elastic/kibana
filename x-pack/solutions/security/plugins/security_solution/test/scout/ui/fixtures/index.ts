/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { spaceTest as baseSpaceTest, createLazyPageObject } from '@kbn/scout-security';
import type {
  SecurityTestFixtures,
  SecurityWorkerFixtures,
  SecurityPageObjects,
  ScoutPage,
} from '@kbn/scout-security';
import { createLlmProxy, type LlmProxy } from '@kbn/ftr-llm-proxy';
import { SECURITY_ENTITY_ATTACHMENT_TYPE } from '@kbn/cases-plugin/common';
import { EntityCasesPage } from './page_objects/entity_cases_page';

const XSRF = { 'kbn-xsrf': 'scout-security-solution' };
const CASES_API = '/api/cases';

interface CasesApiFixture {
  deleteAll(): Promise<void>;
  createCase(body: {
    title: string;
    description?: string;
    tags?: string[];
    owner?: string;
  }): Promise<string>;
  createWithEntityAttachment(params: {
    caseName: string;
    entityStoreId: string;
    entityName: string;
    entityType: 'host' | 'user';
  }): Promise<string>;
}

interface SecuritySolutionTestFixtures extends SecurityTestFixtures {
  pageObjects: SecurityPageObjects & { entityCases: EntityCasesPage };
  casesApi: CasesApiFixture;
}

interface SecuritySolutionWorkerFixtures extends SecurityWorkerFixtures {
  llmProxy: LlmProxy;
}

export const spaceTest = baseSpaceTest.extend<
  SecuritySolutionTestFixtures,
  SecuritySolutionWorkerFixtures
>({
  pageObjects: async (
    {
      pageObjects,
      page,
    }: {
      pageObjects: SecuritySolutionTestFixtures['pageObjects'];
      page: ScoutPage;
    },
    use: (pageObjects: SecuritySolutionTestFixtures['pageObjects']) => Promise<void>
  ) => {
    await use({
      ...pageObjects,
      entityCases: createLazyPageObject(EntityCasesPage, page),
    });
  },

  casesApi: async ({ kbnClient, scoutSpace }, use) => {
    const spacePrefix = `/s/${scoutSpace.id}`;

    const api: CasesApiFixture = {
      async deleteAll() {
        const response = await kbnClient.request<{ cases: Array<{ id: string }> }>({
          method: 'GET',
          path: `${spacePrefix}${CASES_API}?perPage=100`,
        });
        const ids = (response.data?.cases ?? []).map((c) => c.id);
        if (ids.length > 0) {
          await kbnClient.request({
            method: 'DELETE',
            path: `${spacePrefix}${CASES_API}`,
            body: { ids },
            headers: XSRF,
          });
        }
      },

      async createCase({
        title,
        description = 'Created by Scout test',
        tags: caseTags = [],
        owner = 'securitySolution',
      }) {
        const resp = await kbnClient.request<{ id: string }>({
          method: 'POST',
          path: `${spacePrefix}${CASES_API}`,
          headers: XSRF,
          body: {
            title,
            description,
            tags: caseTags,
            connector: { id: 'none', name: 'none', type: '.none', fields: null },
            settings: { syncAlerts: false },
            owner,
          },
        });
        return resp.data.id;
      },

      async createWithEntityAttachment({ caseName, entityStoreId, entityName, entityType }) {
        const caseId = await api.createCase({
          title: caseName,
          description: 'Created by Scout entity attachment test',
          tags: ['scout'],
        });

        await kbnClient.request({
          method: 'POST',
          path: `${spacePrefix}${CASES_API}/${caseId}/comments`,
          headers: XSRF,
          body: {
            type: SECURITY_ENTITY_ATTACHMENT_TYPE,
            attachmentId: entityStoreId,
            metadata: { entityName, entityType },
            owner: 'securitySolution',
          },
        });

        return caseId;
      },
    };

    await use(api);
  },

  llmProxy: [
    // scoutSpace is declared first so Playwright sets up the test space before the proxy,
    // avoiding concurrent initialization that can delay Sourcerer setup.
    async ({ log, kbnClient, scoutSpace }, use) => {
      const proxy = await createLlmProxy(log);

      // Create the connector inside the test space so EmbeddableAccessBoundary finds it.
      await kbnClient.request({
        method: 'POST',
        path: `/s/${scoutSpace.id}/api/actions/connector`,
        headers: XSRF,
        body: {
          name: `scout-llm-proxy-${scoutSpace.id}`,
          config: {
            apiProvider: 'OpenAI',
            apiUrl: `http://localhost:${proxy.getPort()}`,
            defaultModel: 'gpt-4',
          },
          secrets: { apiKey: 'test-key' },
          connector_type_id: '.gen-ai',
        },
      });

      await use(proxy);

      proxy.close();

      const list = await kbnClient.request<Array<{ id: string; name: string }>>({
        method: 'GET',
        path: `/s/${scoutSpace.id}/api/actions/connectors`,
      });
      const connectors = Array.isArray(list.data) ? list.data : [];
      await Promise.all(
        connectors
          .filter((c) => c.name === `scout-llm-proxy-${scoutSpace.id}`)
          .map((c) =>
            kbnClient.request({
              method: 'DELETE',
              path: `/s/${scoutSpace.id}/api/actions/connector/${encodeURIComponent(c.id)}`,
              headers: XSRF,
            })
          )
      );
    },
    { scope: 'worker', auto: false },
  ],
});

export { tags } from '@kbn/scout-security';
