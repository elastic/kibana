/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import axios, { AxiosInstance } from 'axios';
import util from 'util';
import { ToolingLog } from '@kbn/dev-utils';

export class Alerts {
  private log: ToolingLog;
  private axios: AxiosInstance;

  constructor(url: string, log: ToolingLog) {
    this.log = log;
    this.axios = axios.create({
      headers: { 'kbn-xsrf': 'x-pack/ftr/services/alerting/alerts' },
      baseURL: url,
      maxRedirects: 0,
      validateStatus: () => true, // we do our own validation below and throw better error messages
    });
  }

  public async createAlwaysFiringWithActions(
    name: string,
    actions: Array<{
      id: string;
      group: string;
      params: Record<string, any>;
    }>,
    params: Record<string, any> = {}
  ) {
    this.log.debug(`creating alert ${name}`);

    const { data: alert, status, statusText } = await this.axios.post(`/api/alert`, {
      enabled: true,
      name,
      tags: ['foo'],
      alertTypeId: 'test.always-firing',
      consumer: 'bar',
      schedule: { interval: '1m' },
      throttle: '1m',
      actions,
      params,
    });
    if (status !== 200) {
      throw new Error(
        `Expected status code of 200, received ${status} ${statusText}: ${util.inspect(alert)}`
      );
    }

    this.log.debug(`created alert ${alert.id}`);

    return alert;
  }

  public async createAlwaysFiringWithAction(
    name: string,
    action: {
      id: string;
      group: string;
      params: Record<string, any>;
    }
  ) {
    return this.createAlwaysFiringWithActions(name, [action]);
  }

  public async deleteAlert(id: string) {
    this.log.debug(`deleting alert ${id}`);

    const { data: alert, status, statusText } = await this.axios.delete(`/api/alert/${id}`);
    if (status !== 204) {
      throw new Error(
        `Expected status code of 204, received ${status} ${statusText}: ${util.inspect(alert)}`
      );
    }
    this.log.debug(`deleted alert ${alert.id}`);
  }

  public async getAlertState(id: string) {
    this.log.debug(`getting alert ${id} state`);

    const { data } = await this.axios.get(`/api/alert/${id}/state`);
    return data;
  }

  public async muteAlertInstance(id: string, instanceId: string) {
    this.log.debug(`muting instance ${instanceId} under alert ${id}`);

    const { data: alert, status, statusText } = await this.axios.post(
      `/api/alert/${id}/alert_instance/${instanceId}/_mute`
    );
    if (status !== 204) {
      throw new Error(
        `Expected status code of 204, received ${status} ${statusText}: ${util.inspect(alert)}`
      );
    }
    this.log.debug(`muted alert instance ${instanceId}`);
  }
}
