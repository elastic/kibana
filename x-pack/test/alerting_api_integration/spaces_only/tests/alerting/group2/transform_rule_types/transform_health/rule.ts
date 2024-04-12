/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { PutTransformsRequestSchema } from '@kbn/transform-plugin/common/api_schemas/transforms';
import { ESTestIndexTool, ES_TEST_INDEX_NAME } from '@kbn/alerting-api-integration-helpers';
import {
  ALERT_ACTION_GROUP,
  ALERT_INSTANCE_ID,
  ALERT_REASON,
  ALERT_RULE_CATEGORY,
  ALERT_RULE_NAME,
  ALERT_RULE_TYPE_ID,
  ALERT_RULE_UUID,
  ALERT_STATUS,
  EVENT_ACTION,
} from '@kbn/rule-data-utils';
import { TRANSFORM_HEALTH_RESULTS } from '@kbn/transform-plugin/common/constants';
import { FtrProviderContext } from '../../../../../../common/ftr_provider_context';
import { getUrlPrefix, ObjectRemover } from '../../../../../../common/lib';
import { Spaces } from '../../../../../scenarios';

const CONNECTOR_TYPE_ID = '.index';
const RULE_TYPE_ID = 'transform_health';
const ES_TEST_INDEX_SOURCE = 'transform-alert:transform-health';
const ES_TEST_INDEX_REFERENCE = '-na-';
const ES_TEST_OUTPUT_INDEX_NAME = `${ES_TEST_INDEX_NAME}-ts-output`;

const RULE_INTERVAL_SECONDS = 3;

interface CreateRuleParams {
  name: string;
  includeTransforms: string[];
  excludeTransforms?: string[] | null;
  testsConfig?: {
    notStarted?: {
      enabled: boolean;
    } | null;
  } | null;
}

export function generateDestIndex(transformId: string): string {
  return `user-${transformId}`;
}

export function generateTransformConfig(transformId: string): PutTransformsRequestSchema {
  const destinationIndex = generateDestIndex(transformId);

  return {
    source: { index: ['ft_farequote'] },
    pivot: {
      group_by: { airline: { terms: { field: 'airline' } } },
      aggregations: { '@timestamp.value_count': { value_count: { field: '@timestamp' } } },
    },
    dest: { index: destinationIndex },
    sync: {
      time: { field: '@timestamp' },
    },
  };
}

