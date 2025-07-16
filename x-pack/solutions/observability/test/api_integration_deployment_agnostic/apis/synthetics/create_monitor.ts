/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import { RoleCredentials, SamlAuthProviderType } from '@kbn/ftr-common-functional-services';
import moment from 'moment/moment';
import { v4 as uuidv4 } from 'uuid';
import { omit, omitBy } from 'lodash';
import {
  ConfigKey,
  HTTPFields,
  PrivateLocation,
} from '@kbn/synthetics-plugin/common/runtime_types';
import { formatKibanaNamespace } from '@kbn/synthetics-plugin/common/formatters';
import { SYNTHETICS_API_URLS } from '@kbn/synthetics-plugin/common/constants';
import {
  removeMonitorEmptyValues,
  transformPublicKeys,
} from '@kbn/synthetics-plugin/server/routes/monitor_cruds/formatters/saved_object_to_monitor';
import { DeploymentAgnosticFtrProviderContext } from '../../ftr_provider_context';
import { getFixtureJson } from './helpers/get_fixture_json';
import { SyntheticsMonitorTestService } from '../../services/synthetics_monitor';
import { PrivateLocationTestService } from '../../services/synthetics_private_location';

export const addMonitorAPIHelper = async (
  supertestAPI: any,
  monitor: any,
  statusCode = 200,
  roleAuthc: RoleCredentials,
  samlAuth: SamlAuthProviderType,
  gettingStarted?: boolean,
  savedObjectType?: string
) => {
  let queryParams = savedObjectType ? `savedObjectType=${savedObjectType}` : '';
  if (gettingStarted) {
    queryParams = `?gettingStarted=true${queryParams}`;
  } else if (queryParams) {
    queryParams = `?${queryParams}`;
  }

  const result = await supertestAPI
    .post(SYNTHETICS_API_URLS.SYNTHETICS_MONITORS + queryParams)
    .set(roleAuthc.apiKeyHeader)
    .set(samlAuth.getInternalRequestHeader())
    .send(monitor);

  expect(result.statusCode).eql(statusCode, JSON.stringify(result.body));

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
  'private_locations',
];

export const omitMonitorKeys = (monitor: any) => {
  return omitBy(omit(transformPublicKeys(monitor), keyToOmitList), removeMonitorEmptyValues);
};

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  describe('AddNewMonitorsUI', function () {
    this.tags(['skipCloud', 'skipMKI']);
    const supertestAPI = getService('supertestWithoutAuth');
    const samlAuth = getService('samlAuth');
    const kibanaServer = getService('kibanaServer');
    const monitorTestService = new SyntheticsMonitorTestService(getService);
    const privateLocationsService = new PrivateLocationTestService(getService);

    let privateLocation: PrivateLocation;
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
      privateLocation = await privateLocationsService.addTestPrivateLocation();
      httpMonitorJson = {
        ..._httpMonitorJson,
        locations: [privateLocation],
      };
    });

    it('returns the newly added monitor', async () => {
      const newMonitor = httpMonitorJson;

      const { body: apiResponse } = await addMonitorAPI(newMonitor);

      expect(apiResponse).eql(omitMonitorKeys(newMonitor));
    });

    it('sets namespace to Kibana space when not set to a custom namespace', async () => {
      const SPACE_ID = `test-space-${uuidv4()}`;
      const SPACE_NAME = `test-space-name ${uuidv4()}`;
      const EXPECTED_NAMESPACE = formatKibanaNamespace(SPACE_ID);
      privateLocation = await privateLocationsService.addTestPrivateLocation(SPACE_ID);
      const monitor = {
        ...httpMonitorJson,
        [ConfigKey.NAMESPACE]: 'default',
        locations: [privateLocation],
      };
      let monitorId = '';

      try {
        await kibanaServer.spaces.create({ id: SPACE_ID, name: SPACE_NAME });

        const apiResponse = await supertestAPI
          .post(`/s/${SPACE_ID}${SYNTHETICS_API_URLS.SYNTHETICS_MONITORS}`)
          .set(editorRoleAuthc.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .send({ ...monitor, spaces: [] })
          .expect(200);
        monitorId = apiResponse.body.id;
        expect(apiResponse.body[ConfigKey.NAMESPACE]).eql(EXPECTED_NAMESPACE);
      } finally {
        await deleteMonitor(monitorId, 200, SPACE_ID);
      }
    });
  });
}
