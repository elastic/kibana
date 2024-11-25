/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import { RoleCredentials, SamlAuthProviderType } from '@kbn/ftr-common-functional-services';
import epct from 'expect';
import moment from 'moment/moment';
import { v4 as uuidv4 } from 'uuid';
import { omit, omitBy } from 'lodash';
import {
  ConfigKey,
  MonitorTypeEnum,
  HTTPFields,
} from '@kbn/synthetics-plugin/common/runtime_types';
import { formatKibanaNamespace } from '@kbn/synthetics-plugin/common/formatters';
import { SYNTHETICS_API_URLS } from '@kbn/synthetics-plugin/common/constants';
import { DEFAULT_FIELDS } from '@kbn/synthetics-plugin/common/constants/monitor_defaults';
import {
  removeMonitorEmptyValues,
  transformPublicKeys,
} from '@kbn/synthetics-plugin/server/routes/monitor_cruds/formatters/saved_object_to_monitor';
import { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';
import { getFixtureJson } from './helpers/get_fixture_json';
import { SyntheticsMonitorTestService } from '../../../services/synthetics_monitor';

export const addMonitorAPIHelper = async (
  supertestAPI: any,
  monitor: any,
  statusCode = 200,
  roleAuthc: RoleCredentials,
  samlAuth: SamlAuthProviderType
) => {
  const result = await supertestAPI
    .post(SYNTHETICS_API_URLS.SYNTHETICS_MONITORS)
    .set(roleAuthc.apiKeyHeader)
    .set(samlAuth.getInternalRequestHeader())
    .send(monitor)
    .expect(statusCode);

  if (statusCode === 200) {
    const { created_at: createdAt, updated_at: updatedAt, id, config_id: configId } = result.body;
    expect(id).not.empty();
    expect(configId).not.empty();
    expect([createdAt, updatedAt].map((d) => moment(d).isValid())).eql([true, true]);
    return {
      rawBody: result.body,
      body: {
        ...omit(result.body, ['created_at', 'updated_at', 'id', 'config_id', 'form_monitor_type']),
      },
    };
  }
  return result.body;
};

export const keyToOmitList = [
  'created_at',
  'updated_at',
  'id',
  'config_id',
  'form_monitor_type',
  'spaceId',
];

export const omitMonitorKeys = (monitor: any) => {
  return omitBy(omit(transformPublicKeys(monitor), keyToOmitList), removeMonitorEmptyValues);
};

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  describe('AddNewMonitorsUI', function () {
    this.tags('skipCloud');

    const supertestAPI = getService('supertestWithoutAuth');
    const samlAuth = getService('samlAuth');
    const kibanaServer = getService('kibanaServer');
    const monitorTestService = new SyntheticsMonitorTestService(getService);

    let _httpMonitorJson: HTTPFields;
    let httpMonitorJson: HTTPFields;
    let editorRoleAuthc: RoleCredentials;

    const addMonitorAPI = async (monitor: any, statusCode = 200) => {
      return addMonitorAPIHelper(supertestAPI, monitor, statusCode, editorRoleAuthc, samlAuth);
    };

    const deleteMonitor = async (
      monitorId?: string | string[],
      statusCode = 200,
      spaceId?: string
    ) => {
      return monitorTestService.deleteMonitor(editorRoleAuthc, monitorId, statusCode, spaceId);
    };

    before(async () => {
      _httpMonitorJson = getFixtureJson('http_monitor');
      await kibanaServer.savedObjects.cleanStandardList();
      editorRoleAuthc = await samlAuth.createM2mApiKeyWithRoleScope('editor');
    });

    beforeEach(async () => {
      httpMonitorJson = _httpMonitorJson;
    });

    it('returns the newly added monitor', async () => {
      const newMonitor = httpMonitorJson;

      const { body: apiResponse } = await addMonitorAPI(newMonitor);

      expect(apiResponse).eql(omitMonitorKeys(newMonitor));
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
    const localLoc = {
      id: 'dev',
      label: 'Dev Service',
      geo: {
        lat: 0,
        lon: 0,
      },
      isServiceManaged: true,
    };

    it('can create valid monitors without all defaults', async () => {
      // Delete a required property to make payload invalid
      const newMonitor = {
        name: 'Sample name',
        type: 'http',
        urls: 'https://elastic.co',
        locations: [localLoc],
      };

      const { body: apiResponse } = await addMonitorAPI(newMonitor);

      expect(apiResponse).eql(
        omitMonitorKeys({
          ...DEFAULT_FIELDS[MonitorTypeEnum.HTTP],
          ...newMonitor,
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
        locations: [localLoc],
      };

      const { body: apiResponse } = await addMonitorAPI(newMonitor);

      epct(apiResponse).toEqual(epct.objectContaining({ retest_on_failure: false }));
    });

    it('can enable retries with max attempts', async () => {
      const maxAttempts = 2;
      const newMonitor = {
        max_attempts: maxAttempts,
        urls: 'https://elastic.co',
        name: `Sample name ${uuidv4()}`,
        type: 'http',
        locations: [localLoc],
      };

      const { body: apiResponse } = await addMonitorAPI(newMonitor);

      epct(apiResponse).toEqual(epct.objectContaining({ retest_on_failure: true }));
    });

    it('can enable retries', async () => {
      const newMonitor = {
        retest_on_failure: false,
        urls: 'https://elastic.co',
        name: `Sample name ${uuidv4()}`,
        type: 'http',
        locations: [localLoc],
      };

      const { body: apiResponse } = await addMonitorAPI(newMonitor);

      epct(apiResponse).toEqual(epct.objectContaining({ retest_on_failure: false }));
    });

    it('cannot create a invalid monitor without a monitor type', async () => {
      // Delete a required property to make payload invalid
      const newMonitor = {
        name: 'Sample name',
        url: 'https://elastic.co',
        locations: [localLoc],
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
        locations: [localLoc],
      };
      const apiResponse = await addMonitorAPI(newMonitor, 400);
      expect(apiResponse.message).not.to.have.keys(
        'Invalid monitor key(s) for http type:  unknownKey","attributes":{"details":"Invalid monitor key(s) for http type:  unknownKey'
      );
    });

    it('sets namespace to Kibana space when not set to a custom namespace', async () => {
      const SPACE_ID = `test-space-${uuidv4()}`;
      const SPACE_NAME = `test-space-name ${uuidv4()}`;
      const EXPECTED_NAMESPACE = formatKibanaNamespace(SPACE_ID);
      const monitor = {
        ...httpMonitorJson,
        [ConfigKey.NAMESPACE]: 'default',
      };
      let monitorId = '';

      try {
        await kibanaServer.spaces.create({ id: SPACE_ID, name: SPACE_NAME });

        const apiResponse = await supertestAPI
          .post(`/s/${SPACE_ID}${SYNTHETICS_API_URLS.SYNTHETICS_MONITORS}`)
          .set(editorRoleAuthc.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .send(monitor)
          .expect(200);
        monitorId = apiResponse.body.id;
        expect(apiResponse.body[ConfigKey.NAMESPACE]).eql(EXPECTED_NAMESPACE);
      } finally {
        await deleteMonitor(monitorId, 200, SPACE_ID);
      }
    });

    it('preserves the passed namespace when preserve_namespace is passed', async () => {
      const SPACE_ID = `test-space-${uuidv4()}`;
      const SPACE_NAME = `test-space-name ${uuidv4()}`;
      const monitor = {
        ...httpMonitorJson,
        [ConfigKey.NAMESPACE]: 'default',
      };
      let monitorId = '';
      await kibanaServer.spaces.create({ id: SPACE_ID, name: SPACE_NAME });

      try {
        const apiResponse = await supertestAPI
          .post(`/s/${SPACE_ID}${SYNTHETICS_API_URLS.SYNTHETICS_MONITORS}`)
          .query({ preserve_namespace: true })
          .set(editorRoleAuthc.apiKeyHeader)
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
      const monitor = httpMonitorJson;
      let monitorId = '';

      try {
        await kibanaServer.spaces.create({ id: SPACE_ID, name: SPACE_NAME });

        const apiResponse = await supertestAPI
          .post(`/s/${SPACE_ID}${SYNTHETICS_API_URLS.SYNTHETICS_MONITORS}`)
          .set(editorRoleAuthc.apiKeyHeader)
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
