/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import axios, { AxiosInstance } from 'axios';
import util from 'util';
import { ToolingLog } from '@kbn/dev-utils';

export class Actions {
  private log: ToolingLog;
  private axios: AxiosInstance;

  constructor(url: string, log: ToolingLog) {
    this.log = log;
    this.axios = axios.create({
      headers: { 'kbn-xsrf': 'x-pack/ftr/services/alerting/actions' },
      baseURL: url,
      maxRedirects: 0,
      validateStatus: () => true, // we do our own validation below and throw better error messages
    });
  }

  public async createAction(actionParams: {
    name: string;
    actionTypeId: string;
    config: Record<string, any>;
    secrets: Record<string, any>;
  }) {
    this.log.debug(`creating action ${actionParams.name}`);

    const {
      data: action,
      status: actionStatus,
      statusText: actionStatusText,
    } = await this.axios.post(`/api/actions/action`, actionParams);
    if (actionStatus !== 200) {
      throw new Error(
        `Expected status code of 200, received ${actionStatus} ${actionStatusText}: ${util.inspect(
          action
        )}`
      );
    }

    this.log.debug(`created action ${action.id}`);
    return action;
  }
}
