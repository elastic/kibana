/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { ObjectRemover } from '../../../../functional_with_es_ssl/lib/object_remover';
import {
  createAlert as createRule,
  disableAlert as disableRule,
  muteAlert as muteRule,
} from '../../../../functional_with_es_ssl/lib/alert_api_actions';
import { generateUniqueKey } from '../../../../functional_with_es_ssl/lib/get_test_data';
import { asyncForEach } from '../helpers';

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
        await observability.alerts.common.navigateToTimeWithData();
      };
      await setup();
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/observability/alerts');
    });

    describe('With no data', () => {
      it('Shows the no data screen', async () => {
        await observability.alerts.common.getNoDataPageOrFail();
      });
    });

    // FLAKY: https://github.com/elastic/kibana/issues/124681
    describe.skip('Stat counters', () => {
      beforeEach(async () => {
        const uniqueKey = generateUniqueKey();

        const ruleToDisable = await createRule({
          supertest,
          objectRemover,
          overwrites: { name: 'b', tags: [uniqueKey] },
        });
        await createRule({
          supertest,
          objectRemover,
          overwrites: { name: 'c', tags: [uniqueKey] },
        });
        await createRule({
          supertest,
          objectRemover,
          overwrites: { name: 'a', tags: [uniqueKey] },
        });
        await createRule({
          supertest,
          objectRemover,
          overwrites: { name: 'd', tags: [uniqueKey] },
        });
        await createRule({
          supertest,
          objectRemover,
          overwrites: { name: 'e', tags: [uniqueKey] },
        });
        const ruleToMute = await createRule({
          supertest,
          objectRemover,
          overwrites: { name: 'f', tags: [uniqueKey] },
        });

        await disableRule({ supertest, alertId: ruleToDisable.id });
        await muteRule({ supertest, alertId: ruleToMute.id });

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
