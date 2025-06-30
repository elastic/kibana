/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import moment from 'moment';
import { v4 as uuidv4 } from 'uuid';
import { omit } from 'lodash';
import {
  ConfigKey,
  EncryptedSyntheticsSavedMonitor,
  HTTPFields,
  MonitorFields,
} from '@kbn/synthetics-plugin/common/runtime_types';
import { RoleCredentials } from '@kbn/ftr-common-functional-services';
import { SYNTHETICS_API_URLS } from '@kbn/synthetics-plugin/common/constants';
import expect from '@kbn/expect';
import { DeploymentAgnosticFtrProviderContext } from '../../ftr_provider_context';
import { getFixtureJson } from './helpers/get_fixture_json';
import { omitResponseTimestamps, omitEmptyValues } from './helpers/monitor';
import { SyntheticsMonitorTestService } from '../../services/synthetics_monitor';
import { LOCAL_PUBLIC_LOCATION } from './helpers/location';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  describe('EditMonitorAPI - Public Location', function () {
    this.tags(['skipCloud', 'skipMKI']);
    const supertestWithAuth = getService('supertest');
    const supertest = getService('supertestWithoutAuth');
    const kibanaServer = getService('kibanaServer');
    const samlAuth = getService('samlAuth');

    const monitorTestService = new SyntheticsMonitorTestService(getService);

    let httpMonitorJson: HTTPFields;
    let editorUser: RoleCredentials;

    const saveMonitor = async (monitor: MonitorFields, spaceId?: string) => {
      const apiURL = spaceId
        ? `/s/${spaceId}${SYNTHETICS_API_URLS.SYNTHETICS_MONITORS}`
        : SYNTHETICS_API_URLS.SYNTHETICS_MONITORS;
      const res = await supertest
        .post(apiURL + '?internal=true')
        .set(editorUser.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send(monitor)
        .expect(200);

      const { url, created_at: createdAt, updated_at: updatedAt, ...rest } = res.body;

      expect([createdAt, updatedAt].map((d) => moment(d).isValid())).eql([true, true]);

      return rest as EncryptedSyntheticsSavedMonitor;
    };

    const editMonitor = async (modifiedMonitor: MonitorFields, monitorId: string) => {
      const res = await supertest
        .put(SYNTHETICS_API_URLS.SYNTHETICS_MONITORS + '/' + monitorId + '?internal=true')
        .set(editorUser.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send(modifiedMonitor);

      expect(res.status).eql(200, JSON.stringify(res.body));

      const { created_at: createdAt, updated_at: updatedAt } = res.body;
      expect([createdAt, updatedAt].map((d) => moment(d).isValid())).eql([true, true]);

      return omit(res.body, ['created_at', 'updated_at']);
    };

    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await supertestWithAuth.post('/api/fleet/setup').set('kbn-xsrf', 'true').send().expect(200);
      editorUser = await samlAuth.createM2mApiKeyWithRoleScope('editor');
      await supertest
        .put(SYNTHETICS_API_URLS.SYNTHETICS_ENABLEMENT)
        .set(editorUser.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .expect(200);

      httpMonitorJson = getFixtureJson('http_monitor');
    });

    after(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
    });

    it('edits the monitor', async () => {
      const newMonitor = httpMonitorJson;
      const savedMonitor = await saveMonitor(newMonitor as MonitorFields);
      const monitorId = savedMonitor[ConfigKey.CONFIG_ID];

      expect(omitResponseTimestamps(savedMonitor)).eql(
        omitEmptyValues({
          ...newMonitor,
          [ConfigKey.MONITOR_QUERY_ID]: monitorId,
          [ConfigKey.CONFIG_ID]: monitorId,
        })
      );

      const updates: Partial<HTTPFields> = {
        [ConfigKey.URLS]: 'https://modified-host.com',
        [ConfigKey.NAME]: 'Modified name',
        [ConfigKey.REQUEST_HEADERS_CHECK]: {
          sampleHeader2: 'sampleValue2',
        },
        [ConfigKey.METADATA]: {
          script_source: {
            is_generated_script: false,
            file_name: 'test-file.name',
          },
        },
      };

      const modifiedMonitor = {
        ...savedMonitor,
        ...updates,
        [ConfigKey.METADATA]: {
          ...newMonitor[ConfigKey.METADATA],
          ...updates[ConfigKey.METADATA],
        },
      } as any;

      const editResponse = await editMonitor(modifiedMonitor, monitorId);

      expect(editResponse).eql(
        omitEmptyValues({
          ...modifiedMonitor,
          revision: 2,
        })
      );
    });

    it('strips unknown keys from monitor edits', async () => {
      const newMonitor = { ...httpMonitorJson, name: 'yet another' };

      const savedMonitor = await saveMonitor(newMonitor as MonitorFields);
      const monitorId = savedMonitor[ConfigKey.CONFIG_ID];

      const { created_at: createdAt, updated_at: updatedAt } = savedMonitor;
      expect([createdAt, updatedAt].map((d) => moment(d).isValid())).eql([true, true]);

      expect(omitResponseTimestamps(savedMonitor)).eql(
        omitEmptyValues({
          ...newMonitor,
          [ConfigKey.MONITOR_QUERY_ID]: monitorId,
          [ConfigKey.CONFIG_ID]: monitorId,
        })
      );

      const updates: Partial<HTTPFields> = {
        [ConfigKey.URLS]: 'https://modified-host.com',
        [ConfigKey.NAME]: 'Modified name like that',
        [ConfigKey.REQUEST_HEADERS_CHECK]: {
          sampleHeader2: 'sampleValue2',
        },
        [ConfigKey.METADATA]: {
          script_source: {
            is_generated_script: false,
            file_name: 'test-file.name',
          },
        },
        unknownkey: 'unknownvalue',
      } as Partial<HTTPFields>;

      const modifiedMonitor = omit(
        {
          ...updates,
          [ConfigKey.METADATA]: {
            ...newMonitor[ConfigKey.METADATA],
            ...updates[ConfigKey.METADATA],
          },
        },
        ['unknownkey']
      );

      const editResponse = await editMonitor(modifiedMonitor as MonitorFields, monitorId);

      expect(editResponse).eql(
        omitEmptyValues({
          ...savedMonitor,
          ...modifiedMonitor,
          revision: 2,
        })
      );
      expect(editResponse).not.to.have.keys('unknownkey');
    });

    it('returns 404 if monitor id is not present', async () => {
      const invalidMonitorId = 'invalid-id';
      const expected404Message = `Monitor id ${invalidMonitorId} not found!`;

      const editResponse = await supertest
        .put(SYNTHETICS_API_URLS.SYNTHETICS_MONITORS + '/' + invalidMonitorId)
        .set(editorUser.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send(httpMonitorJson)
        .expect(404);

      expect(editResponse.body.message).eql(expected404Message);
    });

    it('returns bad request if payload is invalid for HTTP monitor', async () => {
      const { id: monitorId, ...savedMonitor } = await saveMonitor(
        httpMonitorJson as MonitorFields
      );

      // Delete a required property to make payload invalid
      const toUpdate = { ...savedMonitor, 'check.request.headers': null };

      const apiResponse = await supertest
        .put(SYNTHETICS_API_URLS.SYNTHETICS_MONITORS + '/' + monitorId)
        .set(editorUser.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send(toUpdate);

      expect(apiResponse.status).eql(400);
    });

    it('returns bad request if monitor type is invalid', async () => {
      const { id: monitorId, ...savedMonitor } = await saveMonitor({
        ...httpMonitorJson,
        name: 'test monitor - 11',
      } as MonitorFields);

      const toUpdate = { ...savedMonitor, type: 'invalid-data-steam' };

      const apiResponse = await supertest
        .put(SYNTHETICS_API_URLS.SYNTHETICS_MONITORS + '/' + monitorId)
        .set(editorUser.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send(toUpdate);

      expect(apiResponse.status).eql(400);
      expect(apiResponse.body.message).eql(
        'Monitor type cannot be changed from http to invalid-data-steam.'
      );
    });

    it('sets config hash to empty string on edits', async () => {
      const newMonitor = httpMonitorJson;
      const configHash = 'djrhefje';

      const savedMonitor = await saveMonitor({
        ...(newMonitor as MonitorFields),
        [ConfigKey.CONFIG_HASH]: configHash,
        name: 'test monitor - 12',
      });
      const monitorId = savedMonitor[ConfigKey.CONFIG_ID];
      const { created_at: createdAt, updated_at: updatedAt } = savedMonitor;
      expect([createdAt, updatedAt].map((d) => moment(d).isValid())).eql([true, true]);

      expect(savedMonitor).eql(
        omitEmptyValues({
          ...newMonitor,
          [ConfigKey.CONFIG_ID]: monitorId,
          [ConfigKey.MONITOR_QUERY_ID]: monitorId,
          name: 'test monitor - 12',
          hash: configHash,
        })
      );

      const updates: Partial<HTTPFields> = {
        [ConfigKey.URLS]: 'https://modified-host.com',
        name: 'test monitor - 12',
      } as Partial<HTTPFields>;

      const modifiedMonitor = {
        ...newMonitor,
        ...updates,
        [ConfigKey.METADATA]: {
          ...newMonitor[ConfigKey.METADATA],
          ...updates[ConfigKey.METADATA],
        },
      };

      const editResponse = await editMonitor(modifiedMonitor as MonitorFields, monitorId);

      expect(editResponse).eql(
        omitEmptyValues({
          ...modifiedMonitor,
          [ConfigKey.CONFIG_ID]: monitorId,
          [ConfigKey.MONITOR_QUERY_ID]: monitorId,
          [ConfigKey.CONFIG_HASH]: '',
          revision: 2,
        })
      );
      expect(editResponse).not.to.have.keys('unknownkey');
    });

    it('handles spaces', async () => {
      const name = 'Monitor with private location';

      const SPACE_ID = `test-space-${uuidv4()}`;
      const SPACE_NAME = `test-space-name ${uuidv4()}`;

      await kibanaServer.spaces.create({ id: SPACE_ID, name: SPACE_NAME });

      const newMonitor = {
        name,
        type: 'http',
        urls: 'https://elastic.co',
        locations: [LOCAL_PUBLIC_LOCATION],
      };

      const savedMonitor = await saveMonitor(newMonitor as MonitorFields, SPACE_ID);

      const monitorId = savedMonitor[ConfigKey.CONFIG_ID];
      const toUpdate = {
        ...savedMonitor,
        urls: 'https://google.com',
      };
      await supertest
        .put(`/s/${SPACE_ID}${SYNTHETICS_API_URLS.SYNTHETICS_MONITORS}/${monitorId}`)
        .set(editorUser.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send(toUpdate)
        .expect(200);

      const updatedResponse = await monitorTestService.getMonitor(monitorId, {
        space: SPACE_ID,
        internal: true,
        user: editorUser,
      });

      // ensure monitor was updated
      expect(updatedResponse.body.urls).eql(toUpdate.urls);

      // update a second time, ensures AAD was not corrupted
      const toUpdate2 = {
        ...savedMonitor,
        urls: 'https://google.com',
      };

      await supertest
        .put(`/s/${SPACE_ID}${SYNTHETICS_API_URLS.SYNTHETICS_MONITORS}/${monitorId}`)
        .set(editorUser.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send(toUpdate2)
        .expect(200);

      const updatedResponse2 = await monitorTestService.getMonitor(monitorId, {
        space: SPACE_ID,
        internal: true,
        user: editorUser,
      });

      // ensure monitor was updated
      expect(updatedResponse2.body.urls).eql(toUpdate2.urls);
    });
  });
}
