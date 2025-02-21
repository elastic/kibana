/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import moment from 'moment';
import semver from 'semver';
import { v4 as uuidv4 } from 'uuid';
import { RoleCredentials } from '@kbn/ftr-common-functional-services';
import { formatKibanaNamespace } from '@kbn/synthetics-plugin/common/formatters';
import {
  ConfigKey,
  HTTPFields,
  PrivateLocation,
  ServiceLocation,
} from '@kbn/synthetics-plugin/common/runtime_types';
import { SYNTHETICS_API_URLS } from '@kbn/synthetics-plugin/common/constants';
import { omit } from 'lodash';
import { PackagePolicy } from '@kbn/fleet-plugin/common';
import expect from '@kbn/expect';
import rawExpect from 'expect';
import { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';
import { getFixtureJson } from './helpers/get_fixture_json';
import { comparePolicies, getTestSyntheticsPolicy } from './sample_data/test_policy';
import { PrivateLocationTestService } from '../../../services/synthetics_private_location';
import { addMonitorAPIHelper, keyToOmitList, omitMonitorKeys } from './create_monitor';
import { SyntheticsMonitorTestService } from '../../../services/synthetics_monitor';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  describe('PrivateLocationAddMonitor', function () {
    const kibanaServer = getService('kibanaServer');
    const supertestWithoutAuth = getService('supertestWithoutAuth');
    const supertestWithAuth = getService('supertest');
    const samlAuth = getService('samlAuth');
    const retry = getService('retry');

    let testFleetPolicyID: string;
    let editorUser: RoleCredentials;
    let privateLocations: PrivateLocation[] = [];
    const testPolicyName = 'Fleet test server policy' + Date.now();

    let _httpMonitorJson: HTTPFields;
    let httpMonitorJson: HTTPFields;
    const monitorTestService = new SyntheticsMonitorTestService(getService);
    const testPrivateLocations = new PrivateLocationTestService(getService);

    const addMonitorAPI = async (monitor: any, statusCode = 200) => {
      return addMonitorAPIHelper(supertestWithoutAuth, monitor, statusCode, editorUser, samlAuth);
    };

    const deleteMonitor = async (
      monitorId?: string | string[],
      statusCode = 200,
      spaceId?: string
    ) => {
      return monitorTestService.deleteMonitor(editorUser, monitorId, statusCode, spaceId);
    };

    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await testPrivateLocations.installSyntheticsPackage();
      editorUser = await samlAuth.createM2mApiKeyWithRoleScope('editor');

      _httpMonitorJson = getFixtureJson('http_monitor');
    });

    beforeEach(() => {
      httpMonitorJson = {
        ..._httpMonitorJson,
        locations: privateLocations ? [privateLocations[0]] : [],
      };
    });

    it('adds a test fleet policy', async () => {
      const apiResponse = await testPrivateLocations.addFleetPolicy(testPolicyName);
      testFleetPolicyID = apiResponse.body.item.id;
    });

    it('add a test private location', async () => {
      privateLocations = await testPrivateLocations.setTestLocations([testFleetPolicyID]);

      const apiResponse = await supertestWithoutAuth
        .get(SYNTHETICS_API_URLS.SERVICE_LOCATIONS)
        .set(editorUser.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .expect(200);

      const testResponse: Array<PrivateLocation | ServiceLocation> = [
        {
          id: testFleetPolicyID,
          isServiceManaged: false,
          isInvalid: false,
          label: privateLocations[0].label,
          geo: {
            lat: 0,
            lon: 0,
          },
          agentPolicyId: testFleetPolicyID,
          spaces: ['default'],
        },
      ];

      rawExpect(apiResponse.body.locations).toEqual(rawExpect.arrayContaining(testResponse));
    });

    it('does not add a monitor if there is an error in creating integration', async () => {
      const newMonitor = { ...httpMonitorJson };
      const invalidName = 'invalid name';

      const location = {
        id: 'invalidLocation',
        label: privateLocations[0].label,
        isServiceManaged: false,
        geo: {
          lat: 0,
          lon: 0,
        },
        spaces: ['default'],
      };

      newMonitor.name = invalidName;

      const apiResponse = await supertestWithoutAuth
        .post(SYNTHETICS_API_URLS.SYNTHETICS_MONITORS)
        .set(editorUser.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({ ...newMonitor, locations: [omit(location, 'spaces')] })
        .expect(400);

      expect(apiResponse.body).eql({
        statusCode: 400,
        error: 'Bad Request',
        message: `Invalid locations specified. Private Location(s) 'invalidLocation' not found. Available private locations are '${privateLocations[0].label}'`,
      });

      const apiGetResponse = await supertestWithoutAuth
        .get(SYNTHETICS_API_URLS.SYNTHETICS_MONITORS + `?query="${invalidName}"`)
        .set(editorUser.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .expect(200);
      // verify that no monitor was added
      expect(apiGetResponse.body.monitors?.length).eql(0);
    });

    let newMonitorId: string;

    it('adds a monitor in private location', async () => {
      const newMonitor = {
        ...httpMonitorJson,
        locations: [privateLocations[0]],
      };

      const { body, rawBody } = await addMonitorAPI(newMonitor);

      expect(body).eql(omitMonitorKeys(newMonitor));
      newMonitorId = rawBody.id;
    });

    it('added an integration for previously added monitor', async () => {
      const apiResponse = await supertestWithAuth.get(
        '/api/fleet/package_policies?page=1&perPage=2000&kuery=ingest-package-policies.package.name%3A%20synthetics'
      );

      const packagePolicy = apiResponse.body.items.find(
        (pkgPolicy: PackagePolicy) =>
          pkgPolicy.id === newMonitorId + '-' + testFleetPolicyID + '-default'
      );

      expect(packagePolicy?.policy_id).eql(testFleetPolicyID);

      comparePolicies(
        packagePolicy,
        getTestSyntheticsPolicy({
          name: httpMonitorJson.name,
          id: newMonitorId,
          location: { id: testFleetPolicyID, name: privateLocations[0].label },
        })
      );
    });

    let testFleetPolicyID2: string;
    let newLocations: PrivateLocation[] = [];

    it('edits a monitor with additional private location', async () => {
      const resPolicy = await testPrivateLocations.addFleetPolicy(testPolicyName + 1);
      testFleetPolicyID2 = resPolicy.body.item.id;

      newLocations = await testPrivateLocations.setTestLocations([
        testFleetPolicyID,
        testFleetPolicyID2,
      ]);

      httpMonitorJson.locations.push({
        id: testFleetPolicyID2,
        agentPolicyId: testFleetPolicyID2,
        label: newLocations[1].label,
        isServiceManaged: false,
        geo: {
          lat: 0,
          lon: 0,
        },
      });

      const apiResponse = await supertestWithoutAuth
        .put(SYNTHETICS_API_URLS.SYNTHETICS_MONITORS + '/' + newMonitorId)
        .set(editorUser.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send(httpMonitorJson);

      const { created_at: createdAt, updated_at: updatedAt } = apiResponse.body;
      expect([createdAt, updatedAt].map((d) => moment(d).isValid())).eql([true, true]);

      expect(omit(apiResponse.body, keyToOmitList)).eql(
        omitMonitorKeys({
          ...omit(httpMonitorJson, ['urls']),
          url: httpMonitorJson.urls,
          updated_at: updatedAt,
          revision: 2,
        })
      );
    });

    it('added an integration for second location in edit monitor', async () => {
      const apiResponsePolicy = await supertestWithAuth.get(
        '/api/fleet/package_policies?page=1&perPage=2000&kuery=ingest-package-policies.package.name%3A%20synthetics'
      );

      let packagePolicy = apiResponsePolicy.body.items.find(
        (pkgPolicy: PackagePolicy) =>
          pkgPolicy.id === newMonitorId + '-' + testFleetPolicyID + '-default'
      );

      expect(packagePolicy.policy_id).eql(testFleetPolicyID);

      comparePolicies(
        packagePolicy,
        getTestSyntheticsPolicy({
          name: httpMonitorJson.name,
          id: newMonitorId,
          location: { id: testFleetPolicyID, name: privateLocations[0].label },
        })
      );

      packagePolicy = apiResponsePolicy.body.items.find(
        (pkgPolicy: PackagePolicy) =>
          pkgPolicy.id === newMonitorId + '-' + testFleetPolicyID2 + '-default'
      );

      expect(packagePolicy.policy_id).eql(testFleetPolicyID2);
      comparePolicies(
        packagePolicy,
        getTestSyntheticsPolicy({
          name: httpMonitorJson.name,
          id: newMonitorId,
          location: {
            name: newLocations[1].label,
            id: testFleetPolicyID2,
          },
        })
      );
    });

    it('deletes integration for a removed location from monitor', async () => {
      httpMonitorJson.locations = httpMonitorJson.locations.filter(
        ({ id }) => id !== testFleetPolicyID2
      );

      await supertestWithoutAuth
        .put(SYNTHETICS_API_URLS.SYNTHETICS_MONITORS + '/' + newMonitorId + '?internal=true')
        .set(editorUser.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send(httpMonitorJson)
        .expect(200);

      const apiResponsePolicy = await supertestWithAuth.get(
        '/api/fleet/package_policies?page=1&perPage=2000&kuery=ingest-package-policies.package.name%3A%20synthetics'
      );

      let packagePolicy = apiResponsePolicy.body.items.find(
        (pkgPolicy: PackagePolicy) =>
          pkgPolicy.id === newMonitorId + '-' + testFleetPolicyID + '-default'
      );

      expect(packagePolicy.policy_id).eql(testFleetPolicyID);

      comparePolicies(
        packagePolicy,
        getTestSyntheticsPolicy({
          name: httpMonitorJson.name,
          id: newMonitorId,
          location: { id: testFleetPolicyID, name: privateLocations[0].label },
        })
      );

      packagePolicy = apiResponsePolicy.body.items.find(
        (pkgPolicy: PackagePolicy) =>
          pkgPolicy.id === newMonitorId + '-' + testFleetPolicyID2 + '-default'
      );

      expect(packagePolicy).eql(undefined);
    });

    it('deletes integration for a deleted monitor', async () => {
      await deleteMonitor(newMonitorId);

      const apiResponsePolicy = await supertestWithAuth.get(
        '/api/fleet/package_policies?page=1&perPage=2000&kuery=ingest-package-policies.package.name%3A%20synthetics'
      );

      const packagePolicy = apiResponsePolicy.body.items.find(
        (pkgPolicy: PackagePolicy) =>
          pkgPolicy.id === newMonitorId + '-' + testFleetPolicyID + '-default'
      );

      expect(packagePolicy).eql(undefined);
    });

    it('handles spaces', async () => {
      const SPACE_ID = `test-space-${uuidv4()}`;
      const SPACE_NAME = `test-space-name ${uuidv4()}`;
      const spaceScopedPrivateLocation = await testPrivateLocations.addTestPrivateLocation(
        SPACE_ID
      );
      let monitorId = '';
      const monitor = {
        ...httpMonitorJson,
        name: `Test monitor ${uuidv4()}`,
        [ConfigKey.NAMESPACE]: 'default',
        locations: [spaceScopedPrivateLocation],
      };

      await kibanaServer.spaces.create({ id: SPACE_ID, name: SPACE_NAME });
      const apiResponse = await supertestWithoutAuth
        .post(`/s/${SPACE_ID}${SYNTHETICS_API_URLS.SYNTHETICS_MONITORS}`)
        .set(editorUser.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .set('kbn-xsrf', 'true')
        .send(monitor);

      const { created_at: createdAt, updated_at: updatedAt } = apiResponse.body;
      expect([createdAt, updatedAt].map((d) => moment(d).isValid())).eql([true, true]);

      expect(omit(apiResponse.body, keyToOmitList)).eql(
        omitMonitorKeys({
          ...monitor,
          [ConfigKey.NAMESPACE]: formatKibanaNamespace(SPACE_ID),
          url: apiResponse.body.url,
        })
      );
      monitorId = apiResponse.body.id;

      const policyResponse = await supertestWithAuth.get(
        '/api/fleet/package_policies?page=1&perPage=2000&kuery=ingest-package-policies.package.name%3A%20synthetics'
      );

      const packagePolicy = policyResponse.body.items.find(
        (pkgPolicy: PackagePolicy) =>
          pkgPolicy.id === monitorId + '-' + spaceScopedPrivateLocation.id + `-${SPACE_ID}`
      );

      expect(packagePolicy.policy_id).eql(spaceScopedPrivateLocation.id);
      expect(packagePolicy.name).eql(
        `${monitor.name}-${spaceScopedPrivateLocation.label}-${SPACE_ID}`
      );
      comparePolicies(
        packagePolicy,
        getTestSyntheticsPolicy({
          name: monitor.name,
          id: monitorId,
          location: { id: spaceScopedPrivateLocation.id, name: spaceScopedPrivateLocation.label },
          namespace: formatKibanaNamespace(SPACE_ID),
          spaceId: SPACE_ID,
        })
      );
      await supertestWithoutAuth
        .delete(`/s/${SPACE_ID}${SYNTHETICS_API_URLS.SYNTHETICS_MONITORS}`)
        .set(editorUser.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({ ids: [monitorId] })
        .expect(200);
    });

    it('handles is_tls_enabled true', async () => {
      let monitorId = '';

      const monitor = {
        ...httpMonitorJson,
        locations: [
          {
            id: testFleetPolicyID,
            label: privateLocations[0].label,
            isServiceManaged: false,
          },
        ],
        [ConfigKey.METADATA]: {
          is_tls_enabled: true,
        },
      };

      try {
        const apiResponse = await supertestWithoutAuth
          .post(SYNTHETICS_API_URLS.SYNTHETICS_MONITORS)
          .set(editorUser.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .send(monitor)
          .expect(200);

        monitorId = apiResponse.body.id;

        const policyResponse = await supertestWithAuth.get(
          '/api/fleet/package_policies?page=1&perPage=2000&kuery=ingest-package-policies.package.name%3A%20synthetics'
        );

        const packagePolicy = policyResponse.body.items.find(
          (pkgPolicy: PackagePolicy) =>
            pkgPolicy.id === monitorId + '-' + testFleetPolicyID + `-default`
        );
        comparePolicies(
          packagePolicy,
          getTestSyntheticsPolicy({
            name: monitor.name,
            id: monitorId,
            location: { id: testFleetPolicyID, name: privateLocations[0].label },
            isTLSEnabled: true,
          })
        );
      } finally {
        await deleteMonitor(monitorId);
      }
    });

    it('handles is_tls_enabled false', async () => {
      let monitorId = '';

      const monitor = {
        ...httpMonitorJson,
        locations: [
          {
            id: testFleetPolicyID,
            label: privateLocations[0].label,
            isServiceManaged: false,
          },
        ],
        [ConfigKey.METADATA]: {
          is_tls_enabled: false,
        },
      };

      try {
        const apiResponse = await supertestWithoutAuth
          .post(SYNTHETICS_API_URLS.SYNTHETICS_MONITORS)
          .set(editorUser.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .send(monitor)
          .expect(200);

        monitorId = apiResponse.body.id;

        const policyResponse = await supertestWithAuth.get(
          '/api/fleet/package_policies?page=1&perPage=2000&kuery=ingest-package-policies.package.name%3A%20synthetics'
        );

        const packagePolicy = policyResponse.body.items.find(
          (pkgPolicy: PackagePolicy) =>
            pkgPolicy.id === monitorId + '-' + testFleetPolicyID + `-default`
        );
        comparePolicies(
          packagePolicy,
          getTestSyntheticsPolicy({
            name: monitor.name,
            id: monitorId,
            location: { id: testFleetPolicyID, name: privateLocations[0].label },
          })
        );
      } finally {
        await deleteMonitor(monitorId);
      }
    });

    it('handles auto upgrading policies', async () => {
      // force a lower version
      const lowerVersion = '1.1.1';
      await testPrivateLocations.installSyntheticsPackage({ version: lowerVersion });
      let monitorId = '';
      const privateLocation = await testPrivateLocations.addTestPrivateLocation();

      const monitor = {
        ...httpMonitorJson,
        name: `Test monitor ${uuidv4()}`,
        [ConfigKey.NAMESPACE]: 'default',
        locations: [privateLocation],
      };

      try {
        const apiResponse = await supertestWithoutAuth
          .post(SYNTHETICS_API_URLS.SYNTHETICS_MONITORS)
          .set(editorUser.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .send(monitor)
          .expect(200);
        monitorId = apiResponse.body.id;

        const policyResponse = await supertestWithAuth.get(
          '/api/fleet/package_policies?page=1&perPage=2000&kuery=ingest-package-policies.package.name%3A%20synthetics'
        );

        const packagePolicy = policyResponse.body.items.find(
          (pkgPolicy: PackagePolicy) =>
            pkgPolicy.id === monitorId + '-' + privateLocation.id + `-default`
        );

        expect(packagePolicy.package.version).eql(lowerVersion);
        await supertestWithAuth.post('/api/fleet/setup').set('kbn-xsrf', 'true').send().expect(200);
        await retry.tryForTime(60 * 1000, async () => {
          const policyResponseAfterUpgrade = await supertestWithAuth.get(
            '/api/fleet/package_policies?page=1&perPage=2000&kuery=ingest-package-policies.package.name%3A%20synthetics'
          );
          const packagePolicyAfterUpgrade = policyResponseAfterUpgrade.body.items.find(
            (pkgPolicy: PackagePolicy) =>
              pkgPolicy.id === monitorId + '-' + privateLocation.id + `-default`
          );
          expect(semver.gt(packagePolicyAfterUpgrade.package.version, lowerVersion)).eql(true);
        });
      } finally {
        await deleteMonitor(monitorId);
      }
    });
  });
}
