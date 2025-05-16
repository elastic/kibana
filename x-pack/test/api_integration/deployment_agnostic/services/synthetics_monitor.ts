/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { RoleCredentials, SamlAuthProviderType } from '@kbn/ftr-common-functional-services';
import { SYNTHETICS_API_URLS } from '@kbn/synthetics-plugin/common/constants';
import { syntheticsMonitorType } from '@kbn/synthetics-plugin/common/types/saved_objects';
import { EncryptedSyntheticsSavedMonitor } from '@kbn/synthetics-plugin/common/runtime_types';
import { MonitorInspectResponse } from '@kbn/synthetics-plugin/public/apps/synthetics/state/monitor_management/api';
import { v4 as uuidv4 } from 'uuid';
import expect from '@kbn/expect';
import { ProjectAPIKeyResponse } from '@kbn/synthetics-plugin/server/routes/monitor_cruds/get_api_key';
import moment from 'moment/moment';
import { omit } from 'lodash';
import { KibanaSupertestProvider } from '@kbn/ftr-common-functional-services';
import { DeploymentAgnosticFtrProviderContext } from '../ftr_provider_context';

export class SyntheticsMonitorTestService {
  private supertest: ReturnType<typeof KibanaSupertestProvider>;
  private getService: DeploymentAgnosticFtrProviderContext['getService'];
  public apiKey: string | undefined = '';
  public samlAuth: SamlAuthProviderType;

  constructor(getService: DeploymentAgnosticFtrProviderContext['getService']) {
    this.supertest = getService('supertestWithoutAuth');
    this.samlAuth = getService('samlAuth');
    this.getService = getService;
  }

  generateProjectAPIKey = async (accessToPublicLocations = true, user: RoleCredentials) => {
    const res = await this.supertest
      .get(
        SYNTHETICS_API_URLS.SYNTHETICS_PROJECT_APIKEY +
          '?accessToElasticManagedLocations=' +
          accessToPublicLocations
      )
      .set(user.apiKeyHeader)
      .set(this.samlAuth.getInternalRequestHeader())
      .expect(200);
    const result = res.body as ProjectAPIKeyResponse;
    expect(result).to.have.property('apiKey');
    const apiKey = result.apiKey?.encoded;
    expect(apiKey).to.not.be.empty();
    this.apiKey = apiKey;
    return apiKey;
  };

  async getMonitor(
    monitorId: string,
    {
      statusCode = 200,
      space,
      internal,
      user,
    }: {
      statusCode?: number;
      space?: string;
      internal?: boolean;
      user: RoleCredentials;
    }
  ) {
    let url = SYNTHETICS_API_URLS.GET_SYNTHETICS_MONITOR.replace('{monitorId}', monitorId);
    if (space) {
      url = '/s/' + space + url;
    }
    if (internal) {
      url += `?internal=${internal}`;
    }
    const apiResponse = await this.supertest
      .get(url)
      .set(user.apiKeyHeader)
      .set(this.samlAuth.getInternalRequestHeader())
      .expect(200);

    expect(apiResponse.status).eql(statusCode, JSON.stringify(apiResponse.body));

    if (statusCode === 200) {
      const {
        created_at: createdAt,
        updated_at: updatedAt,
        id,
        config_id: configId,
        spaceId,
      } = apiResponse.body;
      expect(id).not.empty();
      expect(configId).not.empty();
      expect(spaceId).not.empty();
      expect([createdAt, updatedAt].map((d) => moment(d).isValid())).eql([true, true]);
      return {
        rawBody: omit(apiResponse.body, ['spaceId']),
        body: {
          ...omit(apiResponse.body, [
            'created_at',
            'updated_at',
            'id',
            'config_id',
            'form_monitor_type',
            'spaceId',
          ]),
        },
      };
    }
    return apiResponse.body;
  }

  async addMonitor(monitor: any, user: RoleCredentials) {
    const res = await this.supertest
      .post(SYNTHETICS_API_URLS.SYNTHETICS_MONITORS)
      .set(user.apiKeyHeader)
      .set(this.samlAuth.getInternalRequestHeader())
      .send(monitor)
      .expect(200);

    return res.body as EncryptedSyntheticsSavedMonitor;
  }

