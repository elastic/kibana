/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Client } from '@elastic/elasticsearch';
import pRetry from 'p-retry';
import { SuperTest, Test } from 'supertest';
import { ApmRuleType } from '@kbn/apm-plugin/common/rules/apm_rule_types';
import { ApmRuleParamsType } from '@kbn/apm-plugin/common/rules/schema';
import {
  APM_ALERTS_INDEX,
  APM_RULE_CONNECTOR_INDEX,
  CONNECTOR_ENDPOINT,
  KIBANA_EVENT_LOG_INDEX,
  RULE_ENDPOINT,
} from './constants';
import { getActiveAlert } from './get_active_alert';
import { getConnectorActionMessage } from './get_connector_action_message';
import { getRuleStatus } from './get_rule_status';

interface Action {
  group: string;
  id: string;
  params: {
    documents: [{ message: string; id: string }];
  };
  frequency: {
    notify_when: string;
    summary: boolean;
  };
}

export class AlertTestHelper {
  private readonly esClient: Client;
  private readonly supertest: SuperTest<Test>;

  private readonly indices = {
    alert: APM_ALERTS_INDEX,
    connector: APM_RULE_CONNECTOR_INDEX,
    kibanaLog: KIBANA_EVENT_LOG_INDEX,
  };

  constructor({ esClient, supertest }: { esClient: Client; supertest: SuperTest<Test> }) {
    this.esClient = esClient;
    this.supertest = supertest;
  }

  async createIndexConnector({ name }: { name: string }) {
    const { body } = await this.supertest
      .post(`${CONNECTOR_ENDPOINT}`)
      .set('kbn-xsrf', 'foo')
      .send({
        name,
        config: {
          index: this.indices.connector,
          refresh: true,
        },
        connector_type_id: '.index',
      });
    return body.id as string;
  }

  async createApmRule<T extends ApmRuleType>({
    name,
    ruleTypeId,
    params,
    actions = [],
  }: {
    ruleTypeId: T;
    name: string;
    params: ApmRuleParamsType[T];
    actions?: Action[];
  }) {
    const { body } = await this.supertest
      .post(`${RULE_ENDPOINT}`)
      .set('kbn-xsrf', 'foo')
      .send({
        params,
        consumer: 'apm',
        schedule: {
          interval: '1m',
        },
        tags: ['apm'],
        name,
        rule_type_id: ruleTypeId,
        actions,
      });
    return body;
  }

  async waitForActiveAlert({ ruleId }: { ruleId: string }): Promise<Record<string, any>> {
    return pRetry(
      () => getActiveAlert({ ruleId, esClient: this.esClient, index: this.indices.alert }),
      {
        retries: 10,
        factor: 1.5,
      }
    );
  }

  async waitForRuleStatus({
    id,
    expectedStatus,
  }: {
    id: string;
    expectedStatus: string;
  }): Promise<Record<string, any>> {
    return pRetry(() => getRuleStatus({ id, expectedStatus, supertest: this.supertest }), {
      retries: 10,
      factor: 1.5,
    });
  }

  async waitForConnectorActionMessage({ messageId }: { messageId?: string }): Promise<string> {
    return pRetry(
      () =>
        getConnectorActionMessage({
          messageId,
          esClient: this.esClient,
          index: this.indices.connector,
        }),
      {
        retries: 10,
        factor: 1.5,
      }
    );
  }

  async cleanAll() {
    for (const [, index] of Object.entries(this.indices)) {
      await this.esClient.deleteByQuery({
        index,
        query: {
          bool: {
            should: [
              {
                term: {
                  'kibana.alert.rule.consumer': {
                    value: 'apm',
                  },
                },
              },
              {
                term: {
                  _index: {
                    value: this.indices.connector,
                  },
                },
              },
            ],
          },
        },
      });
    }
  }
}
