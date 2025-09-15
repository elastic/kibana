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
  MonitorTypeEnum,
} from '@kbn/synthetics-plugin/common/runtime_types';
import { SYNTHETICS_API_URLS } from '@kbn/synthetics-plugin/common/constants';
import { DEFAULT_FIELDS } from '@kbn/synthetics-plugin/common/constants/monitor_defaults';
import { omit } from 'lodash';
import { PackagePolicy } from '@kbn/fleet-plugin/common';
import expect from '@kbn/expect';
import rawExpect from 'expect';
import { DeploymentAgnosticFtrProviderContext } from '../../ftr_provider_context';
import { getFixtureJson } from './helpers/get_fixture_json';
import { comparePolicies, getTestSyntheticsPolicy } from './sample_data/test_policy';
import { PrivateLocationTestService } from '../../services/synthetics_private_location';
import { addMonitorAPIHelper, keyToOmitList, omitMonitorKeys } from './create_monitor';
import { SyntheticsMonitorTestService } from '../../services/synthetics_monitor';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  describe('PrivateLocationCreateMonitor', function () {
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
        spaces: [SPACE_ID],
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
        private_locations: [privateLocation.id],
      };

      try {
        const apiResponse = await supertestWithoutAuth
          .post(SYNTHETICS_API_URLS.SYNTHETICS_MONITORS)
          .set(editorUser.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .send(monitor);

        expect(apiResponse.status).eql(200, JSON.stringify(apiResponse.body));

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

    it('returns bad request if payload is invalid for HTTP monitor', async () => {
      // Delete a required property to make payload invalid
      const newMonitor = { ...httpMonitorJson, 'check.request.headers': null };
      await addMonitorAPI(newMonitor, 400);
    });

    it('returns bad request if monitor type is invalid', async () => {
      const newMonitor = { ...httpMonitorJson, type: 'invalid-data-steam' };

      const apiResponse = await addMonitorAPI(newMonitor, 400);

      expect(apiResponse.message).eql('Invalid value "invalid-data-steam" supplied to "type"');
    });

    it('can create valid monitors without all defaults', async () => {
      // Delete a required property to make payload invalid
      const newMonitor = {
        name: 'Sample name',
        type: 'http',
        urls: 'https://elastic.co',
        locations: [privateLocations[0]],
      };

      const { body: apiResponse } = await addMonitorAPI(newMonitor);

      expect(apiResponse).eql(
        omitMonitorKeys({
          ...DEFAULT_FIELDS[MonitorTypeEnum.HTTP],
          ...newMonitor,
          spaces: ['default'],
        })
      );
    });

    it('can disable retries', async () => {
      const maxAttempts = 1;
      const newMonitor = {
        max_attempts: maxAttempts,
        urls: 'https://elastic.co',
        name: `Sample name ${uuidv4()}`,
        type: 'http',
        locations: [privateLocations[0]],
      };

      const { body: apiResponse } = await addMonitorAPI(newMonitor);

      rawExpect(apiResponse).toEqual(rawExpect.objectContaining({ retest_on_failure: false }));
    });

    it('can enable retries with max attempts', async () => {
      const maxAttempts = 2;
      const newMonitor = {
        max_attempts: maxAttempts,
        urls: 'https://elastic.co',
        name: `Sample name ${uuidv4()}`,
        type: 'http',
        locations: [privateLocations[0]],
      };

      const { body: apiResponse } = await addMonitorAPI(newMonitor);

      rawExpect(apiResponse).toEqual(rawExpect.objectContaining({ retest_on_failure: true }));
    });

    it('can enable retries', async () => {
      const newMonitor = {
        retest_on_failure: false,
        urls: 'https://elastic.co',
        name: `Sample name ${uuidv4()}`,
        type: 'http',
        locations: [privateLocations[0]],
      };

      const { body: apiResponse } = await addMonitorAPI(newMonitor);

      rawExpect(apiResponse).toEqual(rawExpect.objectContaining({ retest_on_failure: false }));
    });

    it('cannot create a invalid monitor without a monitor type', async () => {
      // Delete a required property to make payload invalid
      const newMonitor = {
        name: 'Sample name',
        url: 'https://elastic.co',
        locations: [privateLocations[0]],
      };
      await addMonitorAPI(newMonitor, 400);
    });

    it('omits unknown keys', async () => {
      // Delete a required property to make payload invalid
      const newMonitor = {
        name: 'Sample name',
        url: 'https://elastic.co',
        unknownKey: 'unknownValue',
        type: 'http',
        locations: [privateLocations[0]],
      };
      const apiResponse = await addMonitorAPI(newMonitor, 400);
      expect(apiResponse.message).not.to.have.keys(
        'Invalid monitor key(s) for http type:  unknownKey","attributes":{"details":"Invalid monitor key(s) for http type:  unknownKey'
      );
    });

    it('preserves the passed namespace when preserve_namespace is passed', async () => {
      const SPACE_ID = `test-space-${uuidv4()}`;
      const SPACE_NAME = `test-space-name ${uuidv4()}`;
      const privateLocation = await testPrivateLocations.addTestPrivateLocation(SPACE_ID);
      const monitor = {
        ...httpMonitorJson,
        [ConfigKey.NAMESPACE]: 'default',
        locations: [privateLocation],
        spaces: [],
      };
      let monitorId = '';
      await kibanaServer.spaces.create({ id: SPACE_ID, name: SPACE_NAME });

      try {
        const apiResponse = await supertestWithoutAuth
          .post(`/s/${SPACE_ID}${SYNTHETICS_API_URLS.SYNTHETICS_MONITORS}`)
          .query({ preserve_namespace: true })
          .set(editorUser.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .send(monitor)
          .expect(200);
        monitorId = apiResponse.body.id;
        expect(apiResponse.body[ConfigKey.NAMESPACE]).eql('default');
      } finally {
        await deleteMonitor(monitorId, 200, SPACE_ID);
      }
    });

    it('sets namespace to custom namespace when set', async () => {
      const SPACE_ID = `test-space-${uuidv4()}`;
      const SPACE_NAME = `test-space-name ${uuidv4()}`;
      const privateLocation = await testPrivateLocations.addTestPrivateLocation(SPACE_ID);
      const monitor = {
        ...httpMonitorJson,
        locations: [privateLocation],
        spaces: [],
      };
      let monitorId = '';

      try {
        await kibanaServer.spaces.create({ id: SPACE_ID, name: SPACE_NAME });

        const apiResponse = await supertestWithoutAuth
          .post(`/s/${SPACE_ID}${SYNTHETICS_API_URLS.SYNTHETICS_MONITORS}`)
          .set(editorUser.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .send(monitor)
          .expect(200);
        monitorId = apiResponse.body.id;
        expect(apiResponse.body[ConfigKey.NAMESPACE]).eql(monitor[ConfigKey.NAMESPACE]);
      } finally {
        await deleteMonitor(monitorId, 200, SPACE_ID);
      }
    });
  });
}
