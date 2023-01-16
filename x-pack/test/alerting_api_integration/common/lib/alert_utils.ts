/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ES_TEST_INDEX_NAME } from '@kbn/alerting-api-integration-helpers';
import { Space, User } from '../types';
import { ObjectRemover } from './object_remover';
import { getUrlPrefix } from './space_test_utils';
import { getTestRuleData } from './get_test_rule_data';

export interface AlertUtilsOpts {
  user?: User;
  space: Space;
  supertestWithoutAuth: any;
  indexRecordActionId?: string;
  objectRemover?: ObjectRemover;
}

export interface CreateAlertWithActionOpts {
  indexRecordActionId?: string;
  objectRemover?: ObjectRemover;
  overwrites?: Record<string, any>;
  reference: string;
  notifyWhen?: string;
  summary?: boolean;
  throttle?: string | null;
}
export interface CreateNoopAlertOpts {
  objectRemover?: ObjectRemover;
  overwrites?: Record<string, any>;
}

interface UpdateAlwaysFiringAction {
  alertId: string;
  actionId: string | undefined;
  reference: string;
  user: User;
  overwrites: Record<string, any>;
}

export class AlertUtils {
  private referenceCounter = 1;
  private readonly user?: User;
  private readonly space: Space;
  private readonly supertestWithoutAuth: any;
  private readonly indexRecordActionId?: string;
  private readonly objectRemover?: ObjectRemover;

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

  public getEnableRequest(alertId: string) {
    const request = this.supertestWithoutAuth
      .post(`${getUrlPrefix(this.space.id)}/api/alerting/rule/${alertId}/_enable`)
      .set('kbn-xsrf', 'foo');
    if (this.user) {
      return request.auth(this.user.username, this.user.password);
    }
    return request;
  }

  public getAPIKeyRequest(ruleId: string) {
    const request = this.supertestWithoutAuth.get(
      `${getUrlPrefix(this.space.id)}/api/alerts_fixture/rule/${ruleId}/_get_api_key`
    );
    if (this.user) {
      return request.auth(this.user.username, this.user.password);
    }
    return request;
  }

  public getDisableRequest(alertId: string) {
    const request = this.supertestWithoutAuth
      .post(`${getUrlPrefix(this.space.id)}/api/alerting/rule/${alertId}/_disable`)
      .set('kbn-xsrf', 'foo');
    if (this.user) {
      return request.auth(this.user.username, this.user.password);
    }
    return request;
  }

  public getSnoozeRequest(alertId: string) {
    const request = this.supertestWithoutAuth
      .post(`${getUrlPrefix(this.space.id)}/internal/alerting/rule/${alertId}/_snooze`)
      .set('kbn-xsrf', 'foo')
      .set('content-type', 'application/json');
    if (this.user) {
      return request.auth(this.user.username, this.user.password);
    }
    return request;
  }

  public getUnsnoozeRequest(alertId: string) {
    const request = this.supertestWithoutAuth
      .post(`${getUrlPrefix(this.space.id)}/internal/alerting/rule/${alertId}/_unsnooze`)
      .set('kbn-xsrf', 'foo')
      .set('content-type', 'application/json');
    if (this.user) {
      return request.auth(this.user.username, this.user.password);
    }
    return request;
  }

  public getMuteAllRequest(alertId: string) {
    const request = this.supertestWithoutAuth
      .post(`${getUrlPrefix(this.space.id)}/api/alerting/rule/${alertId}/_mute_all`)
      .set('kbn-xsrf', 'foo');
    if (this.user) {
      return request.auth(this.user.username, this.user.password);
    }
    return request;
  }

  public getUnmuteAllRequest(alertId: string) {
    const request = this.supertestWithoutAuth
      .post(`${getUrlPrefix(this.space.id)}/api/alerting/rule/${alertId}/_unmute_all`)
      .set('kbn-xsrf', 'foo');
    if (this.user) {
      return request.auth(this.user.username, this.user.password);
    }
    return request;
  }

