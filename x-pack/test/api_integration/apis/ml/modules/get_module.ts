/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../../ftr_provider_context';
import { USER } from '../../../../functional/services/ml/security_common';
import { COMMON_REQUEST_HEADERS } from '../../../../functional/services/ml/common';

const moduleIds = [
  'apache_ecs',
  'apm_jsbase',
  'apm_nodejs',
  'apm_transaction',
  'auditbeat_process_docker_ecs',
  'auditbeat_process_hosts_ecs',
  'logs_ui_analysis',
  'logs_ui_categories',
  'metricbeat_system_ecs',
  'nginx_ecs',
  'sample_data_ecommerce',
  'sample_data_weblogs',
  'siem_auditbeat',
  'siem_auditbeat_auth',
  'siem_cloudtrail',
  'siem_packetbeat',
  'siem_winlogbeat',
  'siem_winlogbeat_auth',
  'uptime_heartbeat',
];

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertestWithoutAuth');
  const ml = getService('ml');

  async function executeGetModuleRequest(module: string, user: USER, rspCode: number) {
    const { body } = await supertest
      .get(`/api/ml/modules/get_module/${module}`)
      .auth(user, ml.securityCommon.getPasswordForUser(user))
      .set(COMMON_REQUEST_HEADERS)
      .expect(rspCode);

    return body;
  }

  describe('get_module', function () {
    before(async () => {
      await ml.testResources.setKibanaTimeZoneToUTC();
    });

    it('lists all modules', async () => {
      const rspBody = await executeGetModuleRequest('', USER.ML_POWERUSER, 200);
      expect(rspBody).to.be.an(Array);

      const responseModuleIds = rspBody.map((module: { id: string }) => module.id);
      expect(responseModuleIds).to.eql(moduleIds);
    });

    for (const moduleId of moduleIds) {
      it(`loads module ${moduleId}`, async () => {
        const rspBody = await executeGetModuleRequest(moduleId, USER.ML_POWERUSER, 200);
        expect(rspBody).to.be.an(Object);

        expect(rspBody.id).to.eql(moduleId);
      });
    }
  });
};
