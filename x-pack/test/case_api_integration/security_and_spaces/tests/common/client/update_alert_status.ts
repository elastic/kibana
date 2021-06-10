/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';

import { postCaseReq } from '../../../../common/lib/mock';
import {
  createCase,
  createComment,
  deleteAllCaseItems,
  getSignalsWithES,
} from '../../../../common/lib/utils';
import { CasesResponse, CaseStatuses, CommentType } from '../../../../../../plugins/cases/common';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');
  const esArchiver = getService('esArchiver');

  describe('update_alert_status', () => {
    const defaultSignalsIndex = '.siem-signals-default-000001';

    beforeEach(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/cases/signals/default');
    });
    afterEach(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/cases/signals/default');
      await deleteAllCaseItems(es);
    });

    it('should update the status of multiple alerts attached to multiple cases using the cases client', async () => {
      const signalID = '5f2b9ec41f8febb1c06b5d1045aeabb9874733b7617e88a370510f2fb3a41a5d';
      const signalID2 = '4d0f4b1533e46b66b43bdd0330d23f39f2cf42a7253153270e38d30cce9ff0c6';

      // does NOT updates alert status when adding comments and syncAlerts=false
      const individualCase1 = await createCase(supertest, {
        ...postCaseReq,
        settings: {
          syncAlerts: false,
        },
      });

      const updatedInd1WithComment = await createComment({
        supertest,
        caseId: individualCase1.id,
        params: {
          alertId: signalID,
          index: defaultSignalsIndex,
          rule: { id: 'test-rule-id', name: 'test-index-id' },
          type: CommentType.alert,
          owner: 'securitySolutionFixture',
        },
      });

      const individualCase2 = await createCase(supertest, {
        ...postCaseReq,
        settings: {
          syncAlerts: false,
        },
      });

      const updatedInd2WithComment = await createComment({
        supertest,
        caseId: individualCase2.id,
        params: {
          alertId: signalID2,
          index: defaultSignalsIndex,
          rule: { id: 'test-rule-id', name: 'test-index-id' },
          type: CommentType.alert,
          owner: 'securitySolutionFixture',
        },
      });

      await es.indices.refresh({ index: defaultSignalsIndex });

      let signals = await getSignalsWithES({
        es,
        indices: defaultSignalsIndex,
        ids: [signalID, signalID2],
      });

      // There should be no change in their status since syncing is disabled
      expect(signals.get(defaultSignalsIndex)?.get(signalID)?._source?.signal.status).to.be(
        CaseStatuses.open
      );
      expect(signals.get(defaultSignalsIndex)?.get(signalID2)?._source?.signal.status).to.be(
        CaseStatuses.open
      );

      // does NOT updates alert status when the status is updated and syncAlerts=false
      // this performs the cases update through the test plugin that leverages the cases client instead
      // of going through RESTful API of the cases plugin
      const { body: updatedIndWithStatus }: { body: CasesResponse } = await supertest
        .patch('/api/cases_user/cases')
        .set('kbn-xsrf', 'true')
        .send({
          cases: [
            {
              id: updatedInd1WithComment.id,
              version: updatedInd1WithComment.version,
              status: CaseStatuses.closed,
            },
            {
              id: updatedInd2WithComment.id,
              version: updatedInd2WithComment.version,
              status: CaseStatuses['in-progress'],
            },
          ],
        })
        .expect(200);

      await es.indices.refresh({ index: defaultSignalsIndex });

      signals = await getSignalsWithES({
        es,
        indices: defaultSignalsIndex,
        ids: [signalID, signalID2],
      });

      // There should still be no change in their status since syncing is disabled
      expect(signals.get(defaultSignalsIndex)?.get(signalID)?._source?.signal.status).to.be(
        CaseStatuses.open
      );
      expect(signals.get(defaultSignalsIndex)?.get(signalID2)?._source?.signal.status).to.be(
        CaseStatuses.open
      );

      // it updates alert status when syncAlerts is turned on
      // turn on the sync settings
      // this performs the cases update through the test plugin that leverages the cases client instead
      // of going through RESTful API of the cases plugin
      await supertest
        .patch('/api/cases_user/cases')
        .set('kbn-xsrf', 'true')
        .send({
          cases: updatedIndWithStatus.map((caseInfo) => ({
            id: caseInfo.id,
            version: caseInfo.version,
            settings: { syncAlerts: true },
          })),
        })
        .expect(200);

      await es.indices.refresh({ index: defaultSignalsIndex });

      signals = await getSignalsWithES({
        es,
        indices: defaultSignalsIndex,
        ids: [signalID, signalID2],
      });

      // alerts should be updated now that the
      expect(signals.get(defaultSignalsIndex)?.get(signalID)?._source?.signal.status).to.be(
        CaseStatuses.closed
      );
      expect(signals.get(defaultSignalsIndex)?.get(signalID2)?._source?.signal.status).to.be(
        CaseStatuses['in-progress']
      );
    });
  });
};
