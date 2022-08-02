/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { PutTransformsRequestSchema } from '@kbn/transform-plugin/common/api_schemas/transforms';
import { FtrProviderContext } from '../../../../../common/ftr_provider_context';
import {
  ES_TEST_INDEX_NAME,
  ESTestIndexTool,
  getUrlPrefix,
  ObjectRemover,
} from '../../../../../common/lib';
import { Spaces } from '../../../../scenarios';

const ACTION_TYPE_ID = '.index';
const ALERT_TYPE_ID = 'transform_health';
const ES_TEST_INDEX_SOURCE = 'transform-alert:transform-health';
const ES_TEST_INDEX_REFERENCE = '-na-';
const ES_TEST_OUTPUT_INDEX_NAME = `${ES_TEST_INDEX_NAME}-ts-output`;

const ALERT_INTERVAL_SECONDS = 3;

interface CreateAlertParams {
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
export default function alertTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const retry = getService('retry');
  const es = getService('es');
  const log = getService('log');
  const transform = getService('transform');

  const esTestIndexTool = new ESTestIndexTool(es, retry);
  const esTestIndexToolOutput = new ESTestIndexTool(es, retry, ES_TEST_OUTPUT_INDEX_NAME);

  describe('alert', async () => {
    const objectRemover = new ObjectRemover(supertest);
    let actionId: string;
    const transformId = 'test_transform_01';
    const destinationIndex = generateDestIndex(transformId);

    beforeEach(async () => {
      await esTestIndexTool.destroy();
      await esTestIndexTool.setup();

      await esTestIndexToolOutput.destroy();
      await esTestIndexToolOutput.setup();

      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/ml/farequote');
      await transform.testResources.setKibanaTimeZoneToUTC();

      actionId = await createAction();

      await transform.api.createIndices(destinationIndex);
      await createTransform(transformId);
    });

    afterEach(async () => {
      await objectRemover.removeAll();
      await esTestIndexTool.destroy();
      await esTestIndexToolOutput.destroy();
      await transform.api.cleanTransformIndices();
    });

    it('runs correctly', async () => {
      await createAlert({
        name: 'Test all transforms',
        includeTransforms: ['*'],
      });

      await stopTransform(transformId);

      log.debug('Checking created alert instances...');

      const docs = await waitForDocs(1);
      for (const doc of docs) {
        const { name, message } = doc._source.params;

        expect(name).to.be('Test all transforms');
        expect(message).to.be('Transform test_transform_01 is not started.');
      }
    });

    async function waitForDocs(count: number): Promise<any[]> {
      return await esTestIndexToolOutput.waitForDocs(
        ES_TEST_INDEX_SOURCE,
        ES_TEST_INDEX_REFERENCE,
        count
      );
    }

    async function createTransform(id: string) {
      const config = generateTransformConfig(id);
      await transform.api.createAndRunTransform(id, config);
    }

    async function createAlert(params: CreateAlertParams): Promise<string> {
      log.debug(`Creating an alerting rule "${params.name}"...`);
      const action = {
        id: actionId,
        group: 'transform_issue',
        params: {
          documents: [
            {
              source: ES_TEST_INDEX_SOURCE,
              reference: ES_TEST_INDEX_REFERENCE,
              params: {
                name: '{{{alertName}}}',
                message: '{{{context.message}}}',
              },
            },
          ],
        },
      };

      const { status, body: createdAlert } = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send({
          name: params.name,
          consumer: 'alerts',
          enabled: true,
          rule_type_id: ALERT_TYPE_ID,
          schedule: { interval: `${ALERT_INTERVAL_SECONDS}s` },
          actions: [action],
          notify_when: 'onActiveAlert',
          params: {
            includeTransforms: params.includeTransforms,
          },
        });

      // will print the error body, if an error occurred
      // if (statusCode !== 200) console.log(createdAlert);

      expect(status).to.be(200);

      const alertId = createdAlert.id;
      objectRemover.add(Spaces.space1.id, alertId, 'rule', 'alerting');

      return alertId;
    }

    async function stopTransform(id: string) {
      await transform.api.stopTransform(id);
    }

    async function createAction(): Promise<string> {
      log.debug('Creating an action...');
      // @ts-ignore
      const { statusCode, body: createdAction } = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/actions/connector`)
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'index action for transform health FT',
          connector_type_id: ACTION_TYPE_ID,
          config: {
            index: ES_TEST_OUTPUT_INDEX_NAME,
          },
          secrets: {},
        });

      expect(statusCode).to.be(200);

      log.debug(`Action with id "${createdAction.id}" has been created.`);

      const resultId = createdAction.id;
      objectRemover.add(Spaces.space1.id, resultId, 'connector', 'actions');

      return resultId;
    }
  });
}