  public getMuteInstanceRequest(alertId: string, instanceId: string) {
    const request = this.supertestWithoutAuth
      .post(`${getUrlPrefix(this.space.id)}/api/alerting/rule/${alertId}/alert/${instanceId}/_mute`)
      .set('kbn-xsrf', 'foo');
    if (this.user) {
      return request.auth(this.user.username, this.user.password);
    }
    return request;
  }

  public getUnmuteInstanceRequest(alertId: string, instanceId: string) {
    const request = this.supertestWithoutAuth
      .post(
        `${getUrlPrefix(this.space.id)}/api/alerting/rule/${alertId}/alert/${instanceId}/_unmute`
      )
      .set('kbn-xsrf', 'foo');
    if (this.user) {
      return request.auth(this.user.username, this.user.password);
    }
    return request;
  }

  public getUpdateApiKeyRequest(alertId: string) {
    const request = this.supertestWithoutAuth
      .post(`${getUrlPrefix(this.space.id)}/internal/alerting/rule/${alertId}/_update_api_key`)
      .set('kbn-xsrf', 'foo');
    if (this.user) {
      return request.auth(this.user.username, this.user.password);
    }
    return request;
  }

  public async enable(alertId: string) {
    await this.getEnableRequest(alertId).expect(204, '');
  }

  public async disable(alertId: string) {
    await this.getDisableRequest(alertId).expect(204, '');
  }

  public async muteAll(alertId: string) {
    await this.getMuteAllRequest(alertId).expect(204, '');
  }

  public async unmuteAll(alertId: string) {
    await this.getUnmuteAllRequest(alertId).expect(204, '');
  }

  public async muteInstance(alertId: string, instanceId: string) {
    await this.getMuteInstanceRequest(alertId, instanceId).expect(204, '');
  }

  public async unmuteInstance(alertId: string, instanceId: string) {
    await this.getUnmuteInstanceRequest(alertId, instanceId).expect(204, '');
  }

  public async updateApiKey(alertId: string) {
    await this.getUpdateApiKeyRequest(alertId).expect(204, '');
  }

  public async createAlwaysFiringAction({
    objectRemover,
    overwrites = {},
    indexRecordActionId,
    reference,
    notifyWhen,
    summary,
    throttle,
  }: CreateAlertWithActionOpts) {
    const objRemover = objectRemover || this.objectRemover;
    const actionId = indexRecordActionId || this.indexRecordActionId;

    if (!objRemover) {
      throw new Error('objectRemover is required');
    }
    if (!actionId) {
      throw new Error('indexRecordActionId is required ');
    }

    let request = this.supertestWithoutAuth
      .post(`${getUrlPrefix(this.space.id)}/api/alerting/rule`)
      .set('kbn-xsrf', 'foo');
    if (this.user) {
      request = request.auth(this.user.username, this.user.password);
    }
    let alertBody;
    if (summary !== undefined) {
      alertBody = getAlwaysFiringAlertWithThrottledActionData(
        reference,
        actionId,
        notifyWhen,
        throttle,
        summary
      );
    } else {
      alertBody = getDefaultAlwaysFiringAlertData(reference, actionId, notifyWhen);
    }

    const response = await request.send({ ...alertBody, ...overwrites });
    if (response.statusCode === 200) {
      objRemover.add(this.space.id, response.body.id, 'rule', 'alerting');
    }
    return response;
  }

