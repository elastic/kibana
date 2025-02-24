/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { getPostCaseRequest, postCommentAlertReq } from '../../../common/lib/mock';
import {
  deleteAllCaseItems,
  createCase,
  getTelemetry,
  runTelemetryTask,
  createComment,
  bulkCreateAttachments,
} from '../../../common/lib/api';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';
import { superUser } from '../../../common/lib/authentication/users';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');
  const retry = getService('retry');

  describe('Cases telemetry', () => {
    before(async () => {
      await deleteAllCaseItems(es);
    });

    afterEach(async () => {
      await deleteAllCaseItems(es);
    });

    it('should count cases from all spaces', async () => {
      await createCase(supertest, getPostCaseRequest(), 200, {
        user: superUser,
        space: 'space1',
      });

      await createCase(supertest, getPostCaseRequest(), 200, {
        user: superUser,
        space: 'space2',
      });

      await runTelemetryTask(supertest);

      await retry.try(async () => {
        const res = await getTelemetry(supertest);
        expect(res.stats.stack_stats.kibana.plugins.cases.cases.all.total).toBe(2);
      });
    });

    it('should return the correct total number of alerts attached to cases', async () => {
      const firstCase = await createCase(supertest, getPostCaseRequest());
      const secondCase = await createCase(supertest, getPostCaseRequest());

      const firstCaseAlerts = [...Array(3).keys()].map((num) => `test-case-1-${num}`);
      const secondCaseAlerts = [...Array(2).keys()].map((num) => `test-case-2-${num}`);

      await bulkCreateAttachments({
        supertest,
        caseId: firstCase.id,
        params: [
          {
            ...postCommentAlertReq,
            alertId: firstCaseAlerts,
            index: firstCaseAlerts,
          },
        ],
        expectedHttpCode: 200,
      });

      await bulkCreateAttachments({
        supertest,
        caseId: firstCase.id,
        params: [
          {
            ...postCommentAlertReq,
            alertId: secondCaseAlerts,
            index: secondCaseAlerts,
          },
        ],
        expectedHttpCode: 200,
      });

      await createComment({
        supertest,
        caseId: secondCase.id,
        params: { ...postCommentAlertReq, alertId: 'test-case-2-3', index: 'test-case-2-3' },
      });

      await runTelemetryTask(supertest);

      await retry.try(async () => {
        const res = await getTelemetry(supertest);
        expect(res.stats.stack_stats.kibana.plugins.cases.alerts.all.total).toBe(6);
      });
    });
  });
};
