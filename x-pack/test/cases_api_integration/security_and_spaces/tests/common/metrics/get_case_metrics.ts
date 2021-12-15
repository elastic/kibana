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

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');
  const kibanaServer = getService('kibanaServer');

  describe('case metrics', () => {
    describe('closed case from kbn archive', () => {
      const closedCaseId = 'e49ad6e0-cf9d-11eb-a603-13e7747d215z';

      before(async () => {
        await kibanaServer.importExport.load(
          'x-pack/test/functional/fixtures/kbn_archiver/cases/7.13.2/cases.json'
        );
      });

      after(async () => {
        await kibanaServer.importExport.unload(
          'x-pack/test/functional/fixtures/kbn_archiver/cases/7.13.2/cases.json'
        );
        await deleteAllCaseItems(es);
      });

      it('returns the lifespan of the case', async () => {
        const metrics = await getCaseMetrics({
          supertest,
          caseId: closedCaseId,
          features: ['lifespan'],
        });

        expect(metrics).to.eql({
          lifespan: {
            creationDate: '2021-06-17T18:57:41.682Z',
            closeDate: '2021-06-17T18:57:42.682Z',
          },
        });
      });

      it('returns an error when passing invalid features', async () => {
        const errorResponse = (await getCaseMetrics({
          supertest,
          caseId: closedCaseId,
          features: ['bananas'],
          expectedHttpCode: 400,
          // casting here because we're expecting an error with a message field
        })) as unknown as { message: string };

        expect(errorResponse.message).to.contain('invalid features');
      });
    });

    describe('alerts', () => {
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
};
