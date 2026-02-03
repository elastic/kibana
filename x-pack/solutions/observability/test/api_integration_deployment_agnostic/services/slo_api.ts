/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RoleCredentials } from '@kbn/ftr-common-functional-services';
import type { StoredSLODefinition } from '@kbn/slo-plugin/server/domain/models/slo';
import type {
  BulkDeleteInput,
  CreateSLOInput,
  FindSLODefinitionsResponse,
  FindSLOInstancesResponse,
  FindSLOTemplatesResponse,
  GetSLOTemplateResponse,
  UpdateSLOInput,
} from '@kbn/slo-schema';
import type { DeploymentAgnosticFtrProviderContext } from '../ftr_provider_context';

interface SavedObject<Attributes extends Record<string, any>> {
  attributes: Attributes;
  id: string;
  type: string;
  updated_at?: string;
  version?: string;
}
interface SavedObjectResponse {
  page: number;
  per_page: number;
  total: number;
  saved_objects: Array<SavedObject<StoredSLODefinition>>;
}

export function SloApiProvider({ getService }: DeploymentAgnosticFtrProviderContext) {
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const samlAuth = getService('samlAuth');

  return {
    async create(slo: CreateSLOInput, roleAuthc: RoleCredentials) {
      const { body } = await supertestWithoutAuth
        .post(`/api/observability/slos`)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send(slo)
        .expect(200);
      return body;
    },

    async createWithSpace(
      slo: CreateSLOInput & { id?: string },
      spaceId: string,
      roleAuthc: RoleCredentials,
      expectedStatus: 200 | 409
    ) {
      const { body } = await supertestWithoutAuth
        .post(`/s/${spaceId}/api/observability/slos`)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send(slo)
        .expect(expectedStatus);
      return body;
    },

    async reset(id: string, roleAuthc: RoleCredentials) {
      const { body } = await supertestWithoutAuth
        .post(`/api/observability/slos/${id}/_reset`)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send()
        .expect(200);

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
        .send(slo)
        .expect(200);

      return body;
    },

    async enable({ sloId }: { sloId: string }, roleAuthc: RoleCredentials) {
      const { body } = await supertestWithoutAuth
        .post(`/api/observability/slos/{id}/enable`.replace('{id}', sloId))
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send()
        .expect(204);

      return body;
    },

    async disable({ sloId }: { sloId: string }, roleAuthc: RoleCredentials) {
      const { body } = await supertestWithoutAuth
        .post(`/api/observability/slos/{id}/disable`.replace('{id}', sloId))
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send()
        .expect(204);

      return body;
    },

    async delete(id: string, roleAuthc: RoleCredentials) {
      return await supertestWithoutAuth
        .delete(`/api/observability/slos/${id}`)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send()
        .expect(204);
    },

    async bulkDelete(params: BulkDeleteInput, roleAuthc: RoleCredentials) {
      const { body: response } = await supertestWithoutAuth
        .post(`/api/observability/slos/_bulk_delete`)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send(params)
        .expect(200);

      return response;
    },

    async bulkDeleteStatus(taskId: string, roleAuthc: RoleCredentials) {
      const { body: response } = await supertestWithoutAuth
        .get(`/api/observability/slos/_bulk_delete/${taskId}`)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send()
        .expect(200);

      return response;
    },

    async get(id: string, roleAuthc: RoleCredentials) {
      const { body } = await supertestWithoutAuth
        .get(`/api/observability/slos/${id}`)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send()
        .expect(200);

      return body;
    },

    async findDefinitions(
      roleAuthc: RoleCredentials,
      params?: Record<string, string>
    ): Promise<FindSLODefinitionsResponse> {
      const { body } = await supertestWithoutAuth
        .get(`/api/observability/slos/_definitions`)
        .query(params || {})
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send();

      return body;
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

    async purgeRollupData(
      ids: string[],
      purgePolicy: { purgeType: 'fixed_age' | 'fixed_time'; age?: string; timestamp?: Date },
      roleAuthc: RoleCredentials,
      expectedStatus: number,
      force: boolean = false
    ) {
      const { body } = await supertestWithoutAuth
        .post(`/api/observability/slos/_bulk_purge_rollup${force ? '?force=true' : ''}`)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({
          ids,
          purgePolicy,
        })
        .expect(expectedStatus);

      return body;
    },

    async repair(list: string[], roleAuthc: RoleCredentials) {
      const { body } = await supertestWithoutAuth
        .post(`/api/observability/slos/_repair`)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({ list })
        .expect(207);
      return body;
    },

    async purgeInstances(
      params: { list?: string[]; staleDuration?: string; force?: boolean },
      roleAuthc: RoleCredentials
    ) {
      const { body } = await supertestWithoutAuth
        .post(`/api/observability/slos/_purge_instances`)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send(params)
        .expect(200);

      return body;
    },

    async purgeInstancesStatus(taskId: string, roleAuthc: RoleCredentials) {
      const { body } = await supertestWithoutAuth
        .get(`/api/observability/slos/_purge_instances/${taskId}`)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send()
        .expect(200);

      return body;
    },

    async findInstances(
      sloId: string,
      params: { search?: string; size?: string; searchAfter?: string },
      roleAuthc: RoleCredentials,
      expectedStatus: number = 200
    ): Promise<FindSLOInstancesResponse> {
      const { body } = await supertestWithoutAuth
        .get(`/internal/observability/slos/${sloId}/_instances`)
        .query(params)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send()
        .expect(expectedStatus);

      return body;
    },

    async getSettings(roleAuthc: RoleCredentials) {
      const { body } = await supertestWithoutAuth
        .get(`/internal/slo/settings`)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send()
        .expect(200);

      return body;
    },

    async updateSettings(settings: Record<string, unknown>, roleAuthc: RoleCredentials) {
      const { body } = await supertestWithoutAuth
        .put(`/internal/slo/settings`)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send(settings)
        .expect(200);

      return body;
    },

    async getTemplate(
      templateId: string,
      roleAuthc: RoleCredentials,
      expectedStatus: number = 200
    ): Promise<GetSLOTemplateResponse> {
      const { body } = await supertestWithoutAuth
        .get(`/api/observability/slo_templates/${templateId}`)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send()
        .expect(expectedStatus);

      return body;
    },

    async findTemplates(
      params: { search?: string; tags?: string[]; page?: number; perPage?: number },
      roleAuthc: RoleCredentials,
      expectedStatus: number = 200
    ): Promise<FindSLOTemplatesResponse> {
      const queryParams: Record<string, string | number> = {};
      if (params.search) queryParams.search = params.search;
      if (params.tags && params.tags.length > 0) queryParams.tags = params.tags.join(',');
      if (params.page !== undefined) queryParams.page = params.page;
      if (params.perPage !== undefined) queryParams.perPage = params.perPage;

      const { body } = await supertestWithoutAuth
        .get(`/api/observability/slo_templates`)
        .query(queryParams)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send()
        .expect(expectedStatus);

      return body;
    },

    async getSavedObject(roleAuthc: RoleCredentials, sloId: string): Promise<SavedObjectResponse> {
      const { body } = await supertestWithoutAuth
        .get(`/api/saved_objects/_find?type=slo&filter=slo.attributes.id:(${sloId})`)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send()
        .expect(200);

      return body;
    },

    async updateSavedObject(
      roleAuthc: RoleCredentials,
      slo: StoredSLODefinition,
      id: string
    ): Promise<SavedObjectResponse> {
      const { body } = await supertestWithoutAuth
        .put(`/api/saved_objects/slo/${id}`)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({
          attributes: slo,
        })
        .expect(200);
      return body;
    },
  };
}
