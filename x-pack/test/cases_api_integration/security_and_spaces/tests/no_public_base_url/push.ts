/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import {
  postCommentUserReq,
  postCommentAlertReq,
  postCommentAlertMultipleIdsReq,
  postCommentActionsReq,
  postCommentActionsReleaseReq,
  postExternalReferenceESReq,
  persistableStateAttachment,
} from '../../../common/lib/mock';
import { FtrProviderContext } from '../../../common/ftr_provider_context';
import { ObjectRemover as ActionsRemover } from '../../../../alerting_api_integration/common/lib';

import {
  pushCase,
  deleteAllCaseItems,
  createCaseWithConnector,
  getRecordingServiceNowSimulatorServer,
  bulkCreateAttachments,
} from '../../../common/lib/utils';
import { RecordingServiceNowSimulator } from '../../../../alerting_api_integration/common/plugins/actions_simulators/server/servicenow_simulation';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');

  describe('push_case', () => {
    describe('incident recorder server', () => {
      const actionsRemover = new ActionsRemover(supertest);
      let serviceNowSimulatorURL: string = '';
      let serviceNowServer: RecordingServiceNowSimulator;

      beforeEach(async () => {
        const { server, url } = await getRecordingServiceNowSimulatorServer();
        serviceNowServer = server;
        serviceNowSimulatorURL = url;
      });

      afterEach(async () => {
        await deleteAllCaseItems(es);
        await actionsRemover.removeAll();
        serviceNowServer.close();
      });

      it('should push correctly without a publicBaseUrl', async () => {
        const { postedCase, connector } = await createCaseWithConnector({
          supertest,
          serviceNowSimulatorURL,
          actionsRemover,
        });

        await pushCase({
          supertest,
          caseId: postedCase.id,
          connectorId: connector.id,
        });

        expect(serviceNowServer.incident).eql({
          short_description: postedCase.title,
          description: `${postedCase.description}\n\nAdded by elastic.`,
          severity: '2',
          urgency: '2',
          impact: '2',
          category: 'software',
          subcategory: 'os',
          correlation_id: postedCase.id,
          correlation_display: 'Elastic Case',
          caller_id: 'admin',
          opened_by: 'admin',
        });
      });

      it('should format the comments correctly', async () => {
        const { postedCase, connector } = await createCaseWithConnector({
          supertest,
          serviceNowSimulatorURL,
          actionsRemover,
        });

        const patchedCase = await bulkCreateAttachments({
          supertest,
          caseId: postedCase.id,
          params: [
            postCommentUserReq,
            postCommentAlertReq,
            postCommentAlertMultipleIdsReq,
            postCommentActionsReq,
            postCommentActionsReleaseReq,
            postExternalReferenceESReq,
            persistableStateAttachment,
          ],
        });

        await pushCase({
          supertest,
          caseId: patchedCase.id,
          connectorId: connector.id,
        });

        /**
         * If the request contains the work_notes property then
         * it is a create comment request
         */
        const allCommentRequests = serviceNowServer.allRequestData.filter((request) =>
          Boolean(request.work_notes)
        );

        /**
         * For each of these comments a request is made:
         * postCommentUserReq, postCommentActionsReq, postCommentActionsReleaseReq, and a comment with the
         * total alerts attach to a case. All other type of comments should be filtered. Specifically,
         * postCommentAlertReq, postCommentAlertMultipleIdsReq, postExternalReferenceESReq, and persistableStateAttachment
         */
        expect(allCommentRequests.length).be(4);

        // User comment: postCommentUserReq
        expect(allCommentRequests[0].work_notes).eql('This is a cool comment\n\nAdded by elastic.');

        // Isolate host comment: postCommentActionsReq
        expect(allCommentRequests[1].work_notes).eql(
          'Isolated host host-name with comment: comment text\n\nAdded by elastic.'
        );

        // Unisolate host comment: postCommentActionsReleaseReq
        expect(allCommentRequests[2].work_notes).eql(
          'Released host host-name with comment: comment text\n\nAdded by elastic.'
        );

        // Total alerts
        expect(allCommentRequests[3].work_notes).eql('Elastic Alerts attached to the case: 3');
      });
    });
  });
};
