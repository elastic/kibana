/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { v4 as uuidv4 } from 'uuid';
import expect from '@kbn/expect';
import { RoleCredentials } from '@kbn/ftr-common-functional-services';
import {
  legacySyntheticsMonitorTypeSingle,
  syntheticsMonitorSavedObjectType,
} from '@kbn/synthetics-plugin/common/types/saved_objects';
import { SYNTHETICS_API_URLS } from '@kbn/synthetics-plugin/common/constants';
import { DeploymentAgnosticFtrProviderContext } from '../../ftr_provider_context';
import { getFixtureJson } from './helpers/get_fixture_json';
import { PrivateLocationTestService } from '../../services/synthetics_private_location';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  describe('CreateProjectMonitorsMultiSpace', function () {
    this.tags(['skipCloud', 'skipMKI']);
    const supertest = getService('supertestWithoutAuth');
    const kibanaServer = getService('kibanaServer');
    const testPrivateLocations = new PrivateLocationTestService(getService);
    const samlAuth = getService('samlAuth');

    let editorUser: RoleCredentials;

    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      editorUser = await samlAuth.createM2mApiKeyWithRoleScope('editor');
      await supertest
        .put(SYNTHETICS_API_URLS.SYNTHETICS_ENABLEMENT)
        .set(editorUser.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .expect(200);
      await testPrivateLocations.installSyntheticsPackage();

      await supertest
        .post(SYNTHETICS_API_URLS.PARAMS)
        .set(editorUser.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({ key: 'testGlobalParam', value: 'testGlobalParamValue' })
        .expect(200);
      await supertest
        .post(SYNTHETICS_API_URLS.PARAMS)
        .set(editorUser.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({ key: 'testGlobalParam2', value: 'testGlobalParamValue2' })
        .expect(200);
      const spaces = (await kibanaServer.spaces.list()) as Array<{
        id: string;
      }>;
      for (let i = 0; i < spaces.length; i++) {
        if (spaces[i].id !== 'default') await kibanaServer.spaces.delete(spaces[i].id);
      }
    });

    let multiSpaceProject: string;
    let multiSpaceMonitor: any;
    let multiSpaceMonitorId: string;

    beforeEach(async () => {
      multiSpaceProject = `legacy-project-${uuidv4()}`;
      multiSpaceMonitorId = uuidv4();
      multiSpaceMonitor = {
        ...getFixtureJson('project_http_monitor').monitors[1],
        id: multiSpaceMonitorId,
        name: `Multi space Monitor ${multiSpaceMonitorId}`,
      };
      await kibanaServer.savedObjects.clean({
        types: [legacySyntheticsMonitorTypeSingle, 'synthetics-monitor', 'ingest-package-policies'],
      });
    });

    const createProjectMonitor = async ({
      project,
      status,
      monitors,
      soType,
    }: {
      project: string;
      monitors: any;
      status?: number;
      soType?: string;
    }) => {
      const url =
        SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROJECT_UPDATE.replace('{projectName}', project) +
        (soType ? `?savedObjectType=${soType}` : '');

      const resp = await supertest
        .put(url)
        .set(editorUser.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({ monitors });
      expect(resp.status).eql(status ?? 200);
      return resp;
    };

    const getProjectMonitor = async ({ journeyId }: { journeyId: string }) => {
      return await supertest
        .get(SYNTHETICS_API_URLS.SYNTHETICS_MONITORS + '?internal=true')
        .query({
          filter: `${legacySyntheticsMonitorTypeSingle}.attributes.journey_id: ${journeyId}`,
        })
        .set(editorUser.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .expect(200);
    };

    it('should create a multi space monitor', async () => {
      const { body } = await createProjectMonitor({
        project: multiSpaceProject,
        monitors: [{ ...multiSpaceMonitor, spaces: ['default', 'space1'] }],
      });

      expect(body).eql({
        updatedMonitors: [],
        createdMonitors: [multiSpaceMonitorId],
        failedMonitors: [],
      });

      // Fetch from SO API to verify creation
      const soRes = await kibanaServer.savedObjects.find({
        type: syntheticsMonitorSavedObjectType,
      });
      expect(soRes.saved_objects[0].namespaces).to.eql(['default', 'space1']);
      const found = soRes.saved_objects.find(
        (obj: any) => obj.attributes.journey_id === multiSpaceMonitorId
      );
      expect(found).not.to.be(undefined);
      expect(found?.attributes.name).to.eql(multiSpaceMonitor.name);
    });

    it('should fetch a multi space project monitor', async () => {
      // Create first
      await createProjectMonitor({
        project: multiSpaceProject,
        monitors: [{ ...multiSpaceMonitor, spaces: ['default', 'space1'] }],
      });

      // Fetch via monitors API
      const res = await getProjectMonitor({
        journeyId: multiSpaceMonitorId,
      });

      expect(res.body.monitors.length).to.be(1);
      expect(res.body.monitors[0].spaces).to.eql(['default', 'space1']);
      expect(res.body.monitors[0].journey_id).to.eql(multiSpaceMonitorId);
      expect(res.body.monitors[0].name).to.eql(multiSpaceMonitor.name);
    });

    it('should edit a legacy project monitor and it should recreate multi space monitor', async () => {
      const { body } = await createProjectMonitor({
        project: multiSpaceProject,
        monitors: [{ ...multiSpaceMonitor }],
        soType: legacySyntheticsMonitorTypeSingle,
      });

      expect(body).eql({
        createdMonitors: [multiSpaceMonitorId],
        updatedMonitors: [],
        failedMonitors: [],
      });

      // Edit via project update
      const editedName = `Multi space Monitor Edited ${multiSpaceMonitorId}`;
      const editedMonitor = {
        ...multiSpaceMonitor,
        name: editedName,
        spaces: ['default', 'space1'],
      };

      const { body: editBody } = await createProjectMonitor({
        project: multiSpaceProject,
        monitors: [editedMonitor],
      });

      expect(editBody).eql({
        updatedMonitors: [multiSpaceMonitorId],
        createdMonitors: [],
        failedMonitors: [],
      });

      // Fetch and verify edit
      const soRes = await kibanaServer.savedObjects.find({
        type: syntheticsMonitorSavedObjectType,
      });
      const found = soRes.saved_objects.find(
        (obj: any) => obj.attributes.journey_id === multiSpaceMonitorId
      );
      expect(found?.attributes.name).to.eql(editedName);

      // verify deletion from legacy SO type
      const legacySoRes = await kibanaServer.savedObjects.find({
        type: legacySyntheticsMonitorTypeSingle,
      });
      const legacyFound = legacySoRes.saved_objects.find(
        (obj: any) => obj.attributes.journey_id === multiSpaceMonitorId
      );
      expect(legacyFound).to.be(undefined);
    });
  });
}
