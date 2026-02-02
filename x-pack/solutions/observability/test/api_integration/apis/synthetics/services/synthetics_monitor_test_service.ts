/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SYNTHETICS_API_URLS } from '@kbn/synthetics-plugin/common/constants';
import { v4 as uuidv4 } from 'uuid';
import expect from '@kbn/expect';
import moment from 'moment/moment';
import { omit } from 'lodash';
import type { KibanaSupertestProvider } from '@kbn/ftr-common-functional-services';
import type { FtrProviderContext } from '../../../ftr_provider_context';

export class SyntheticsMonitorTestService {
  private supertest: ReturnType<typeof KibanaSupertestProvider>;
  private getService: FtrProviderContext['getService'];
  public apiKey: string | undefined = '';

  constructor(getService: FtrProviderContext['getService']) {
    this.supertest = getService('supertest');
    this.supertest = getService('supertest');
    this.getService = getService;
  }

  async getMonitor(
    monitorId: string,
    {
      statusCode = 200,
      space,
      internal,
    }: {
      statusCode?: number;
      space?: string;
      internal?: boolean;
    } = {}
  ) {
    let url = SYNTHETICS_API_URLS.GET_SYNTHETICS_MONITOR.replace('{monitorId}', monitorId);
    if (space) {
      url = '/s/' + space + url;
    }
    if (internal) {
      url += `?internal=${internal}`;
    }
    const apiResponse = await this.supertest.get(url).expect(200);

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

  async createMonitor({
    monitor,
    spaceId,
    statusCode = 200,
  }: {
    monitor: any;
    statusCode?: number;
    spaceId?: string;
  }) {
    let url = SYNTHETICS_API_URLS.SYNTHETICS_MONITORS as string;
    if (spaceId) url = `/s/${spaceId}` + url;
    const result = await this.supertest.post(url).set('kbn-xsrf', 'true').send(monitor);

    expect(result.status).eql(statusCode, JSON.stringify(result.body));

    if (statusCode === 200) {
      const { created_at: createdAt, updated_at: updatedAt, id, config_id: configId } = result.body;
      expect(id).not.empty();
      expect(configId).not.empty();
      expect([createdAt, updatedAt].map((d) => moment(d).isValid())).eql([true, true]);
      return {
        rawBody: result.body,
        body: {
          ...omit(result.body, [
            'created_at',
            'updated_at',
            'id',
            'config_id',
            'form_monitor_type',
          ]),
        },
      };
    }
    return result.body;
  }

  async addsNewSpace(uptimePermissions: string[] = ['all']) {
    const username = 'admin';
    const password = `${username}-password`;
    const roleName = 'uptime-role';
    const SPACE_ID = `test-space-${uuidv4()}`;
    const SPACE_NAME = `test-space-name ${uuidv4()}`;

    const security = this.getService('security');
    const kibanaServer = this.getService('kibanaServer');

    await kibanaServer.spaces.create({ id: SPACE_ID, name: SPACE_NAME });
    await security.role.create(roleName, {
      kibana: [
        {
          feature: {
            uptime: uptimePermissions,
            slo: ['all'],
          },
          spaces: ['*'],
        },
      ],
    });
    await security.user.create(username, {
      password,
      roles: [roleName],
      full_name: 'a kibana user',
    });

    return { username, password, SPACE_ID, roleName };
  }

  async deleteMonitor(monitorId?: string | string[], statusCode = 200, spaceId?: string) {
    const deleteResponse = await this.supertest
      .delete(
        spaceId
          ? `/s/${spaceId}${SYNTHETICS_API_URLS.SYNTHETICS_MONITORS}`
          : SYNTHETICS_API_URLS.SYNTHETICS_MONITORS
      )
      .send({ ids: Array.isArray(monitorId) ? monitorId : [monitorId] })
      .set('kbn-xsrf', 'true');
    expect(deleteResponse.status).to.eql(statusCode);
    return deleteResponse;
  }

  async createMaintenanceWindow(spaceId?: string) {
    const path = spaceId
      ? `/s/${spaceId}/internal/alerting/rules/maintenance_window`
      : '/internal/alerting/rules/maintenance_window';
    const response = await this.supertest
      .post(path)
      .set('kbn-xsrf', 'foo')
      .send({
        title: 'test-maintenance-window',
        duration: 60 * 60 * 1000, // 1 hr
        r_rule: {
          dtstart: new Date().toISOString(),
          tzid: 'UTC',
          freq: 0,
          count: 1,
        },
        category_ids: ['management'],
      });

    expect(response.status).to.equal(200);

    return response.body;
  }
}
