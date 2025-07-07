/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { v4 as uuidv4 } from 'uuid';
import { RoleCredentials } from '@kbn/ftr-common-functional-services';
import {
  ConfigKey,
  ProjectMonitorsRequest,
  PrivateLocation,
} from '@kbn/synthetics-plugin/common/runtime_types';
import { REQUEST_TOO_LARGE_DELETE } from '@kbn/synthetics-plugin/server/routes/monitor_cruds/project_monitor/delete_monitor_project';
import { SYNTHETICS_API_URLS } from '@kbn/synthetics-plugin/common/constants';
import { PackagePolicy } from '@kbn/fleet-plugin/common';
import expect from '@kbn/expect';
import { syntheticsMonitorSavedObjectType } from '@kbn/synthetics-plugin/common/types/saved_objects';
import { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';
import { getFixtureJson } from './helpers/get_fixture_json';
import { PrivateLocationTestService } from '../../../services/synthetics_private_location';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  describe('DeleteProjectMonitors', function () {
    const supertest = getService('supertestWithoutAuth');
    const supertestWithAuth = getService('supertest');
    const kibanaServer = getService('kibanaServer');
    const samlAuth = getService('samlAuth');

    let projectMonitors: ProjectMonitorsRequest;
    let editorUser: RoleCredentials;
    let privateLocation: PrivateLocation;

    const testPrivateLocationsService = new PrivateLocationTestService(getService);

    const setUniqueIdsAndLocations = (
      request: ProjectMonitorsRequest,
      privateLocations: PrivateLocation[] = []
    ) => {
      return {
        ...request,
        monitors: request.monitors.map((monitor) => ({
          ...monitor,
          id: uuidv4(),
          locations: [],
          privateLocations: privateLocations.map((location) => location.label),
        })),
      };
    };

    before(async () => {
      await testPrivateLocationsService.installSyntheticsPackage();
      editorUser = await samlAuth.createM2mApiKeyWithRoleScope('editor');
    });

    beforeEach(async () => {
      await kibanaServer.savedObjects.clean({ types: ['synthetics-private-location'] });
      privateLocation = await testPrivateLocationsService.addTestPrivateLocation();
      projectMonitors = setUniqueIdsAndLocations(getFixtureJson('project_browser_monitor'), [
        privateLocation,
      ]);
    });

    it('only allows 500 requests at a time', async () => {
      const project = 'test-brower-suite';
      const monitors = [];
      for (let i = 0; i < 550; i++) {
        monitors.push({
          ...projectMonitors.monitors[0],
          id: `test-id-${i}`,
          name: `test-name-${i}`,
        });
      }
      const monitorsToDelete = monitors.map((monitor) => monitor.id);

      try {
        await supertest
          .put(
            SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROJECT_UPDATE.replace('{projectName}', project)
          )
          .set(editorUser.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .send({ monitors: monitors.slice(0, 250) })
          .expect(200);

        await supertest
          .put(
            SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROJECT_UPDATE.replace('{projectName}', project)
          )
          .set(editorUser.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .send({ monitors: monitors.slice(250, 251) })
          .expect(200);

        const savedObjectsResponse = await supertest
          .get(SYNTHETICS_API_URLS.SYNTHETICS_MONITORS)
          .query({
            filter: `${syntheticsMonitorSavedObjectType}.attributes.project_id: "${project}"`,
          })
          .set(editorUser.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .expect(200);
        const { total } = savedObjectsResponse.body;
        expect(total).to.eql(251);

        const response = await supertest
          .delete(
            SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROJECT_DELETE.replace('{projectName}', project)
          )
          .set(editorUser.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .send({ monitors: monitorsToDelete })
          .expect(400);
        const { message } = response.body;
        expect(message).to.eql(REQUEST_TOO_LARGE_DELETE);
      } finally {
        await supertest
          .delete(
            SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROJECT_DELETE.replace('{projectName}', project)
          )
          .set(editorUser.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .send({ monitors: monitorsToDelete.slice(0, 250) })
          .expect(200);
        await supertest
          .delete(
            SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROJECT_DELETE.replace('{projectName}', project)
          )
          .set(editorUser.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .send({ monitors: monitorsToDelete.slice(250, 251) })
          .expect(200);
      }
    });

    it('project monitors - handles browser monitors', async () => {
      const monitorToDelete = 'second-monitor-id';
      const monitors = [
        projectMonitors.monitors[0],
        {
          ...projectMonitors.monitors[0],
          id: monitorToDelete,
        },
      ];
      const project = 'test-brower-suite';

      try {
        await supertest
          .put(
            SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROJECT_UPDATE.replace('{projectName}', project)
          )
          .set(editorUser.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .send({ monitors })
          .expect(200);

        const savedObjectsResponse = await supertest
          .get(SYNTHETICS_API_URLS.SYNTHETICS_MONITORS)
          .query({
            filter: `${syntheticsMonitorSavedObjectType}.attributes.project_id: "${project}"`,
          })
          .set(editorUser.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .expect(200);
        const { total } = savedObjectsResponse.body;
        expect(total).to.eql(2);
        const monitorsToDelete = [monitorToDelete];

        const response = await supertest
          .delete(
            SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROJECT_DELETE.replace('{projectName}', project)
          )
          .set(editorUser.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .send({ monitors: monitorsToDelete })
          .expect(200);

        expect(response.body.deleted_monitors).to.eql(monitorsToDelete);

        const responseAfterDeletion = await supertest
          .get(SYNTHETICS_API_URLS.SYNTHETICS_MONITORS)
          .query({
            filter: `${syntheticsMonitorSavedObjectType}.attributes.project_id: "${project}"`,
          })
          .set(editorUser.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .expect(200);
        const { total: totalAfterDeletion } = responseAfterDeletion.body;
        expect(totalAfterDeletion).to.eql(1);
      } finally {
        const monitorsToDelete = monitors.map((monitor) => monitor.id);
        await supertest
          .delete(
            SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROJECT_DELETE.replace('{projectName}', project)
          )
          .set(editorUser.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .send({ monitors: monitorsToDelete })
          .expect(200);
      }
    });

    it('does not delete monitors from a different project', async () => {
      const monitors = [...projectMonitors.monitors];
      const project = 'test-brower-suite';
      const secondProject = 'second-project';

      try {
        await supertest
          .put(
            SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROJECT_UPDATE.replace('{projectName}', project)
          )
          .set(editorUser.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .send({ monitors })
          .expect(200);

        await supertest
          .put(
            SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROJECT_UPDATE.replace(
              '{projectName}',
              secondProject
            )
          )
          .set(editorUser.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .send({ monitors })
          .expect(200);

        const savedObjectsResponse = await supertest
          .get(SYNTHETICS_API_URLS.SYNTHETICS_MONITORS)
          .query({
            filter: `${syntheticsMonitorSavedObjectType}.attributes.project_id: "${project}"`,
          })
          .set(editorUser.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .expect(200);
        const secondProjectSavedObjectResponse = await supertest
          .get(SYNTHETICS_API_URLS.SYNTHETICS_MONITORS)
          .query({
            filter: `${syntheticsMonitorSavedObjectType}.attributes.project_id: "${secondProject}"`,
          })
          .set(editorUser.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .expect(200);
        const { total } = savedObjectsResponse.body;
        const { total: secondProjectTotal } = secondProjectSavedObjectResponse.body;
        expect(total).to.eql(monitors.length);
        expect(secondProjectTotal).to.eql(monitors.length);
        const monitorsToDelete = monitors.map((monitor) => monitor.id);

        const response = await supertest
          .delete(
            SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROJECT_DELETE.replace('{projectName}', project)
          )
          .set(editorUser.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .send({ monitors: monitorsToDelete })
          .expect(200);

        expect(response.body.deleted_monitors).to.eql(monitorsToDelete);

        const responseAfterDeletion = await supertest
          .get(SYNTHETICS_API_URLS.SYNTHETICS_MONITORS)
          .query({
            filter: `${syntheticsMonitorSavedObjectType}.attributes.project_id: "${project}"`,
          })
          .set(editorUser.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .expect(200);
        const secondResponseAfterDeletion = await supertest
          .get(SYNTHETICS_API_URLS.SYNTHETICS_MONITORS)
          .query({
            filter: `${syntheticsMonitorSavedObjectType}.attributes.project_id: "${secondProject}"`,
          })
          .set(editorUser.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .expect(200);
        const { total: totalAfterDeletion } = responseAfterDeletion.body;
        const { total: secondProjectTotalAfterDeletion } = secondResponseAfterDeletion.body;
        expect(totalAfterDeletion).to.eql(0);
        expect(secondProjectTotalAfterDeletion).to.eql(monitors.length);
      } finally {
        const monitorsToDelete = monitors.map((monitor) => monitor.id);

        await supertest
          .delete(
            SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROJECT_DELETE.replace('{projectName}', project)
          )
          .set(editorUser.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .send({ monitors: monitorsToDelete })
          .expect(200);
        await supertest
          .delete(
            SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROJECT_DELETE.replace(
              '{projectName}',
              secondProject
            )
          )
          .set(editorUser.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .send({ monitors: monitorsToDelete })
          .expect(200);
      }
    });

    it('does not delete monitors from the same project in a different space project', async () => {
      const monitors = [...projectMonitors.monitors];
      const project = 'test-brower-suite';
      const SPACE_ID = `test-space-${uuidv4()}`;
      const SPACE_NAME = `test-space-name ${uuidv4()}`;
      await kibanaServer.spaces.create({ id: SPACE_ID, name: SPACE_NAME });
      const spaceScopedPrivateLocation = await testPrivateLocationsService.addTestPrivateLocation(
        SPACE_ID
      );

      try {
        await supertest
          .put(
            SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROJECT_UPDATE.replace('{projectName}', project)
          )
          .set(editorUser.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .send({
            monitors: monitors.map((monitor) => ({
              ...monitor,
              privateLocations: [privateLocation.label],
            })),
          })
          .expect(200);

        await supertest
          .put(
            `/s/${SPACE_ID}${SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROJECT_UPDATE.replace(
              '{projectName}',
              project
            )}`
          )
          .set(editorUser.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .send({
            monitors: monitors.map((monitor) => ({
              ...monitor,
              privateLocations: [spaceScopedPrivateLocation.label],
            })),
          })
          .expect(200);

        const savedObjectsResponse = await supertest
          .get(SYNTHETICS_API_URLS.SYNTHETICS_MONITORS)
          .query({
            filter: `${syntheticsMonitorSavedObjectType}.attributes.project_id: "${project}"`,
          })
          .set(editorUser.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .expect(200);
        const secondSpaceProjectSavedObjectResponse = await supertest
          .get(`/s/${SPACE_ID}${SYNTHETICS_API_URLS.SYNTHETICS_MONITORS}`)
          .query({
            filter: `${syntheticsMonitorSavedObjectType}.attributes.project_id: "${project}"`,
          })
          .set(editorUser.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .expect(200);
        const { total } = savedObjectsResponse.body;
        const { total: secondSpaceTotal } = secondSpaceProjectSavedObjectResponse.body;

        expect(total).to.eql(monitors.length);
        expect(secondSpaceTotal).to.eql(monitors.length);
        const monitorsToDelete = monitors.map((monitor) => monitor.id);

        const response = await supertest
          .delete(
            `/s/${SPACE_ID}${SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROJECT_DELETE.replace(
              '{projectName}',
              project
            )}`
          )
          .set(editorUser.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .send({ monitors: monitorsToDelete })
          .expect(200);

        expect(response.body.deleted_monitors).to.eql(monitorsToDelete);

        const responseAfterDeletion = await supertest
          .get(SYNTHETICS_API_URLS.SYNTHETICS_MONITORS)
          .query({
            filter: `${syntheticsMonitorSavedObjectType}.attributes.project_id: "${project}"`,
          })
          .set(editorUser.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .expect(200);
        const secondSpaceResponseAfterDeletion = await supertest
          .get(`/s/${SPACE_ID}${SYNTHETICS_API_URLS.SYNTHETICS_MONITORS}`)
          .query({
            filter: `${syntheticsMonitorSavedObjectType}.attributes.project_id: "${project}"`,
          })
          .set(editorUser.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .expect(200);
        const { total: totalAfterDeletion } = responseAfterDeletion.body;
        const { total: secondProjectTotalAfterDeletion } = secondSpaceResponseAfterDeletion.body;
        expect(totalAfterDeletion).to.eql(monitors.length);
        expect(secondProjectTotalAfterDeletion).to.eql(0);
      } finally {
        const monitorsToDelete = monitors.map((monitor) => monitor.id);

        await supertest
          .delete(
            `/s/${SPACE_ID}${SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROJECT_DELETE.replace(
              '{projectName}',
              project
            )}`
          )
          .set(editorUser.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .send({ monitors: monitorsToDelete })
          .expect(200);

        await supertest
          .delete(
            SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROJECT_DELETE.replace('{projectName}', project)
          )
          .set(editorUser.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .send({ monitors: monitorsToDelete })
          .expect(200);
      }
    });

    it('deletes integration policies when project monitors are deleted', async () => {
      const monitors = [
        { ...projectMonitors.monitors[0], privateLocations: [privateLocation.label] },
      ];
      const project = 'test-brower-suite';

      try {
        await supertest
          .put(
            SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROJECT_UPDATE.replace('{projectName}', project)
          )
          .set(editorUser.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .send({ monitors })
          .expect(200);

        const savedObjectsResponse = await supertest
          .get(SYNTHETICS_API_URLS.SYNTHETICS_MONITORS)
          .query({
            filter: `${syntheticsMonitorSavedObjectType}.attributes.project_id: "${project}"`,
          })
          .set(editorUser.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .expect(200);
        const { total } = savedObjectsResponse.body;
        expect(total).to.eql(monitors.length);
        const apiResponsePolicy = await supertestWithAuth.get(
          '/api/fleet/package_policies?page=1&perPage=2000&kuery=ingest-package-policies.package.name%3A%20synthetics'
        );

        const packagePolicy = apiResponsePolicy.body.items.find(
          (pkgPolicy: PackagePolicy) =>
            pkgPolicy.id ===
            savedObjectsResponse.body.monitors[0][ConfigKey.CUSTOM_HEARTBEAT_ID] +
              '-' +
              privateLocation.id
        );
        expect(packagePolicy.policy_id).to.be(privateLocation.id);

        const monitorsToDelete = monitors.map((monitor) => monitor.id);

        const response = await supertest
          .delete(
            SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROJECT_DELETE.replace('{projectName}', project)
          )
          .set(editorUser.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .send({ monitors: monitorsToDelete })
          .expect(200);

        expect(response.body.deleted_monitors).to.eql(monitorsToDelete);

        const responseAfterDeletion = await supertest
          .get(SYNTHETICS_API_URLS.SYNTHETICS_MONITORS)
          .query({
            filter: `${syntheticsMonitorSavedObjectType}.attributes.project_id: "${project}"`,
          })
          .set(editorUser.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .expect(200);
        const { total: totalAfterDeletion } = responseAfterDeletion.body;
        expect(totalAfterDeletion).to.eql(0);
        const apiResponsePolicy2 = await supertestWithAuth.get(
          '/api/fleet/package_policies?page=1&perPage=2000&kuery=ingest-package-policies.package.name%3A%20synthetics'
        );

        const packagePolicy2 = apiResponsePolicy2.body.items.find(
          (pkgPolicy: PackagePolicy) =>
            pkgPolicy.id ===
            savedObjectsResponse.body.monitors[0][ConfigKey.CUSTOM_HEARTBEAT_ID] +
              '-' +
              privateLocation.id
        );
        expect(packagePolicy2).to.be(undefined);
      } finally {
        const monitorsToDelete = monitors.map((monitor) => monitor.id);

        await supertest
          .delete(
            SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROJECT_DELETE.replace('{projectName}', project)
          )
          .set(editorUser.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .send({ monitors: monitorsToDelete })
          .expect(200);
      }
    });
  });
}
