/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RoleCredentials } from '@kbn/ftr-common-functional-services';
import {
  CreateSLOInput,
  FetchHistoricalSummaryParams,
  FetchHistoricalSummaryResponse,
  FindSLODefinitionsResponse,
  UpdateSLOInput,
} from '@kbn/slo-schema';
import { DeploymentAgnosticFtrProviderContext } from '../ftr_provider_context';

interface SloRequestParams {
  id: string;
  roleAuthc: RoleCredentials;
}

export function SloApiProvider({ getService }: DeploymentAgnosticFtrProviderContext) {
  const es = getService('es');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const samlAuth = getService('samlAuth');
  const retry = getService('retry');
  const config = getService('config');
  const retryTimeout = config.get('timeouts.try');
  const requestTimeout = 30 * 1000;

  return {
    async create(slo: CreateSLOInput, roleAuthc: RoleCredentials) {
      const { body } = await supertestWithoutAuth
        .post(`/api/observability/slos`)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send(slo);
      return body;
    },

    async reset(id: string, roleAuthc: RoleCredentials) {
      const { body } = await supertestWithoutAuth
        .post(`/api/observability/slos/${id}/_reset`)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send();

      return body;
    },

    async update(
      { sloId, slo }: { sloId: string; slo: UpdateSLOInput },
      roleAuthc: RoleCredentials
    ) {
      const { body } = await supertestWithoutAuth
        .put(`/api/observability/slos/${sloId}`)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send(slo);

      return body;
    },

    async delete({ id, roleAuthc }: SloRequestParams) {
      const response = await supertestWithoutAuth
        .delete(`/api/observability/slos/${id}`)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader());

      return response;
    },

    async findDefinitions(roleAuthc: RoleCredentials): Promise<FindSLODefinitionsResponse> {
      const { body } = await supertestWithoutAuth
        .get(`/api/observability/slos/_definitions`)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send()
        .expect(200);

      return body;
    },

    async fetchHistoricalSummary(
      params: FetchHistoricalSummaryParams,
      roleAuthc: RoleCredentials
    ): Promise<FetchHistoricalSummaryResponse> {
      const { body } = await supertestWithoutAuth
        .post(`/internal/observability/slos/_historical_summary`)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send(params);

      return body;
    },

    async waitForSloToBeDeleted({ id, roleAuthc }: SloRequestParams) {
      return await retry.tryForTime(retryTimeout, async () => {
        const response = await supertestWithoutAuth
          .delete(`/api/observability/slos/${id}`)
          .set(roleAuthc.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .timeout(requestTimeout);
        if (!response.ok) {
          throw new Error(`SLO with id '${id}' was not deleted`);
        }
        return response;
      });
    },

    async waitForSloCreated({ id, roleAuthc }: SloRequestParams) {
      return await retry.tryForTime(retryTimeout, async () => {
        const response = await supertestWithoutAuth
          .get(`/api/observability/slos/${id}`)
          .set(roleAuthc.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .timeout(requestTimeout);
        if (response.body.id === undefined) {
          throw new Error(`No SLO with id '${id}' found`);
        }
        return response.body;
      });
    },

    async waitForSloUpdated(
      { sloId, slo }: { sloId: string; slo: UpdateSLOInput },
      roleAuthc: RoleCredentials
    ) {
      return await retry.tryForTime(retryTimeout, async () => {
        const response = await supertestWithoutAuth
          .put(`/api/observability/slos/${sloId}`)
          .set(roleAuthc.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .send(slo)
          .timeout(requestTimeout);
        if (response.body.id === undefined) {
          throw new Error(`No SLO with id '${sloId}' found`);
        }
        return response.body;
      });
    },

    async waitForSloSummaryTempIndexToExist(index: string) {
      return await retry.tryForTime(retryTimeout, async () => {
        const indexExists = await es.indices.exists({ index, allow_no_indices: false });
        if (!indexExists) {
          throw new Error(`SLO summary index '${index}' should exist`);
        }
        return indexExists;
      });
    },

    async getSloData({ sloId, indexName }: { sloId: string; indexName: string }) {
      const response = await es.search({
        index: indexName,
        body: {
          query: {
            bool: {
              filter: [{ term: { 'slo.id': sloId } }],
            },
          },
        },
      });
      return response;
    },
    async waitForSloData({ id, indexName }: { id: string; indexName: string }) {
      return await retry.tryForTime(retryTimeout, async () => {
        const response = await es.search({
          index: indexName,
          body: {
            query: {
              bool: {
                filter: [{ term: { 'slo.id': id } }],
              },
            },
          },
        });
        if (response.hits.hits.length === 0) {
          throw new Error(`No hits found at index '${indexName}' for slo id='${id}'`);
        }
        return response;
      });
    },
    async deleteAllSLOs(roleAuthc: RoleCredentials) {
      const response = await supertestWithoutAuth
        .get(`/api/observability/slos/_definitions`)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send()
        .expect(200);
      await Promise.all(
        response.body.results.map(({ id }: { id: string }) => {
          return supertestWithoutAuth
            .delete(`/api/observability/slos/${id}`)
            .set(roleAuthc.apiKeyHeader)
            .set(samlAuth.getInternalRequestHeader())
            .send()
            .expect(204);
        })
      );
    },
  };
}