// eslint-disable-next-line import/no-default-export
export default function ruleTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const retry = getService('retry');
  const es = getService('es');
  const log = getService('log');
  const transform = getService('transform');

  const esTestIndexTool = new ESTestIndexTool(es, retry);
  const esTestIndexToolOutput = new ESTestIndexTool(es, retry, ES_TEST_OUTPUT_INDEX_NAME);
  const esTestIndexToolAAD = new ESTestIndexTool(
    es,
    retry,
    `.internal.alerts-transform.health.alerts-default-000001`
  );

  // Failing: See https://github.com/elastic/kibana/issues/177215
  describe.skip('rule', async () => {
    const objectRemover = new ObjectRemover(supertest);
    let connectorId: string;
    const transformId = 'test_transform_01';
    const destinationIndex = generateDestIndex(transformId);

    beforeEach(async () => {
      await esTestIndexTool.destroy();
      await esTestIndexTool.setup();

      await esTestIndexToolOutput.destroy();
      await esTestIndexToolOutput.setup();

      await esTestIndexToolAAD.removeAll();

      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/ml/farequote');
      await transform.testResources.setKibanaTimeZoneToUTC();

      connectorId = await createConnector();

      await transform.api.createIndices(destinationIndex);
      await createTransform(transformId);
    });

    afterEach(async () => {
      await objectRemover.removeAll();
      await esTestIndexTool.destroy();
      await esTestIndexToolOutput.destroy();
      await esTestIndexToolAAD.removeAll();
      await transform.api.cleanTransformIndices();
    });

    it('runs correctly', async () => {
      const ruleId = await createRule({
        name: 'Test all transforms',
        includeTransforms: ['*'],
      });

      await stopTransform(transformId);

      log.debug('Checking created alerts...');

      const docs = await waitForDocs(1);
      for (const doc of docs) {
        const { name, message } = doc._source.params;

        expect(name).to.be('Test all transforms');
        expect(message).to.be('Transform test_transform_01 is not started.');
      }

      const aadDocs = await getAllAADDocs(1);
      const alertDoc = aadDocs.body.hits.hits[0]._source;
      expect(alertDoc[ALERT_REASON]).to.be(`Transform test_transform_01 is not started.`);
      expect(alertDoc[TRANSFORM_HEALTH_RESULTS]).to.eql([
        { transform_id: 'test_transform_01', transform_state: 'stopped', health_status: 'green' },
      ]);
      expect(alertDoc[ALERT_RULE_CATEGORY]).to.be(`Transform health`);
      expect(alertDoc[ALERT_RULE_NAME]).to.be(`Test all transforms`);
      expect(alertDoc[ALERT_RULE_TYPE_ID]).to.be(`transform_health`);
      expect(alertDoc[ALERT_RULE_UUID]).to.be(ruleId);
      expect(alertDoc[EVENT_ACTION]).to.be(`open`);
      expect(alertDoc[ALERT_ACTION_GROUP]).to.be(`transform_issue`);
      expect(alertDoc[ALERT_INSTANCE_ID]).to.be(`Transform is not started`);
      expect(alertDoc[ALERT_STATUS]).to.be(`active`);
    });

    async function waitForDocs(count: number): Promise<any[]> {
      return await esTestIndexToolOutput.waitForDocs(
        ES_TEST_INDEX_SOURCE,
        ES_TEST_INDEX_REFERENCE,
        count
      );
    }

    async function getAllAADDocs(count: number): Promise<any> {
      return await esTestIndexToolAAD.getAll(count);
    }

    async function createTransform(id: string) {
      const config = generateTransformConfig(id);
      await transform.api.createAndRunTransform(id, config);
    }

    async function createRule(params: CreateRuleParams): Promise<string> {
      log.debug(`Creating an alerting rule "${params.name}"...`);
      const action = {
        id: connectorId,
        group: 'transform_issue',
        params: {
          documents: [
            {
              source: ES_TEST_INDEX_SOURCE,
              reference: ES_TEST_INDEX_REFERENCE,
              params: {
                name: '{{{rule.name}}}',
                message: '{{{context.message}}}',
              },
            },
          ],
        },
      };

      const { status, body: createdRule } = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send({
          name: params.name,
          consumer: 'alerts',
          enabled: true,
          rule_type_id: RULE_TYPE_ID,
          schedule: { interval: `${RULE_INTERVAL_SECONDS}s` },
          actions: [action],
          notify_when: 'onActiveAlert',
          params: {
            includeTransforms: params.includeTransforms,
          },
        });

      // will print the error body, if an error occurred
      // if (statusCode !== 200) console.log(createdRule);

      expect(status).to.be(200);

      const ruleId = createdRule.id;
      objectRemover.add(Spaces.space1.id, ruleId, 'rule', 'alerting');

      return ruleId;
    }

    async function stopTransform(id: string) {
      await transform.api.stopTransform(id);
    }

    async function createConnector(): Promise<string> {
      log.debug('Creating a connector...');
      // @ts-ignore
      const { statusCode, body: createdConnector } = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/actions/connector`)
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'index action for transform health FT',
          connector_type_id: CONNECTOR_TYPE_ID,
          config: {
            index: ES_TEST_OUTPUT_INDEX_NAME,
          },
          secrets: {},
        });

      expect(statusCode).to.be(200);

      log.debug(`Connector with id "${createdConnector.id}" has been created.`);

      const resultId = createdConnector.id;
      objectRemover.add(Spaces.space1.id, resultId, 'connector', 'actions');

      return resultId;
    }
  });
}
