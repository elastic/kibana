/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { getPostCaseRequest, postCommentAlertReq } from '../../../../common/lib/mock';

import { FtrProviderContext } from '../../../../common/ftr_provider_context';
import {
  createCase,
  createComment,
  deleteAllCaseItems,
  getCaseMetrics,
} from '../../../../common/lib/utils';
import { arraysToEqual } from '../../../../common/lib/validation';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');
  const esArchiver = getService('esArchiver');

  describe('case alert metrics', () => {
    describe('alert details', () => {
      let caseId: string;

      before(async () => {
        caseId = await createCaseWithAlerts();
        await esArchiver.load('x-pack/test/functional/es_archives/cases/signals/hosts_users');
      });

      after(async () => {
        await esArchiver.unload('x-pack/test/functional/es_archives/cases/signals/hosts_users');
        await deleteAllCaseItems(es);
      });

      it('returns the host metrics', async () => {
        const metrics = await getCaseMetrics({
          supertest,
          caseId,
          features: ['alerts.hosts'],
        });

        expect(metrics.alerts?.hosts?.total).to.be(3);
        expect(
          arraysToEqual(metrics.alerts?.hosts?.values, [
            { id: '7eb51035-5582-4cb8-9db2-5e71ef09aa5b', name: 'Host-abc', count: 2 },
            { id: '7eb51035-5582-4cb8-9db2-5e71ef09aa5c', name: 'Host-123', count: 2 },
            { id: '7eb51035-5582-4cb8-9db2-5e71ef09aa5d', name: 'Host-100', count: 2 },
          ])
        );
      });

      it('returns the user metrics', async () => {
        const metrics = await getCaseMetrics({
          supertest,
          caseId,
          features: ['alerts.users'],
        });

        expect(metrics.alerts?.users?.total).to.be(4);
        expect(
          arraysToEqual(metrics.alerts?.users?.values, [
            { name: 'zpxm4rqnze', count: 2 },
            { name: 'llmtcazvyl', count: 1 },
            { name: '7bgwxrbmcu', count: 1 },
            { name: 'jf9e87gsut', count: 1 },
          ])
        );
      });

      it('returns both the host and user metrics', async () => {
        const metrics = await getCaseMetrics({
          supertest,
          caseId,
          features: ['alerts.users', 'alerts.hosts'],
        });

        expect(metrics.alerts?.hosts?.total).to.be(3);
        expect(
          arraysToEqual(metrics.alerts?.hosts?.values, [
            { id: '7eb51035-5582-4cb8-9db2-5e71ef09aa5b', name: 'Host-abc', count: 2 },
            { id: '7eb51035-5582-4cb8-9db2-5e71ef09aa5c', name: 'Host-123', count: 2 },
            { id: '7eb51035-5582-4cb8-9db2-5e71ef09aa5d', name: 'Host-100', count: 2 },
          ])
        );

        expect(metrics.alerts?.users?.total).to.be(4);
        expect(
          arraysToEqual(metrics.alerts?.users?.values, [
            { name: 'zpxm4rqnze', count: 2 },
            { name: 'llmtcazvyl', count: 1 },
            { name: '7bgwxrbmcu', count: 1 },
            { name: 'jf9e87gsut', count: 1 },
          ])
        );
      });
    });

    describe('alert details invalid alerts', () => {
      let caseId: string;

      before(async () => {
        caseId = await createCaseWithAlerts();
        await esArchiver.load('x-pack/test/functional/es_archives/cases/signals/hosts_users');
      });

      after(async () => {
        await esArchiver.unload('x-pack/test/functional/es_archives/cases/signals/hosts_users');
        await deleteAllCaseItems(es);
      });

      it('ignores failures from alerts that the index does not exist', async () => {
        const theCase = await createCase(supertest, getPostCaseRequest());

        // add an alert that has an index and id do not exist
        await createComment({ supertest, caseId: theCase.id, params: postCommentAlertReq });

        const metrics = await getCaseMetrics({
          supertest,
          caseId: theCase.id,
          features: ['alerts.users', 'alerts.hosts'],
        });

        expect(metrics.alerts?.hosts).to.eql({
          total: 0,
          values: [],
        });
        expect(metrics.alerts?.users).to.eql({
          total: 0,
          values: [],
        });
      });

      it('returns the accurate metrics for the alerts that have valid indices', async () => {
        await createComment({ supertest, caseId, params: postCommentAlertReq });

        const metrics = await getCaseMetrics({
          supertest,
          caseId,
          features: ['alerts.users', 'alerts.hosts', 'alerts.count'],
        });

        expect(metrics.alerts?.hosts?.total).to.be(3);
        expect(metrics.alerts?.users?.total).to.be(4);
        expect(metrics.alerts?.count).to.be(7);
      });
    });

    describe('alert count', () => {
      afterEach(async () => {
        await deleteAllCaseItems(es);
      });

      it('counts the alerts attached to a case in two different comments', async () => {
        const theCase = await createCase(supertest, getPostCaseRequest());

        await createComment({ supertest, caseId: theCase.id, params: postCommentAlertReq });
        await createComment({
          supertest,
          caseId: theCase.id,
          params: {
            ...postCommentAlertReq,
            alertId: ['test-id-2', 'test-id-3'],
            index: ['test-index-2', 'test-index-2'],
          },
        });

        const metrics = await getCaseMetrics({
          supertest,
          caseId: theCase.id,
          features: ['alerts.count'],
        });

        expect(metrics).to.eql({
          alerts: {
            count: 3,
          },
        });
      });

      it('counts unique alert ids', async () => {
        const theCase = await createCase(supertest, getPostCaseRequest());

        await createComment({ supertest, caseId: theCase.id, params: postCommentAlertReq });
        await createComment({
          supertest,
          caseId: theCase.id,
          params: {
            ...postCommentAlertReq,
            alertId: ['test-id-2', 'test-id-2'],
            index: ['test-index-2', 'test-index-2'],
          },
        });

        const metrics = await getCaseMetrics({
          supertest,
          caseId: theCase.id,
          features: ['alerts.count'],
        });

        expect(metrics).to.eql({
          alerts: {
            count: 2,
          },
        });
      });
    });
  });

  const createCaseWithAlerts = async (): Promise<string> => {
    const theCase = await createCase(supertest, getPostCaseRequest());

    await createComment({
      supertest,
      caseId: theCase.id,
      params: {
        ...postCommentAlertReq,
        alertId: [
          '4679431ee0ba3209b6fcd60a255a696886fe0a7d18f5375de510ff5b68fa6b78',
          '1023bcfea939643c5e51fd8df53797e0ea693cee547db579ab56d96402365c1e',
          '9c827a73a3469d036ab0c53f1f9fcc746b4e80f89413e764e7753dd492e2cd2a',
          'b4df9f749c046766d6f6f39ee6a7b8dd86fca575f07c49a87d941d822c91a3a2',
          '9aae8e19dade1fa14fdb5ec3bbf9d6dab218dae609f123733b5d0f583c0590f1',
          '48bdf505176b47705da896fb58bc2070768c072778f5412f162abec2ff6ca67b',
        ],
        index: [
          '.siem-signals-default-000001',
          '.siem-signals-default-000001',
          '.siem-signals-default-000001',
          '.siem-signals-default-000001',
          '.siem-signals-default-000001',
          '.siem-signals-default-000001',
        ],
      },
    });

    return theCase.id;
  };
};