  public async createAlwaysFiringSummaryAction({
    objectRemover,
    overwrites = {},
    indexRecordActionId,
    reference,
    notifyWhen,
    throttle,
  }: CreateAlertWithActionOpts) {
    const objRemover = objectRemover || this.objectRemover;
    const actionId = indexRecordActionId || this.indexRecordActionId;

    if (!objRemover) {
      throw new Error('objectRemover is required');
    }
    if (!actionId) {
      throw new Error('indexRecordActionId is required ');
    }

    let request = this.supertestWithoutAuth
      .post(`${getUrlPrefix(this.space.id)}/api/alerting/rule`)
      .set('kbn-xsrf', 'foo');
    if (this.user) {
      request = request.auth(this.user.username, this.user.password);
    }
    const rule = getAlwaysFiringRuleWithSummaryAction(reference, actionId, notifyWhen, throttle);

    const response = await request.send({ ...rule, ...overwrites });
    if (response.statusCode === 200) {
      objRemover.add(this.space.id, response.body.id, 'rule', 'alerting');
    }
    return response;
  }

  public async updateAlwaysFiringAction({
    alertId,
    actionId,
    reference,
    user,
    overwrites = {},
  }: UpdateAlwaysFiringAction) {
    actionId = actionId || this.indexRecordActionId;

    if (!actionId) {
      throw new Error('actionId is required ');
    }

    const request = this.supertestWithoutAuth
      .put(`${getUrlPrefix(this.space.id)}/api/alerting/rule/${alertId}`)
      .set('kbn-xsrf', 'foo')
      .auth(user.username, user.password);

    const {
      rule_type_id: alertTypeId,
      enabled,
      consumer,
      ...alertBody
    } = getDefaultAlwaysFiringAlertData(reference, actionId);

    const response = await request.send({ ...alertBody, ...overwrites });
    return response;
  }

  public async createAlwaysFailingAction({
    objectRemover,
    overwrites = {},
    indexRecordActionId,
    reference,
  }: CreateAlertWithActionOpts) {
    const objRemover = objectRemover || this.objectRemover;
    const actionId = indexRecordActionId || this.indexRecordActionId;

    if (!objRemover) {
      throw new Error('objectRemover is required');
    }
    if (!actionId) {
      throw new Error('indexRecordActionId is required ');
    }

    let request = this.supertestWithoutAuth
      .post(`${getUrlPrefix(this.space.id)}/api/alerting/rule`)
      .set('kbn-xsrf', 'foo');
    if (this.user) {
      request = request.auth(this.user.username, this.user.password);
    }
    const response = await request.send({
      enabled: true,
      name: 'fail',
      schedule: { interval: '30s' },
      throttle: '30s',
      tags: [],
      rule_type_id: 'test.failing',
      consumer: 'alertsFixture',
      params: {
        index: ES_TEST_INDEX_NAME,
        reference,
      },
      notify_when: 'onActiveAlert',
      actions: [],
      ...overwrites,
    });
    if (response.statusCode === 200) {
      objRemover.add(this.space.id, response.body.id, 'rule', 'alerting');
    }
    return response;
  }

  public replaceApiKeys(id: string) {
    let request = this.supertestWithoutAuth
      .put(`/api/alerts_fixture/${id}/replace_api_key`)
      .set('kbn-xsrf', 'foo');
    if (this.user) {
      request = request.auth(this.user.username, this.user.password);
    }
    return request.send({ spaceId: this.space.id });
  }

  public async createNoopAlert({ objectRemover, overwrites = {} }: CreateNoopAlertOpts) {
    const objRemover = objectRemover || this.objectRemover;

    if (!objRemover) {
      throw new Error('objectRemover is required');
    }

    let request = this.supertestWithoutAuth
      .post(`${getUrlPrefix(this.space.id)}/api/alerting/rule`)
      .set('kbn-xsrf', 'foo');
    if (this.user) {
      request = request.auth(this.user.username, this.user.password);
    }
    const response = await request.send({
      ...getTestRuleData(),
      ...overwrites,
    });
    if (response.statusCode === 200) {
      objRemover.add(this.space.id, response.body.id, 'rule', 'alerting');
    }
    return response;
  }
}

export function getConsumerUnauthorizedErrorMessage(
  operation: string,
  alertType: string,
  consumer: string
) {
  return `Unauthorized to ${operation} a "${alertType}" rule for "${consumer}"`;
}