  async inspectMonitor(user: RoleCredentials, monitor: any, hideParams: boolean = true) {
    const res = await this.supertest
      .post(SYNTHETICS_API_URLS.SYNTHETICS_MONITOR_INSPECT)
      .set(user.apiKeyHeader)
      .set(this.samlAuth.getInternalRequestHeader())
      .send(monitor)
      .expect(200);

    // remove the id and config_id from the response
    delete res.body.result?.publicConfigs?.[0].monitors[0].id;
    delete res.body.result?.publicConfigs?.[0].monitors[0].streams[0].id;
    delete res.body.result?.publicConfigs?.[0].monitors[0].streams[0].config_id;
    delete res.body.result?.publicConfigs?.[0].monitors[0].streams[0].fields.config_id;
    delete res.body.result?.publicConfigs?.[0].output.api_key;
    delete res.body.result?.publicConfigs?.[0].license_issued_to;
    delete res.body.result?.publicConfigs?.[0].stack_version;

    return res.body as { result: MonitorInspectResponse; decodedCode: string };
  }

  async addProjectMonitors(project: string, monitors: any, user: RoleCredentials) {
    if (this.apiKey) {
      return this.supertest
        .put(
          SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROJECT_UPDATE.replace('{projectName}', project)
        )
        .set(this.samlAuth.getInternalRequestHeader())
        .set('authorization', `ApiKey ${this.apiKey}`)
        .send({ monitors });
    } else {
      return this.supertest
        .put(
          SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROJECT_UPDATE.replace('{projectName}', project)
        )
        .set(user.apiKeyHeader)
        .set(this.samlAuth.getInternalRequestHeader())
        .send({ monitors });
    }
  }

  async deleteMonitorByJourney(
    journeyId: string,
    projectId: string,
    space: string = 'default',
    user: RoleCredentials
  ) {
    try {
      const response = await this.supertest
        .get(`/s/${space}${SYNTHETICS_API_URLS.SYNTHETICS_MONITORS}`)
        .query({
          filter: `${syntheticsMonitorType}.attributes.journey_id: "${journeyId}" AND ${syntheticsMonitorType}.attributes.project_id: "${projectId}"`,
        })
        .set(user.apiKeyHeader)
        .set(this.samlAuth.getInternalRequestHeader())
        .expect(200);

      const { monitors } = response.body;
      if (monitors[0]?.id) {
        await this.supertest
          .delete(`/s/${space}${SYNTHETICS_API_URLS.SYNTHETICS_MONITORS}`)
          .set(user.apiKeyHeader)
          .set(this.samlAuth.getInternalRequestHeader())
          .send({ ids: monitors.map((monitor: { id: string }) => monitor.id) })
          .expect(200);
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);
    }
  }

  async addNewSpace() {
    const SPACE_ID = `test-space-${uuidv4()}`;
    const SPACE_NAME = `test-space-name ${uuidv4()}`;

    const kibanaServer = this.getService('kibanaServer');

    await kibanaServer.spaces.create({ id: SPACE_ID, name: SPACE_NAME });

    return { SPACE_ID };
  }

  async deleteMonitor(
    user: RoleCredentials,
    monitorId?: string | string[],
    statusCode = 200,
    spaceId?: string
  ) {
    const deleteResponse = await this.supertest
      .delete(
        spaceId
          ? `/s/${spaceId}${SYNTHETICS_API_URLS.SYNTHETICS_MONITORS}`
          : SYNTHETICS_API_URLS.SYNTHETICS_MONITORS
      )
      .send({ ids: Array.isArray(monitorId) ? monitorId : [monitorId] })
      .set(user.apiKeyHeader)
      .set(this.samlAuth.getInternalRequestHeader())
      .expect(statusCode);

    return deleteResponse;
  }

  async deleteMonitorByIdParam(
    user: RoleCredentials,
    monitorId?: string,
    statusCode = 200,
    spaceId?: string
  ) {
    const deleteResponse = await this.supertest
      .delete(
        spaceId
          ? `/s/${spaceId}${SYNTHETICS_API_URLS.SYNTHETICS_MONITORS}/${monitorId}`
          : SYNTHETICS_API_URLS.SYNTHETICS_MONITORS + '/' + monitorId
      )
      .send()
      .set(user.apiKeyHeader)
      .set(this.samlAuth.getInternalRequestHeader())
      .expect(statusCode);

    return deleteResponse;
  }
}
