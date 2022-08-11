/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { CASES_URL, SECURITY_SOLUTION_OWNER } from '@kbn/cases-plugin/common/constants';
import { CommentResponseAlertsType } from '@kbn/cases-plugin/common/api';
import { FtrProviderContext } from '../../../../../common/ftr_provider_context';
import { deleteAllCaseItems, getComment } from '../../../../common/lib/utils';

// eslint-disable-next-line import/no-default-export
export default function createGetTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const es = getService('es');
  const kibanaServer = getService('kibanaServer');

  describe('migrations', () => {
    describe('7.11.0', () => {
      before(async () => {
        await esArchiver.load('x-pack/test/functional/es_archives/cases/migrations/7.10.0');
      });

      after(async () => {
        await esArchiver.unload('x-pack/test/functional/es_archives/cases/migrations/7.10.0');
      });

      it('7.11.0 migrates cases comments', async () => {
        const { body: comment } = await supertest
          .get(
            `${CASES_URL}/e1900ac0-017f-11eb-93f8-d161651bf509/comments/da677740-1ac7-11eb-b5a3-25ee88122510`
          )
          .set('kbn-xsrf', 'true')
          .send();

        expect(comment.type).to.eql('user');
      });
    });

    describe('7.13.2', () => {
      before(async () => {
        await esArchiver.load('x-pack/test/functional/es_archives/cases/migrations/7.13.2');
      });

      after(async () => {
        await esArchiver.unload('x-pack/test/functional/es_archives/cases/migrations/7.13.2');
      });

      it('adds the owner field', async () => {
        const comment = await getComment({
          supertest,
          caseId: 'e49ad6e0-cf9d-11eb-a603-13e7747d215c',
          commentId: 'ee59cdd0-cf9d-11eb-a603-13e7747d215c',
        });

        expect(comment.owner).to.be(SECURITY_SOLUTION_OWNER);
      });
    });

    describe('8.0.0', () => {
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

      it('removes the rule information from alert attachments', async () => {
        const comment = (await getComment({
          supertest,
          caseId: 'e49ad6e0-cf9d-11eb-a603-13e7747d215c',
          commentId: 'ee59cdd0-cf9d-11eb-a603-13e7747d215c',
        })) as CommentResponseAlertsType;

        expect(comment).to.have.property('rule');
        expect(comment.rule.id).to.be(null);
        expect(comment.rule.name).to.be(null);
      });

      it('does not modify non-alert attachments', async () => {
        const comment = (await getComment({
          supertest,
          caseId: 'e49ad6e0-cf9d-11eb-a603-13e7747d215c',
          commentId: 'ae59cdd0-cf9d-11eb-a603-13e7747d215c',
        })) as CommentResponseAlertsType;

        expect(comment).to.not.have.property('rule');
      });
    });

    describe('8.1.0', () => {
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

      it('removes the associationType field from an alert comment', async () => {
        const comment = (await getComment({
          supertest,
          caseId: 'e49ad6e0-cf9d-11eb-a603-13e7747d215c',
          commentId: 'ee59cdd0-cf9d-11eb-a603-13e7747d215c',
        })) as CommentResponseAlertsType;

        expect(comment).not.to.have.property('associationType');
      });

      it('removes the associationType field from a user comment', async () => {
        const comment = (await getComment({
          supertest,
          caseId: 'e49ad6e0-cf9d-11eb-a603-13e7747d215c',
          commentId: 'ae59cdd0-cf9d-11eb-a603-13e7747d215c',
        })) as CommentResponseAlertsType;

        expect(comment).not.to.have.property('associationType');
      });
    });
  });
}
