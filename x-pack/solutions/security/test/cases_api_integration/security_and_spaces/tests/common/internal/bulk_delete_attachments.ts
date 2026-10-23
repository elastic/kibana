/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { ALERT_CASE_IDS } from '@kbn/rule-data-utils';
import { AttachmentType } from '@kbn/cases-plugin/common/types/domain';
import { SECURITY_ALERT_ATTACHMENT_TYPE } from '@kbn/cases-plugin/common/constants';
import type { Alerts } from '@kbn/test-suites-xpack-platform/cases_api_integration/common/lib/alerts';
import type { FtrProviderContext } from '@kbn/test-suites-xpack-platform/cases_api_integration/common/ftr_provider_context';
import { getPostCaseRequest } from '@kbn/test-suites-xpack-platform/cases_api_integration/common/lib/mock';
import {
  bulkDeleteAttachmentReferences,
  createCase,
  createComment,
  deleteAllCaseItems,
  getAllComments,
} from '@kbn/test-suites-xpack-platform/cases_api_integration/common/lib/api';
import {
  createAlertsIndex,
  deleteAllAlerts,
  deleteAllRules,
} from '@kbn/detections-response-ftr-services';
import {
  createSecuritySolutionAlerts,
  getSecuritySolutionAlerts,
} from '../../../../common/lib/alerts';

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');
  const esArchiver = getService('esArchiver');
  const log = getService('log');

  describe('bulk_delete_attachments', () => {
    let alerts: Alerts = [];

    const getCaseIdsByAlert = async () => {
      await es.indices.refresh({ index: alerts.map((alert) => alert._index) });
      const updatedAlerts = await getSecuritySolutionAlerts(
        supertest,
        alerts.map((alert) => alert._id)
      );

      return new Map(
        updatedAlerts.hits.hits.map((alert) => [alert._id, alert._source?.[ALERT_CASE_IDS]])
      );
    };

    beforeEach(async () => {
      await esArchiver.load('x-pack/platform/test/fixtures/es_archives/auditbeat/hosts');
      await createAlertsIndex(supertest, log);
      const signals = await createSecuritySolutionAlerts(supertest, log, 2);
      alerts = [signals.hits.hits[0] as Alerts[number], signals.hits.hits[1] as Alerts[number]];
    });

    afterEach(async () => {
      await deleteAllCaseItems(es);
      await deleteAllAlerts(supertest, log, es);
      await deleteAllRules(supertest, log);
      await esArchiver.unload('x-pack/platform/test/fixtures/es_archives/auditbeat/hosts');
    });

    it('unlinks only the removed alert of a grouped attachment', async () => {
      const [removedAlert, keptAlert] = alerts;
      const postedCase = await createCase(
        supertest,
        getPostCaseRequest({ owner: 'securitySolutionFixture' })
      );
      await createComment({
        supertest,
        caseId: postedCase.id,
        params: {
          type: AttachmentType.alert,
          alertId: [removedAlert._id, keptAlert._id],
          index: [removedAlert._index, keptAlert._index],
          rule: { id: 'id', name: 'name' },
          owner: 'securitySolutionFixture',
        },
      });

      await bulkDeleteAttachmentReferences({
        supertest,
        caseId: postedCase.id,
        type: SECURITY_ALERT_ATTACHMENT_TYPE,
        attachmentIds: [removedAlert._id],
      });

      const caseIdsByAlert = await getCaseIdsByAlert();
      expect(caseIdsByAlert.get(removedAlert._id)).to.eql([]);
      expect(caseIdsByAlert.get(keptAlert._id)).to.eql([postedCase.id]);

      const [attachment] = await getAllComments({ supertest, caseId: postedCase.id });
      expect('alertId' in attachment ? attachment.alertId : undefined).to.eql([keptAlert._id]);
    });
  });
};
