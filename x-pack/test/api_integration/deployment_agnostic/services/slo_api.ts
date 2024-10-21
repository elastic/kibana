/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RoleCredentials } from '@kbn/ftr-common-functional-services';
import { CreateSLOInput, FindSLODefinitionsResponse, UpdateSLOInput } from '@kbn/slo-schema';
import { DeploymentAgnosticFtrProviderContext } from '../ftr_provider_context';

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

    async delete(id: string, roleAuthc: RoleCredentials) {
      return await supertestWithoutAuth
        .delete(`/api/observability/slos/${id}`)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send()
        .expect(204);
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

    async findDefinitions(roleAuthc: RoleCredentials): Promise<FindSLODefinitionsResponse> {
      const { body } = await supertestWithoutAuth
        .get(`/api/observability/slos/_definitions`)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send()
        .expect(200);

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
  };
}
