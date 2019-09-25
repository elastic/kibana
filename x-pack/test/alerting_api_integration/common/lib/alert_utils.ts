/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Space, User } from '../types';
import { ObjectRemover } from './object_remover';
import { getUrlPrefix } from './space_test_utils';
import { ES_TEST_INDEX_NAME } from './es_test_index_tool';

export interface AlertUtilsOpts {
  user?: User;
  space: Space;
  supertestWithoutAuth: any;
  indexRecordActionId: string;
  objectRemover: ObjectRemover;
}

export class AlertUtils {
  private referenceCounter = 1;
  private readonly user?: User;
  private readonly space: Space;
  private readonly supertestWithoutAuth: any;
  private readonly indexRecordActionId: string;
  private readonly objectRemover: ObjectRemover;

  constructor({
    indexRecordActionId,
    objectRemover,
    space,
    supertestWithoutAuth,
    user,
  }: AlertUtilsOpts) {
    this.user = user;
    this.space = space;
    this.objectRemover = objectRemover;
    this.indexRecordActionId = indexRecordActionId;
    this.supertestWithoutAuth = supertestWithoutAuth;
  }

  public generateReference() {
    return ['alert-utils-ref', this.referenceCounter++, this.user ? this.user.username : ''].join(
      ':'
    );
  }

  public async enable(alertId: string) {
    let request = this.supertestWithoutAuth
      .post(`${getUrlPrefix(this.space.id)}/api/alert/${alertId}/_enable`)
      .set('kbn-xsrf', 'foo');
    if (this.user) {
      request = request.auth(this.user.username, this.user.password);
    }
    await request.expect(204, '');
  }

  public async disable(alertId: string) {
    let request = this.supertestWithoutAuth
      .post(`${getUrlPrefix(this.space.id)}/api/alert/${alertId}/_disable`)
      .set('kbn-xsrf', 'foo');
    if (this.user) {
      request = request.auth(this.user.username, this.user.password);
    }
    await request.expect(204, '');
  }

  public async mute(alertId: string) {
    let request = this.supertestWithoutAuth
      .post(`${getUrlPrefix(this.space.id)}/api/alert/${alertId}/_mute_all`)
      .set('kbn-xsrf', 'foo');
    if (this.user) {
      request = request.auth(this.user.username, this.user.password);
    }
    await request.expect(204, '');
  }

  public async unmute(alertId: string) {
    let request = this.supertestWithoutAuth
      .post(`${getUrlPrefix(this.space.id)}/api/alert/${alertId}/_unmute_all`)
      .set('kbn-xsrf', 'foo');
    if (this.user) {
      request = request.auth(this.user.username, this.user.password);
    }
    await request.expect(204, '');
  }

  public async muteInstance(alertId: string, instanceId: string) {
    let request = this.supertestWithoutAuth
      .post(
        `${getUrlPrefix(this.space.id)}/api/alert/${alertId}/alert_instance/${instanceId}/_mute`
      )
      .set('kbn-xsrf', 'foo');
    if (this.user) {
      request = request.auth(this.user.username, this.user.password);
    }
    await request.expect(204, '');
  }

  public async unmuteInstance(alertId: string, instanceId: string) {
    let request = this.supertestWithoutAuth
      .post(
        `${getUrlPrefix(this.space.id)}/api/alert/${alertId}/alert_instance/${instanceId}/_unmute`
      )
      .set('kbn-xsrf', 'foo');
    if (this.user) {
      request = request.auth(this.user.username, this.user.password);
    }
    await request.expect(204, '');
  }

  public async createAlwaysFiringAction(reference: string, overwrites = {}) {
    let request = this.supertestWithoutAuth
      .post(`${getUrlPrefix(this.space.id)}/api/alert`)
      .set('kbn-xsrf', 'foo');
    if (this.user) {
      request = request.auth(this.user.username, this.user.password);
    }
    const response = await request.send({
      enabled: true,
      interval: '1m',
      throttle: '1m',
      alertTypeId: 'test.always-firing',
      alertTypeParams: {
        index: ES_TEST_INDEX_NAME,
        reference,
      },
      actions: [
        {
          group: 'default',
          id: this.indexRecordActionId,
          params: {
            index: ES_TEST_INDEX_NAME,
            reference,
            message:
              'instanceContextValue: {{context.instanceContextValue}}, instanceStateValue: {{state.instanceStateValue}}',
          },
        },
      ],
      ...overwrites,
    });
    if (response.statusCode === 200) {
      this.objectRemover.add(this.space.id, response.body.id, 'alert');
    }
    return response;
  }
}
