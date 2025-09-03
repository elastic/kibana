/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { RoleCredentials } from '@kbn/ftr-common-functional-services';
import {
  EncryptedSyntheticsSavedMonitor,
  HTTPFields,
  MonitorFields,
  PrivateLocation,
} from '@kbn/synthetics-plugin/common/runtime_types';
import { SYNTHETICS_API_URLS } from '@kbn/synthetics-plugin/common/constants';
import expect from '@kbn/expect';
import { DeploymentAgnosticFtrProviderContext } from '../../ftr_provider_context';
import { getFixtureJson } from './helpers/get_fixture_json';
import { PrivateLocationTestService } from '../../services/synthetics_private_location';
import { SyntheticsMonitorTestService } from '../../services/synthetics_monitor';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  describe('DeleteMonitorRoute', function () {
    const supertest = getService('supertestWithoutAuth');
    const kibanaServer = getService('kibanaServer');
    const samlAuth = getService('samlAuth');

    const testPrivateLocations = new PrivateLocationTestService(getService);
    const monitorTestService = new SyntheticsMonitorTestService(getService);

    let _httpMonitorJson: HTTPFields;
    let httpMonitorJson: HTTPFields;
    let editorUser: RoleCredentials;
    let testPolicyId = '';
    let privateLocations: PrivateLocation[];

    const saveMonitor = async (
      monitor: MonitorFields
    ): Promise<EncryptedSyntheticsSavedMonitor> => {
      const res = await supertest
        .post(SYNTHETICS_API_URLS.SYNTHETICS_MONITORS)
        .set(editorUser.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send(monitor);

      expect(res.status).to.eql(200, JSON.stringify(res.body));

      return res.body;
    };

    const deleteMonitor = async (monitorId?: string | string[], statusCode = 200) => {
      return monitorTestService.deleteMonitor(editorUser, monitorId, statusCode, 'default');
    };

    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await testPrivateLocations.installSyntheticsPackage();
      const testPolicyName = 'Fleet test server policy' + Date.now();
      const apiResponse = await testPrivateLocations.addFleetPolicy(testPolicyName);
      testPolicyId = apiResponse.body.item.id;
      privateLocations = await testPrivateLocations.setTestLocations([testPolicyId]);
      editorUser = await samlAuth.createM2mApiKeyWithRoleScope('editor');

      _httpMonitorJson = getFixtureJson('http_monitor');
    });

    beforeEach(() => {
      httpMonitorJson = {
        ..._httpMonitorJson,
        locations: [privateLocations[0]],
      };
    });

    it('deletes monitor by id', async () => {
      const { id: monitorId } = await saveMonitor(httpMonitorJson as MonitorFields);

      const deleteResponse = await deleteMonitor(monitorId);

      expect(deleteResponse.body).eql([{ id: monitorId, deleted: true }]);

      // Hit get endpoint and expect 404 as well
      await supertest
        .get(SYNTHETICS_API_URLS.SYNTHETICS_MONITORS + '/' + monitorId)
        .set(editorUser.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .expect(404);
    });

    it('deletes monitor by param id', async () => {
      const { id: monitorId } = await saveMonitor(httpMonitorJson as MonitorFields);

      const deleteResponse = await monitorTestService.deleteMonitorByIdParam(
        editorUser,
        monitorId,
        200,
        'default'
      );

      expect(deleteResponse.body).eql([{ id: monitorId, deleted: true }]);

      // Hit get endpoint and expect 404 as well
      await supertest
        .get(SYNTHETICS_API_URLS.SYNTHETICS_MONITORS + '/' + monitorId)
        .set(editorUser.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .expect(404);
    });

    it('throws error if both body and param are missing', async () => {
      await supertest
        .delete(SYNTHETICS_API_URLS.SYNTHETICS_MONITORS)
        .send()
        .set(editorUser.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .expect(400);
    });

    it('deletes multiple monitors by id', async () => {
      const { id: monitorId } = await saveMonitor(httpMonitorJson as MonitorFields);
      const { id: monitorId2 } = await saveMonitor({
        ...httpMonitorJson,
        name: 'another -2',
      } as MonitorFields);

      const deleteResponse = await deleteMonitor([monitorId2, monitorId]);

      expect(
        deleteResponse.body.sort((a: { id: string }, b: { id: string }) => (a.id > b.id ? 1 : -1))
      ).eql(
        [
          { id: monitorId2, deleted: true },
          { id: monitorId, deleted: true },
        ].sort((a, b) => (a.id > b.id ? 1 : -1))
      );

      // Hit get endpoint and expect 404 as well
      await supertest
        .get(SYNTHETICS_API_URLS.SYNTHETICS_MONITORS + '/' + monitorId)
        .set(editorUser.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .expect(404);
    });

    it('returns 404 if monitor id is not found', async () => {
      const invalidMonitorId = 'invalid-id';
      const expected404Message = `Monitor id ${invalidMonitorId} not found!`;

      const deleteResponse = await deleteMonitor(invalidMonitorId);

      expect(deleteResponse.status).eql(200);
      expect(deleteResponse.body).eql([
        {
          id: invalidMonitorId,
          deleted: false,
          error: expected404Message,
        },
      ]);
    });

    it('validates empty monitor id', async () => {
      await deleteMonitor(undefined, 400);
      await deleteMonitor([], 400);
    });
  });
}
