/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { ObjectRemover } from '@kbn/test-suites-xpack-platform/functional_with_es_ssl/lib/object_remover';
import {
  createAlert as createRule,
  disableAlert as disableRule,
  muteAlert as muteRule,
} from '@kbn/test-suites-xpack-platform/functional_with_es_ssl/lib/alert_api_actions';
import { generateUniqueKey } from '@kbn/test-suites-xpack-platform/functional_with_es_ssl/lib/get_test_data';
import { FtrProviderContext } from '../../../../ftr_provider_context';
import { asyncForEach } from '../../helpers';

export default ({ getService }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertest');
  const objectRemover = new ObjectRemover(supertest);

  describe('Observability rules', function () {
    this.tags('includeFirefox');

    const observability = getService('observability');

    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/observability/alerts');
      const setup = async () => {
        await observability.alerts.common.setKibanaTimeZoneToUTC();
        await observability.alerts.common.navigateWithoutFilter();
      };
      await setup();
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/observability/alerts');
    });

    describe('Stat counters', () => {
      beforeEach(async () => {
        const uniqueKey = generateUniqueKey();

        const names = ['a', 'b', 'c', 'd', 'e', 'f'];
        const ids: string[] = [];

        for await (const name of names) {
          const rule = await createRule({
            supertest,
            objectRemover,
            overwrites: {
              rule_type_id: 'apm.anomaly',
              name,
              consumer: 'alerts',
              tags: [uniqueKey],
              params: {
                windowSize: 30,
                windowUnit: 'm',
                anomalySeverityType: 'critical',
                anomalyDetectorTypes: ['txLatency', 'txThroughput', 'txFailureRate'],
                environment: 'ENVIRONMENT_ALL',
              },
              schedule: {
                interval: '1m',
              },
              actions: [],
              alert_delay: {
                active: 1,
              },
            },
          });
          ids.push(rule.id);
        }

        await disableRule({ supertest, alertId: ids[1] });
        await muteRule({ supertest, alertId: ids[5] });

        await observability.alerts.common.navigateToTimeWithData();
      });

      afterEach(async () => {
        await objectRemover.removeAll();
      });

      it('Exist and display expected values', async () => {
        const subjToValueMap: { [key: string]: number } = {
          statRuleCount: 6,
          statDisabled: 1,
          statMuted: 1,
          statErrors: 0,
        };
        await asyncForEach(Object.keys(subjToValueMap), async (subject: string) => {
          const value = await observability.alerts.common.getRuleStatValue(subject);
          expect(value).to.be(subjToValueMap[subject]);
        });
      });
    });
  });
};
