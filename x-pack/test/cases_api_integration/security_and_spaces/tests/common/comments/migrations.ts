/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../../common/ftr_provider_context';
import {
  CASES_URL,
  SECURITY_SOLUTION_OWNER,
} from '../../../../../../plugins/cases/common/constants';
import { getComment, deleteAllCaseItems } from '../../../../common/lib/utils';
import {
  getAlertAttachmentSavedObjectFromES,
  getUserAttachmentSavedObjectFromES,
} from '../../../../common/lib/elasticsearch';

// eslint-disable-next-line import/no-default-export
export default function createGetTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const es = getService('es');

  describe('migrations', () => {
    describe('7.10.0 es archive', () => {
      before(async () => {
        await esArchiver.load('x-pack/test/functional/es_archives/cases/migrations/7.10.0');
      });

      after(async () => {
        await esArchiver.unload('x-pack/test/functional/es_archives/cases/migrations/7.10.0');
      });

      it('7.11.0 adds comment type user', async () => {
        const { body: comment } = await supertest
          .get(
            `${CASES_URL}/e1900ac0-017f-11eb-93f8-d161651bf509/comments/da677740-1ac7-11eb-b5a3-25ee88122510`
          )
          .set('kbn-xsrf', 'true')
          .send();

        expect(comment.type).to.eql('user');
      });
    });

    describe('7.13.2 es archive', () => {
      before(async () => {
        await esArchiver.load('x-pack/test/functional/es_archives/cases/migrations/7.13.2');
      });

      after(async () => {
        await esArchiver.unload('x-pack/test/functional/es_archives/cases/migrations/7.13.2');
      });

      it('7.14.0 adds the owner field', async () => {
        const comment = await getComment({
          supertest,
          caseId: 'e49ad6e0-cf9d-11eb-a603-13e7747d215c',
          commentId: 'ee59cdd0-cf9d-11eb-a603-13e7747d215c',
        });

        expect(comment.owner).to.be(SECURITY_SOLUTION_OWNER);
      });
    });

    describe('7.13.2 alerts kbn archive', () => {
      before(async () => {
        await kibanaServer.importExport.load(
          'x-pack/test/functional/fixtures/kbn_archiver/cases/7.13.2/alerts.json'
        );
      });

      after(async () => {
        await kibanaServer.importExport.unload(
          'x-pack/test/functional/fixtures/kbn_archiver/cases/7.13.2/alerts.json'
        );

        await deleteAllCaseItems(es);
      });

      describe('8.1.0 migration', () => {
        it('converts the alert with alertId and index as strings to an object format', async () => {
          const alert = (
            await getAlertAttachmentSavedObjectFromES({
              es,
              id: 'cases-comments:ee59cdd0-cf9d-11eb-a603-13e7747d215c',
            })
          ).body._source?.['cases-comments'];

          expect(alert?.alerts).to.eql([
            {
              id: '123',
              index: '123',
              rule: {
                id: 'id',
                name: 'name',
              },
            },
          ]);

          expect(alert).not.to.have.property('alertId');
          expect(alert).not.to.have.property('index');
          expect(alert).not.to.have.property('rule');
        });

        it('converts the alert with alertId and index as string arrays to an object format', async () => {
          const alert = (
            await getAlertAttachmentSavedObjectFromES({
              es,
              id: 'cases-comments:ae59cdd0-cf9d-11eb-a603-13e7747d215c',
            })
          ).body._source?.['cases-comments'];

          expect(alert?.alerts).to.eql([
            {
              id: '123',
              index: '123',
              rule: {
                id: null,
                name: null,
              },
            },
            {
              id: '456',
              index: '456',
              rule: {
                id: null,
                name: null,
              },
            },
          ]);

          expect(alert).not.to.have.property('alertId');
          expect(alert).not.to.have.property('index');
          expect(alert).not.to.have.property('rule');
        });

        it('does not migration an attachment that is not an alert', async () => {
          const comment = (
            await getUserAttachmentSavedObjectFromES({
              es,
              id: 'cases-comments:be59cdd0-cf9d-11eb-a603-13e7747d215c',
            })
          ).body._source?.['cases-comments'];

          expect(comment?.comment).to.eql('A comment');
          expect(comment).not.to.have.property('alerts');
        });

        it('converts an alert attachment that is malformed with more alertIds than indices', async () => {
          const alert = (
            await getAlertAttachmentSavedObjectFromES({
              es,
              id: 'cases-comments:ce59cdd0-cf9d-11eb-a603-13e7747d215c',
            })
          ).body._source?.['cases-comments'];

          expect(alert?.alerts).to.eql([
            {
              id: '123',
              index: '123',
              rule: {
                id: null,
                name: null,
              },
            },
          ]);

          expect(alert).not.to.have.property('alertId');
          expect(alert).not.to.have.property('index');
          expect(alert).not.to.have.property('rule');
        });

        it('converts an alert attachment that is malformed with more indices than alertIds', async () => {
          const alert = (
            await getAlertAttachmentSavedObjectFromES({
              es,
              id: 'cases-comments:de59cdd0-cf9d-11eb-a603-13e7747d215c',
            })
          ).body._source?.['cases-comments'];

          expect(alert?.alerts).to.eql([
            {
              id: '123',
              index: '123',
              rule: {
                id: null,
                name: null,
              },
            },
          ]);

          expect(alert).not.to.have.property('alertId');
          expect(alert).not.to.have.property('index');
          expect(alert).not.to.have.property('rule');
        });
      });
    });
  });
}
