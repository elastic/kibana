/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RoleCredentials } from '@kbn/ftr-common-functional-services';
import { DeploymentAgnosticFtrProviderContext } from '../ftr_provider_context';

export interface CustomIntegration {
  integrationName: string;
  datasets: IntegrationDataset[];
}

export interface IntegrationDataset {
  name: string;
  type: 'logs' | 'metrics' | 'synthetics' | 'traces';
}

export function PackageApiProvider({ getService }: DeploymentAgnosticFtrProviderContext) {
  const samlAuth = getService('samlAuth');
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  return {
    async installCustomIntegration({
      roleAuthc,
      customIntegration,
    }: {
      roleAuthc: RoleCredentials;
      customIntegration: CustomIntegration;
    }) {
      const { integrationName, datasets } = customIntegration;

      const { body } = await supertestWithoutAuth
        .post(`/api/fleet/epm/custom_integrations`)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({ integrationName, datasets });
      return body;
    },
    async installPackage({ roleAuthc, pkg }: { roleAuthc: RoleCredentials; pkg: string }) {
      const {
        body: {
          item: { latestVersion: version },
        },
      } = await supertestWithoutAuth
        .get(`/api/fleet/epm/packages/${pkg}`)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({ force: true });

      const { body } = await supertestWithoutAuth
        .post(`/api/fleet/epm/packages/${pkg}/${version}`)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({ force: true });
      return body;
    },
    async uninstallPackage({ roleAuthc, pkg }: { roleAuthc: RoleCredentials; pkg: string }) {
      const { body } = await supertestWithoutAuth
        .delete(`/api/fleet/epm/packages/${pkg}`)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader());
      return body;
    },
  };
}
