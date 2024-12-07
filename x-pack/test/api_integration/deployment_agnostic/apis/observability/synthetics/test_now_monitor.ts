/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RoleCredentials } from '@kbn/ftr-common-functional-services';
import { MonitorFields } from '@kbn/synthetics-plugin/common/runtime_types';
import { SYNTHETICS_API_URLS } from '@kbn/synthetics-plugin/common/constants';
import expect from '@kbn/expect';
import { omit } from 'lodash';
import { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';
import { getFixtureJson } from './helpers/get_fixture_json';
import { SyntheticsMonitorTestService } from '../../../services/synthetics_monitor';
import { LOCAL_LOCATION } from './get_filters';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  describe('RunTestManually', function () {
    this.tags('skipCloud');

    const supertest = getService('supertestWithoutAuth');
    const kibanaServer = getService('kibanaServer');
    const samlAuth = getService('samlAuth');

    const monitorTestService = new SyntheticsMonitorTestService(getService);

    let newMonitor: MonitorFields;
    let editorUser: RoleCredentials;

    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      editorUser = await samlAuth.createM2mApiKeyWithRoleScope('editor');
      await supertest
        .put(SYNTHETICS_API_URLS.SYNTHETICS_ENABLEMENT)
        .set(editorUser.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .expect(200);
      newMonitor = getFixtureJson('http_monitor');
    });

    it('runs test manually', async () => {
      const resp = await monitorTestService.addMonitor(newMonitor, editorUser);

      const res = await supertest
        .post(SYNTHETICS_API_URLS.TRIGGER_MONITOR + `/${resp.id}`)
        .set(editorUser.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .expect(200);

      const result = res.body;
      expect(typeof result.testRunId).to.eql('string');
      expect(typeof result.configId).to.eql('string');
      expect(result.schedule).to.eql({ number: '5', unit: 'm' });
      expect(result.locations).to.eql([LOCAL_LOCATION]);

      expect(omit(result.monitor, ['id', 'config_id'])).to.eql(
        omit(newMonitor, ['id', 'config_id'])
      );
    });

    it('works in non default space', async () => {
      const { SPACE_ID } = await monitorTestService.addNewSpace();

      const resp = await supertest
        .post(`/s/${SPACE_ID}${SYNTHETICS_API_URLS.SYNTHETICS_MONITORS}`)
        .set(editorUser.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send(newMonitor)
        .expect(200);

      const res = await supertest
        .post(`/s/${SPACE_ID}${SYNTHETICS_API_URLS.TRIGGER_MONITOR}/${resp.body.id}`)
        .set(editorUser.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .expect(200);

      const result = res.body;
      expect(typeof result.testRunId).to.eql('string');
      expect(typeof result.configId).to.eql('string');
      expect(result.schedule).to.eql({ number: '5', unit: 'm' });
      expect(result.locations).to.eql([LOCAL_LOCATION]);

      expect(omit(result.monitor, ['id', 'config_id'])).to.eql(
        omit(newMonitor, ['id', 'config_id'])
      );
    });
  });
}
