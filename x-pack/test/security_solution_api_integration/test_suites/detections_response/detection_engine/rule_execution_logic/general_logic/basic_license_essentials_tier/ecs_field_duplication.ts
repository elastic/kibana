/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';

import {
  ALERT_ORIGINAL_DATA_STREAM_DATASET,
  ALERT_ORIGINAL_DATA_STREAM_NAMESPACE,
  ALERT_ORIGINAL_DATA_STREAM_TYPE,
  ALERT_ORIGINAL_TIME,
} from '@kbn/security-solution-plugin/common/field_maps/field_names';
import { ALERT_RULE_UUID } from '@kbn/rule-data-utils';
import {
  createRule,
  deleteAllAlerts,
  deleteAllRules,
  getAlertsById,
  getRuleForAlertTesting,
  waitForAlertsToBePresent,
  waitForRuleSuccess,
} from '../../../../../../../common/utils/security_solution';
import { searchAlerts } from '../../../../../../../common/utils/security_solution/detections_response/alerts/search_alerts';
import { getPreviewAlerts, previewRule } from '../../../../utils';
import { FtrProviderContext } from '../../../../../../ftr_provider_context';

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const es = getService('es');
  const log = getService('log');

  describe('@ess @serverless @serverlessQA Source ECS fields copied to other alert fields', () => {
    before(async () => {
      await esArchiver.load(
        'x-pack/test/functional/es_archives/security_solution/ecs_fields_duplicated_for_alerts'
      );
    });

    after(async () => {
      await esArchiver.unload(
        'x-pack/test/functional/es_archives/security_solution/ecs_fields_duplicated_for_alerts'
      );
      await deleteAllAlerts(supertest, log, es);
      await deleteAllRules(supertest, log);
    });

    describe('data_stream fields', () => {
      it('generates alerts with both the original and copied data_stream fields', async () => {
        const rule = getRuleForAlertTesting(['ecs_fields_duplicated_for_alerts']);
        const { id } = await createRule(supertest, log, rule);
        await waitForRuleSuccess({ supertest, log, id });
        await waitForAlertsToBePresent(supertest, log, 3, [id]);
        const alertsResponse = await getAlertsById(supertest, log, id);
        const alerts = alertsResponse.hits.hits;
        const alert = alerts[0];

        expect(alert._source).toEqual(
          expect.objectContaining({
            data_stream: {
              type: 'logs',
              dataset: 'dataset_name_1',
              namespace: 'default',
            },
            'kibana.alert.original_data_stream.dataset': 'dataset_name_1',
            'kibana.alert.original_data_stream.type': 'logs',
            'kibana.alert.original_data_stream.namespace': 'default',
          })
        );
      });

      it('generates alerts are able to be queried by copied data_stream fields', async () => {
        const rule = getRuleForAlertTesting(['ecs_fields_duplicated_for_alerts']);
        const { id } = await createRule(supertest, log, rule);
        await waitForRuleSuccess({ supertest, log, id });
        await waitForAlertsToBePresent(supertest, log, 3, [id]);

        const alertsByDataStream = await searchAlerts(supertest, log, {
          query: {
            bool: {
              must: [
                {
                  terms: {
                    [ALERT_RULE_UUID]: [id],
                  },
                },
                {
                  match: {
                    [ALERT_ORIGINAL_DATA_STREAM_DATASET]: 'dataset_name_1',
                  },
                },
                {
                  match: {
                    [ALERT_ORIGINAL_DATA_STREAM_NAMESPACE]: 'default',
                  },
                },
                {
                  match: {
                    [ALERT_ORIGINAL_DATA_STREAM_TYPE]: 'logs',
                  },
                },
              ],
            },
          },
        });

        expect(alertsByDataStream.hits.hits).toHaveLength(3);
      });
    });

    describe('event fields', () => {
      it('generates alerts with both the original and copied event fields', async () => {
        const rule = getRuleForAlertTesting(['ecs_fields_duplicated_for_alerts']);
        const { previewId } = await previewRule({
          supertest,
          rule,
          timeframeEnd: new Date('2025-05-07T14:34:11.000Z'),
          invocationCount: 1,
        });
        const previewAlerts = await getPreviewAlerts({
          es,
          previewId,
          sort: [ALERT_ORIGINAL_TIME],
        });

        expect(previewAlerts.length).toBe(3);

        expect(previewAlerts[0]._source).toEqual(
          expect.objectContaining({
            event: {
              category: 'process',
              dataset: 'dataset_name_1',
            },
            'kibana.alert.original_event.category': 'process',
            'kibana.alert.original_event.dataset': 'dataset_name_1',
          })
        );
      });
    });
  });
};