export function getProducerUnauthorizedErrorMessage(
  operation: string,
  alertType: string,
  producer: string
) {
  return `Unauthorized to ${operation} a "${alertType}" rule by "${producer}"`;
}

function getDefaultAlwaysFiringAlertData(
  reference: string,
  actionId: string,
  notifyWhen = 'onActiveAlert'
) {
  const messageTemplate = `
alertId: {{alertId}},
alertName: {{alertName}},
spaceId: {{spaceId}},
tags: {{tags}},
alertInstanceId: {{alertInstanceId}},
alertActionGroup: {{alertActionGroup}},
instanceContextValue: {{context.instanceContextValue}},
instanceStateValue: {{state.instanceStateValue}}
`.trim();
  return {
    enabled: true,
    name: 'abc',
    schedule: { interval: '1m' },
    throttle: '1m',
    tags: ['tag-A', 'tag-B'],
    rule_type_id: 'test.always-firing',
    consumer: 'alertsFixture',
    params: {
      index: ES_TEST_INDEX_NAME,
      reference,
    },
    notify_when: notifyWhen,
    actions: [
      {
        group: 'default',
        id: actionId,
        params: {
          index: ES_TEST_INDEX_NAME,
          reference,
          message: messageTemplate,
        },
      },
    ],
  };
}

function getAlwaysFiringAlertWithThrottledActionData(
  reference: string,
  actionId: string,
  notifyWhen = 'onActiveAlert',
  throttle: string | null = '1m',
  summary = false
) {
  const messageTemplate = `
alertId: {{alertId}},
alertName: {{alertName}},
spaceId: {{spaceId}},
tags: {{tags}},
alertInstanceId: {{alertInstanceId}},
alertActionGroup: {{alertActionGroup}},
instanceContextValue: {{context.instanceContextValue}},
instanceStateValue: {{state.instanceStateValue}}
`.trim();
  return {
    enabled: true,
    name: 'abc',
    schedule: { interval: '1m' },
    tags: ['tag-A', 'tag-B'],
    rule_type_id: 'test.always-firing',
    consumer: 'alertsFixture',
    params: {
      index: ES_TEST_INDEX_NAME,
      reference,
    },
    actions: [
      {
        group: 'default',
        id: actionId,
        params: {
          index: ES_TEST_INDEX_NAME,
          reference,
          message: messageTemplate,
        },
        frequency: {
          summary,
          notify_when: notifyWhen,
          throttle,
        },
      },
    ],
  };
}

function getAlwaysFiringRuleWithSummaryAction(
  reference: string,
  actionId: string,
  notifyWhen = 'onActiveAlert',
  throttle: string | null = '1m'
) {
  const messageTemplate =
    `Alerts, ` +
    `all:{{alerts.all.count}}, ` +
    `new:{{alerts.new.count}} IDs:[{{#alerts.new.data}}{{kibana.alert.instance.id}},{{/alerts.new.data}}], ` +
    `ongoing:{{alerts.ongoing.count}} IDs:[{{#alerts.ongoing.data}}{{kibana.alert.instance.id}},{{/alerts.ongoing.data}}], ` +
    `recovered:{{alerts.recovered.count}} IDs:[{{#alerts.recovered.data}}{{kibana.alert.instance.id}},{{/alerts.recovered.data}}]`.trim();

  return {
    enabled: true,
    name: 'abc',
    schedule: { interval: '1m' },
    tags: ['tag-A', 'tag-B'],
    rule_type_id: 'test.always-firing-alert-as-data',
    consumer: 'alertsFixture',
    params: {
      index: ES_TEST_INDEX_NAME,
      reference,
    },
    actions: [
      {
        group: 'default',
        id: actionId,
        params: {
          index: ES_TEST_INDEX_NAME,
          reference,
          message: messageTemplate,
        },
        frequency: {
          summary: true,
          notify_when: notifyWhen,
          throttle,
        },
      },
    ],
  };
}
