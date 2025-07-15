/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { CustomIntegration } from '@kbn/test-suites-xpack-platform/api_integration_deployment_agnostic/services/package_api';
import { DeploymentAgnosticFtrProviderContext } from '../../ftr_provider_context';
import { RoleCredentials, SupertestWithRoleScopeType } from '../../services';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const samlAuth = getService('samlAuth');
  const roleScopedSupertest = getService('roleScopedSupertest');
  const packageApi = getService('packageApi');

  const integrationPackages = ['nginx', 'apache'];
  const customIntegrations: CustomIntegration[] = [
    {
      integrationName: 'my.custom.integration',
      datasets: [
        {
          name: 'my.custom.integration',
          type: 'logs',
        },
      ],
    },
  ];

  async function callApiAs(
    roleScopedSupertestWithCookieCredentials: SupertestWithRoleScopeType,
    integration: string
  ) {
    return roleScopedSupertestWithCookieCredentials.get(
      `/internal/dataset_quality/integrations/${integration}/dashboards`
    );
  }

  describe('Integration dashboards', () => {
    let adminRoleAuthc: RoleCredentials;
    before(async () => {
      adminRoleAuthc = await samlAuth.createM2mApiKeyWithRoleScope('admin');
      await Promise.all(
        integrationPackages.map((pkg) =>
          packageApi.installPackage({
            roleAuthc: adminRoleAuthc,
            pkg,
          })
        )
      );

      await Promise.all(
        customIntegrations.map((customIntegration) =>
          packageApi.installCustomIntegration({
            roleAuthc: adminRoleAuthc,
            customIntegration,
          })
        )
      );
    });

    after(async () => {
      await Promise.all(
        integrationPackages.map((pkg) =>
          packageApi.uninstallPackage({ roleAuthc: adminRoleAuthc, pkg })
        )
      );

      await Promise.all(
        customIntegrations.map((customIntegration) =>
          packageApi.uninstallPackage({
            roleAuthc: adminRoleAuthc,
            pkg: customIntegration.integrationName,
          })
        )
      );

      await samlAuth.invalidateM2mApiKeyWithRoleScope(adminRoleAuthc);
    });

    describe('gets the installed integration dashboards', () => {
      let supertestViewerWithCookieCredentials: SupertestWithRoleScopeType;
      before(async () => {
        supertestViewerWithCookieCredentials = await roleScopedSupertest.getSupertestWithRoleScope(
          'viewer',
          {
            useCookieHeader: true,
            withInternalHeaders: true,
          }
        );
      });

      it('returns a non-empty body', async () => {
        const resp = await callApiAs(supertestViewerWithCookieCredentials, integrationPackages[0]);
        expect(resp.body).not.empty();
      });

      it('returns correct number of dashboard', async () => {
        const resp = await callApiAs(supertestViewerWithCookieCredentials, integrationPackages[1]);
        expect(resp.body.dashboards.length).to.eql(2);
      });

      it('returns a list of dashboards in the correct format', async () => {
        const expectedResult = {
          dashboards: [
            {
              id: 'nginx-023d2930-f1a5-11e7-a9ef-93c69af7b129',
              title: '[Metrics Nginx] Overview',
            },
            {
              id: 'nginx-046212a0-a2a1-11e7-928f-5dbe6f6f5519',
              title: '[Logs Nginx] Access and error logs',
            },
            {
              id: 'nginx-55a9e6e0-a29e-11e7-928f-5dbe6f6f5519',
              title: '[Logs Nginx] Overview',
            },
          ],
        };
        const resp = await callApiAs(supertestViewerWithCookieCredentials, integrationPackages[0]);
        expect(resp.body).to.eql(expectedResult);
      });

      it('returns an empty array for an integration without dashboards', async () => {
        const expectedResult = {
          dashboards: [],
        };
        const resp = await callApiAs(
          supertestViewerWithCookieCredentials,
          customIntegrations[0].integrationName
        );
        expect(resp.body).to.eql(expectedResult);
      });

      it('returns an empty array for an invalid integration', async () => {
        const expectedResult = {
          dashboards: [],
        };
        const resp = await callApiAs(supertestViewerWithCookieCredentials, 'invalid');
        expect(resp.body).to.eql(expectedResult);
      });
    });
  });
}
