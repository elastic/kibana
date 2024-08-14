/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RoleCredentials } from '@kbn/ftr-common-functional-services';
import { DeploymentAgnosticFtrProviderContext } from '../ftr_provider_context';

export function DataViewApiProvider({ getService }: DeploymentAgnosticFtrProviderContext) {
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const samlAuth = getService('samlAuth');

  return {
    async create({
      roleAuthc,
      id,
      name,
      title,
    }: {
      roleAuthc: RoleCredentials;
      id: string;
      name: string;
      title: string;
    }) {
      const { body } = await supertestWithoutAuth
        .post(`/api/content_management/rpc/create`)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .set(samlAuth.getCommonRequestHeader())
        .send({
          contentTypeId: 'index-pattern',
          data: {
            fieldAttrs: '{}',
            title,
            timeFieldName: '@timestamp',
            sourceFilters: '[]',
            fields: '[]',
            fieldFormatMap: '{}',
            typeMeta: '{}',
            runtimeFieldMap: '{}',
            name,
          },
          options: { id },
          version: 1,
        });
      return body;
    },

    async delete({ roleAuthc, id }: { roleAuthc: RoleCredentials; id: string }) {
      const { body } = await supertestWithoutAuth
        .post(`/api/content_management/rpc/create`)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .set(samlAuth.getCommonRequestHeader())
        .send({
          contentTypeId: 'index-pattern',
          id,
          options: { force: true },
          version: 1,
        });
      return body;
    },
  };
}
