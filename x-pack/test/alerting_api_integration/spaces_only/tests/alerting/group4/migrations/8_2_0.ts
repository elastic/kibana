/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { RawRule } from '@kbn/alerting-plugin/server/types';
import { ALERTING_CASES_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import { FtrProviderContext } from '../../../../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function createGetTests({ getService }: FtrProviderContext) {
  const es = getService('es');
  const retry = getService('retry');
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  // Race condition between task manager running tasks and Kibana running the migrations after loading the ES Archive
  describe.skip('migrates 8.2.0 rules to the latest version approriately', () => {
    let testStart: null | number = null;
    before(async () => {
      testStart = Date.now();
      await esArchiver.load('x-pack/test/functional/es_archives/alerting/8_2_0');
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/alerting/8_2_0');
    });

    describe('rule with null snoozeEndTime value', async () => {
      it('has snoozeEndTime removed', async () => {
        const response = await es.get<{ alert: RawRule & { snoozeEndTime?: string } }>(
          {
            index: ALERTING_CASES_SAVED_OBJECT_INDEX,
            id: 'alert:bdfce750-fba0-11ec-9157-2f379249da99',
          },
          { meta: true }
        );

        expect(response.statusCode).to.equal(200);
        expect(response.body._source?.alert?.snoozeEndTime).to.be(undefined);
        expect(response.body._source?.alert?.snoozeSchedule).not.to.be(undefined);

        const snoozeSchedule = response.body._source?.alert.snoozeSchedule!;
        expect(snoozeSchedule.length).to.eql(0);
      });

      it('runs successfully after migration', async () => {
        await retry.try(async () => {
          const { body: rule } = await supertest.get(
            `/api/alerting/rule/bdfce750-fba0-11ec-9157-2f379249da99`
          );
          expect(Date.parse(rule.execution_status.last_execution_date)).to.be.greaterThan(
            testStart!
          );
          expect(rule.execution_status.status).to.be('ok');
        });
      });
    });

    describe('rules with snoozeEndTime value', async () => {
      it('has snoozeEndTime migrated to snoozeSchedule', async () => {
        const response = await es.get<{ alert: RawRule & { snoozeEndTime?: string } }>(
          {
            index: ALERTING_CASES_SAVED_OBJECT_INDEX,
            id: 'alert:402084f0-fbb8-11ec-856c-39466bd4c433',
          },
          { meta: true }
        );

        expect(response.statusCode).to.equal(200);
        expect(response.body._source?.alert?.snoozeEndTime).to.be(undefined);
        expect(response.body._source?.alert?.snoozeSchedule).not.to.be(undefined);

        const snoozeSchedule = response.body._source?.alert.snoozeSchedule!;
        expect(snoozeSchedule.length).to.eql(1);
      });

      it('runs successfully after migration', async () => {
        await retry.try(async () => {
          const { body: rule } = await supertest.get(
            `/api/alerting/rule/402084f0-fbb8-11ec-856c-39466bd4c433`
          );
          expect(Date.parse(rule.execution_status.last_execution_date)).to.be.greaterThan(
            testStart!
          );
          expect(rule.execution_status.status).to.be('ok');
        });
      });
    });
  });
}
