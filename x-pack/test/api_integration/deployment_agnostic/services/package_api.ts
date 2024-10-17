/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SupertestWithRoleScopeType } from '.';

export interface CustomIntegration {
  integrationName: string;
  datasets: IntegrationDataset[];
}

export interface IntegrationDataset {
  name: string;
  type: 'logs' | 'metrics' | 'synthetics' | 'traces';
}

export function PackageApiProvider() {
  return {
    async installCustomIntegration({
      roleScopedSupertestWithCookieCredentials,
      customIntegration,
    }: {
      roleScopedSupertestWithCookieCredentials: SupertestWithRoleScopeType;
      customIntegration: CustomIntegration;
    }) {
      const { integrationName, datasets } = customIntegration;

      const { body } = await roleScopedSupertestWithCookieCredentials
        .post(`/api/fleet/epm/custom_integrations`)
        .send({ integrationName, datasets });
      return body;
    },
    async installPackage({
      roleScopedSupertestWithCookieCredentials,
      pkg,
    }: {
      roleScopedSupertestWithCookieCredentials: SupertestWithRoleScopeType;
      pkg: string;
    }) {
      const {
        body: {
          item: { latestVersion: version },
        },
      } = await roleScopedSupertestWithCookieCredentials
        .get(`/api/fleet/epm/packages/${pkg}`)
        .send({ force: true });

      const { body } = await roleScopedSupertestWithCookieCredentials
        .post(`/api/fleet/epm/packages/${pkg}/${version}`)
        .send({ force: true });
      return body;
    },
    async uninstallPackage({
      roleScopedSupertestWithCookieCredentials,
      pkg,
    }: {
      roleScopedSupertestWithCookieCredentials: SupertestWithRoleScopeType;
      pkg: string;
    }) {
      const { body } = await roleScopedSupertestWithCookieCredentials.delete(
        `/api/fleet/epm/packages/${pkg}`
      );
      return body;
    },
  };
}
