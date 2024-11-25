/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { APIReturnType } from '@kbn/dataset-quality-plugin/common/rest';
import { CustomIntegration } from '../../../services/package_api';
import { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';
import { RoleCredentials, SupertestWithRoleScopeType } from '../../../services';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const samlAuth = getService('samlAuth');
  const roleScopedSupertest = getService('roleScopedSupertest');
  const packageApi = getService('packageApi');

  const endpoint = 'GET /internal/dataset_quality/integrations';
  type Integration = APIReturnType<typeof endpoint>['integrations'][0];

  const integrationPackages = ['system', 'synthetics'];
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

  async function callApiAs({
    roleScopedSupertestWithCookieCredentials,
  }: {
    roleScopedSupertestWithCookieCredentials: SupertestWithRoleScopeType;
  }): Promise<any> {
    const { body } = await roleScopedSupertestWithCookieCredentials.get(
      '/internal/dataset_quality/integrations'
    );

    return body;
  }

  describe('Integrations', () => {
    let adminRoleAuthc: RoleCredentials;
    let supertestAdminWithCookieCredentials: SupertestWithRoleScopeType;
    let preExistingIntegrations: string[];

    before(async () => {
      adminRoleAuthc = await samlAuth.createM2mApiKeyWithRoleScope('admin');
      supertestAdminWithCookieCredentials = await roleScopedSupertest.getSupertestWithRoleScope(
        'admin',
        {
          useCookieHeader: true,
          withInternalHeaders: true,
        }
      );
    });

    after(async () => {
      await samlAuth.invalidateM2mApiKeyWithRoleScope(adminRoleAuthc);
    });

    describe('gets the installed integrations', () => {
      before(async () => {
        preExistingIntegrations = (
          await callApiAs({
            roleScopedSupertestWithCookieCredentials: supertestAdminWithCookieCredentials,
          })
        ).integrations.map((integration: Integration) => integration.name);

        await Promise.all(
          integrationPackages.map((pkg) =>
            packageApi.installPackage({
              roleAuthc: adminRoleAuthc,
              pkg,
            })
          )
        );
      });

      it('returns all installed integrations and its datasets map', async () => {
        const body = await callApiAs({
          roleScopedSupertestWithCookieCredentials: supertestAdminWithCookieCredentials,
        });

        expect(
          new Set(body.integrations.map((integration: Integration) => integration.name))
        ).to.eql(new Set(preExistingIntegrations.concat(['synthetics', 'system'])));

        expect(
          body.integrations.find((integration: Integration) => integration.name === 'synthetics')
            ?.datasets
        ).not.empty();
        expect(
          body.integrations.find((integration: Integration) => integration.name === 'system')
            ?.datasets
        ).not.empty();
      });

      after(
        async () =>
          await Promise.all(
            integrationPackages.map((pkg) =>
              packageApi.uninstallPackage({ roleAuthc: adminRoleAuthc, pkg })
            )
          )
      );
    });

    describe('gets the custom installed integrations', () => {
      before(async () => {
        preExistingIntegrations = (
          await callApiAs({
            roleScopedSupertestWithCookieCredentials: supertestAdminWithCookieCredentials,
          })
        ).integrations.map((integration: Integration) => integration.name);

        await Promise.all(
          customIntegrations.map((customIntegration: CustomIntegration) =>
            packageApi.installCustomIntegration({ roleAuthc: adminRoleAuthc, customIntegration })
          )
        );
      });

      it('returns custom integrations and its datasets map', async () => {
        const body = await callApiAs({
          roleScopedSupertestWithCookieCredentials: supertestAdminWithCookieCredentials,
        });

        expect(
          new Set(body.integrations.map((integration: Integration) => integration.name))
        ).to.eql(new Set(preExistingIntegrations.concat('my.custom.integration')));

        expect(
          Object.entries(
            body.integrations.find(
              (integration: Integration) => integration.name === 'my.custom.integration'
            ).datasets
          ).sort()
        ).to.eql(Object.entries({ 'my.custom.integration': 'My.custom.integration' }).sort());
      });

      after(
        async () =>
          await Promise.all(
            customIntegrations.map((customIntegration: CustomIntegration) =>
              packageApi.uninstallPackage({
                roleAuthc: adminRoleAuthc,
                pkg: customIntegration.integrationName,
              })
            )
          )
      );
    });
  });
}
