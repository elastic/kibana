/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../ftr_provider_context';

const DASHBOARD_API_PATH = '/api/dashboards';
const DASHBOARD_API_VERSION = '2023-10-31';

const DASHBOARD_VIEWER_KIBANA = [
  {
    feature: {
      dashboard: ['read'],
      discover: ['read'],
    },
    spaces: ['*'],
  },
];

const DASHBOARD_VIEWER_V2_KIBANA = [
  {
    feature: {
      dashboard_v2: ['read'],
      discover_v2: ['read'],
    },
    spaces: ['*'],
  },
];

const DASHBOARD_VIEWER_ES = {
  indices: [{ names: ['*'], privileges: ['read', 'view_index_metadata'] }],
};

export default function ({ getService }: FtrProviderContext) {
  const svlCommonApi = getService('svlCommonApi');
  const samlAuth = getService('samlAuth');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const es = getService('es');

  describe('dashboard viewer role', function () {
    this.tags(['skipMKI']);

    afterEach(async () => {
      await samlAuth.deleteCustomRole();
    });

    async function expectDashboardAccessWithoutSiem(
      kibanaPrivileges: Array<{ feature: Record<string, string[]>; spaces: string[] }>
    ) {
      await samlAuth.setCustomRole({
        elasticsearch: DASHBOARD_VIEWER_ES,
        kibana: kibanaPrivileges,
      });
      const roleAuthc = await samlAuth.createM2mApiKeyWithCustomRoleScope();

      const dashboardsRes = await supertestWithoutAuth
        .get(DASHBOARD_API_PATH)
        .set(svlCommonApi.getInternalRequestHeader())
        .set(roleAuthc.apiKeyHeader)
        .set('elastic-api-version', DASHBOARD_API_VERSION);

      expect(dashboardsRes.status).to.be(200);

      const rulesRes = await supertestWithoutAuth
        .get('/api/detection_engine/rules/_find')
        .set(svlCommonApi.getInternalRequestHeader())
        .set(roleAuthc.apiKeyHeader);

      expect(rulesRes.status).to.be(403);

      await samlAuth.invalidateM2mApiKeyWithRoleScope(roleAuthc);
    }

    it('stores v1 Dashboard and Discover privileges on the Elasticsearch role', async () => {
      const admin = await samlAuth.createM2mApiKeyWithRoleScope('admin');

      await supertestWithoutAuth
        .put('/api/security/role/dashboard_viewer_v1')
        .set(svlCommonApi.getInternalRequestHeader())
        .set(admin.apiKeyHeader)
        .send({
          elasticsearch: DASHBOARD_VIEWER_ES,
          kibana: DASHBOARD_VIEWER_KIBANA,
        })
        .expect(204);

      const role = await es.security.getRole({ name: 'dashboard_viewer_v1' });
      const privileges = role.dashboard_viewer_v1.applications.flatMap(
        (application) => application.privileges
      );

      expect(privileges).to.contain('feature_dashboard.read');
      expect(privileges).to.contain('feature_discover.read');
      expect(privileges).not.to.contain('feature_siemV5.read');

      await es.security.deleteRole({ name: 'dashboard_viewer_v1' });
      await samlAuth.invalidateM2mApiKeyWithRoleScope(admin);
    });

    it('allows Dashboard access without Security privileges for v1 feature IDs', async () => {
      await expectDashboardAccessWithoutSiem(DASHBOARD_VIEWER_KIBANA);
    });

    it('allows Dashboard access without Security privileges for v2 feature IDs', async () => {
      await expectDashboardAccessWithoutSiem(DASHBOARD_VIEWER_V2_KIBANA);
    });
  });
}
