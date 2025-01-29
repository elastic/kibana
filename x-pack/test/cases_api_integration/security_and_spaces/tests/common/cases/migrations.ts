/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { CASES_URL, SECURITY_SOLUTION_OWNER } from '@kbn/cases-plugin/common/constants';
import { UserCommentAttachmentAttributes } from '@kbn/cases-plugin/common/types/domain';
import {
  CasePersistedSeverity,
  CasePersistedStatus,
} from '@kbn/cases-plugin/server/common/types/case';
import { FtrProviderContext } from '../../../../../common/ftr_provider_context';
import {
  deleteAllCaseItems,
  getCase,
  getCaseSavedObjectsFromES,
  resolveCase,
  findCases,
} from '../../../../common/lib/api';
import { superUser } from '../../../../common/lib/authentication/users';
import { findAttachments } from '../../../../common/lib/api/attachments';

// eslint-disable-next-line import/no-default-export
export default function createGetTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const es = getService('es');

  describe('migrations', () => {
    // tests upgrading a 7.10.0 saved object to the latest version
    describe('7.10.0 -> latest stack version', () => {
      before(async () => {
        await kibanaServer.importExport.load(
          'x-pack/test/functional/fixtures/kbn_archiver/cases/7.10.0/data.json'
        );
      });

      after(async () => {
        await kibanaServer.importExport.unload(
          'x-pack/test/functional/fixtures/kbn_archiver/cases/7.10.0/data.json'
        );
        await deleteAllCaseItems(es);
      });

      it('migrates cases connector', async () => {
        const { body } = await supertest
          .get(`${CASES_URL}/e1900ac0-017f-11eb-93f8-d161651bf509`)
          .set('kbn-xsrf', 'true')
          .send()
          .expect(200);

        expect(body).key('connector');
        expect(body).not.key('connector_id');
        expect(body.connector).to.eql({
          id: 'connector-1',
          name: 'none',
          type: '.none',
          fields: null,
        });
      });

      it('migrates cases settings', async () => {
        const { body } = await supertest
          .get(`${CASES_URL}/e1900ac0-017f-11eb-93f8-d161651bf509`)
          .set('kbn-xsrf', 'true')
          .send()
          .expect(200);

        expect(body).key('settings');
        expect(body.settings).to.eql({
          syncAlerts: true,
        });
      });

      it('should return the cases correctly', async () => {
        const cases = await findCases({ supertest });
        const theCase = cases.cases[0];

        const { version, ...caseWithoutVersion } = theCase;
        const { cases: _, ...caseStats } = cases;

        expect(cases.cases.length).to.eql(1);

        expect(caseStats).to.eql({
          count_closed_cases: 0,
          count_in_progress_cases: 0,
          count_open_cases: 1,
          page: 1,
          per_page: 20,
          total: 1,
        });

        expect(caseWithoutVersion).to.eql({
          assignees: [],
          category: null,
          closed_at: null,
          closed_by: null,
          comments: [],
          connector: {
            fields: null,
            id: 'connector-1',
            name: 'none',
            type: '.none',
          },
          created_at: '2020-09-28T11:43:52.158Z',
          created_by: {
            email: null,
            full_name: null,
            username: 'elastic',
          },
          customFields: [],
          description: 'This is a brand new case of a bad meanie defacing data',
          duration: null,
          external_service: null,
          id: 'e1900ac0-017f-11eb-93f8-d161651bf509',
          owner: 'securitySolution',
          settings: {
            syncAlerts: true,
          },
          severity: 'low',
          status: 'open',
          tags: ['defacement'],
          title: 'Super Bad Security Issue',
          totalAlerts: 0,
          totalComment: 1,
          updated_at: null,
          updated_by: null,
          observables: [],
        });
      });
    });

    // tests upgrading a 7.11.1 saved object to the latest version
    describe('7.11.1 -> latest stack version', () => {
      before(async () => {
        await esArchiver.load('x-pack/test/functional/es_archives/cases/migrations/7.11.1');
      });

      after(async () => {
        await esArchiver.unload('x-pack/test/functional/es_archives/cases/migrations/7.11.1');
      });

      it('adds rule info to only alert comments for 7.12', async () => {
        const caseID = '2ea28c10-7855-11eb-9ca6-83ec5acb735f';
        // user comment
        let { body } = await supertest
          .get(`${CASES_URL}/${caseID}/comments/34a20a00-7855-11eb-9ca6-83ec5acb735f`)
          .expect(200);

        expect(body).not.key('rule');
        expect(body.rule).to.eql(undefined);

        // alert comment
        ({ body } = await supertest
          .get(`${CASES_URL}/${caseID}/comments/3178f2b0-7857-11eb-9ca6-83ec5acb735f`)
          .expect(200));

        expect(body).key('rule');
        expect(body.rule).to.eql({ id: null, name: null });
      });

      it('adds category and subcategory to the ITSM connector', async () => {
        const { body } = await supertest
          .get(`${CASES_URL}/6f973440-7abd-11eb-9ca6-83ec5acb735f`)
          .set('kbn-xsrf', 'true')
          .send()
          .expect(200);

        expect(body).key('connector');
        expect(body.connector).to.eql({
          id: '444ebab0-7abd-11eb-9ca6-83ec5acb735f',
          name: 'SN',
          type: '.servicenow',
          fields: {
            impact: '2',
            severity: '2',
            urgency: '2',
            category: null,
            subcategory: null,
          },
        });
      });
    });

    describe('7.13.2', () => {
      before(async () => {
        await esArchiver.load('x-pack/test/functional/es_archives/cases/migrations/7.13.2');
      });

      after(async () => {
        await esArchiver.unload('x-pack/test/functional/es_archives/cases/migrations/7.13.2');
      });

      describe('owner field', () => {
        it('adds the owner field', async () => {
          const theCase = await getCase({
            supertest,
            caseId: 'e49ad6e0-cf9d-11eb-a603-13e7747d215c',
          });

          expect(theCase.owner).to.be(SECURITY_SOLUTION_OWNER);
        });
      });

      describe('migrating connector id to a reference', () => {
        it('preserves the connector id after migration in the API response', async () => {
          const theCase = await getCase({
            supertest,
            caseId: 'e49ad6e0-cf9d-11eb-a603-13e7747d215c',
          });

          expect(theCase.connector.id).to.be('d68508f0-cf9d-11eb-a603-13e7747d215c');
        });

        it('preserves the connector fields after migration in the API response', async () => {
          const theCase = await getCase({
            supertest,
            caseId: 'e49ad6e0-cf9d-11eb-a603-13e7747d215c',
          });

          expect(theCase.connector).to.eql({
            fields: {
              issueType: '10002',
              parent: null,
              priority: null,
            },
            id: 'd68508f0-cf9d-11eb-a603-13e7747d215c',
            name: 'Test Jira',
            type: '.jira',
          });
        });

        it('removes the connector id field in the saved object', async () => {
          const casesFromES = await getCaseSavedObjectsFromES({ es });
          expect(casesFromES.body.hits.hits[0]._source?.cases.connector).to.not.have.property('id');
        });

        it('preserves the external_service.connector_id after migration in the API response', async () => {
          const theCase = await getCase({
            supertest,
            caseId: 'e49ad6e0-cf9d-11eb-a603-13e7747d215c',
          });

          expect(theCase.external_service?.connector_id).to.be(
            'd68508f0-cf9d-11eb-a603-13e7747d215c'
          );
        });

        it('preserves the external_service fields after migration in the API response', async () => {
          const theCase = await getCase({
            supertest,
            caseId: 'e49ad6e0-cf9d-11eb-a603-13e7747d215c',
          });

          expect(theCase.external_service).to.eql({
            connector_id: 'd68508f0-cf9d-11eb-a603-13e7747d215c',
            connector_name: 'Test Jira',
            external_id: '10106',
            external_title: 'TPN-99',
            external_url: 'https://cases-testing.atlassian.net/browse/TPN-99',
            pushed_at: '2021-06-17T18:57:45.524Z',
            pushed_by: {
              email: null,
              full_name: 'j@j.com',
              username: '711621466',
            },
          });
        });

        it('removes the connector_id field in the saved object', async () => {
          const casesFromES = await getCaseSavedObjectsFromES({ es });
          expect(
            casesFromES.body.hits.hits[0]._source?.cases.external_service
          ).to.not.have.property('id');
        });
      });
    });

    describe('7.16.0', () => {
      before(async () => {
        await esArchiver.load('x-pack/test/functional/es_archives/cases/migrations/7.13.2');
      });

      after(async () => {
        await esArchiver.unload('x-pack/test/functional/es_archives/cases/migrations/7.13.2');
      });

      describe('resolve', () => {
        it('should return exactMatch outcome', async () => {
          const { outcome } = await resolveCase({
            supertest,
            caseId: 'e49ad6e0-cf9d-11eb-a603-13e7747d215c',
          });

          expect(outcome).to.be('exactMatch');
        });

        it('should preserve the same case info', async () => {
          const { case: theCase } = await resolveCase({
            supertest,
            caseId: 'e49ad6e0-cf9d-11eb-a603-13e7747d215c',
          });

          expect(theCase.title).to.be('A case');
          expect(theCase.description).to.be('asdf');
          expect(theCase.owner).to.be(SECURITY_SOLUTION_OWNER);
        });

        it('should preserve the same connector', async () => {
          const { case: theCase } = await resolveCase({
            supertest,
            caseId: 'e49ad6e0-cf9d-11eb-a603-13e7747d215c',
          });

          expect(theCase.connector).to.eql({
            fields: {
              issueType: '10002',
              parent: null,
              priority: null,
            },
            id: 'd68508f0-cf9d-11eb-a603-13e7747d215c',
            name: 'Test Jira',
            type: '.jira',
          });
        });

        it('should preserve the same external service', async () => {
          const { case: theCase } = await resolveCase({
            supertest,
            caseId: 'e49ad6e0-cf9d-11eb-a603-13e7747d215c',
          });

          expect(theCase.external_service).to.eql({
            connector_id: 'd68508f0-cf9d-11eb-a603-13e7747d215c',
            connector_name: 'Test Jira',
            external_id: '10106',
            external_title: 'TPN-99',
            external_url: 'https://cases-testing.atlassian.net/browse/TPN-99',
            pushed_at: '2021-06-17T18:57:45.524Z',
            pushed_by: {
              email: null,
              full_name: 'j@j.com',
              username: '711621466',
            },
          });
        });
      });
    });

    describe('8.0 id migration', () => {
      describe('awesome space', () => {
        before(async () => {
          await esArchiver.load('x-pack/test/functional/es_archives/cases/migrations/7.16.0_space');
        });

        after(async () => {
          await esArchiver.unload(
            'x-pack/test/functional/es_archives/cases/migrations/7.16.0_space'
          );
        });

        describe('resolve', () => {
          const auth = { user: superUser, space: 'awesome-space' };

          it('should return aliasMatch outcome', async () => {
            const { outcome } = await resolveCase({
              supertest,
              caseId: 'a97a13b0-22f3-11ec-9f3b-fbc97859d7ed',
              auth,
            });

            expect(outcome).to.be('aliasMatch');
          });

          it('should preserve the same case info', async () => {
            const { case: theCase } = await resolveCase({
              supertest,
              caseId: 'a97a13b0-22f3-11ec-9f3b-fbc97859d7ed',
              auth,
            });

            expect(theCase.title).to.be('Case name');
            expect(theCase.description).to.be('a description');
            expect(theCase.owner).to.be(SECURITY_SOLUTION_OWNER);
          });

          it('should preserve the comment', async () => {
            const { comments } = await findAttachments({
              supertest,
              caseId: 'f3a43e72-4b37-55b0-bc51-eceb8616a5ce',
              auth,
            });

            const comment = comments[0] as UserCommentAttachmentAttributes;

            expect(comment.comment).to.be('a comment');
            expect(comment.owner).to.be(SECURITY_SOLUTION_OWNER);
          });
        });
      });
    });

    describe('8.1.0 removing type', () => {
      before(async () => {
        await kibanaServer.importExport.load(
          'x-pack/test/functional/fixtures/kbn_archiver/cases/7.13.2/case_and_collection.json'
        );
      });

      after(async () => {
        await kibanaServer.importExport.unload(
          'x-pack/test/functional/fixtures/kbn_archiver/cases/7.13.2/case_and_collection.json'
        );
        await deleteAllCaseItems(es);
      });

      it('removes the type field from an individual case', async () => {
        const caseInfo = await getCase({
          supertest,
          caseId: 'e49ad6e0-cf9d-11eb-a603-13e7747d215c',
        });

        expect(caseInfo).not.to.have.property('type');
      });

      it('removes the type field from a collection case', async () => {
        const caseInfo = await getCase({
          supertest,
          caseId: 'e49ad6e0-cf9d-11eb-a603-13e7747d215z',
        });

        expect(caseInfo).not.to.have.property('type');
      });
    });

    describe('8.3.0', () => {
      before(async () => {
        await kibanaServer.importExport.load(
          'x-pack/test/functional/fixtures/kbn_archiver/cases/8.2.0/cases_duration.json'
        );
      });

      after(async () => {
        await kibanaServer.importExport.unload(
          'x-pack/test/functional/fixtures/kbn_archiver/cases/8.2.0/cases_duration.json'
        );
        await deleteAllCaseItems(es);
      });

      describe('adding duration', () => {
        it('calculates the correct duration for closed cases', async () => {
          const caseInfo = await getCase({
            supertest,
            caseId: '4537b380-a512-11ec-b92f-859b9e89e434',
          });

          expect(caseInfo).to.have.property('duration');
          expect(caseInfo.duration).to.be(120);
        });

        it('sets the duration to null to open cases', async () => {
          const caseInfo = await getCase({
            supertest,
            caseId: '7537b580-a512-11ec-b94f-85979e89e434',
          });

          expect(caseInfo).to.have.property('duration');
          expect(caseInfo.duration).to.be(null);
        });

        it('sets the duration to null to in-progress cases', async () => {
          const caseInfo = await getCase({
            supertest,
            caseId: '1537b580-a512-11ec-b94f-85979e89e434',
          });

          expect(caseInfo).to.have.property('duration');
          expect(caseInfo.duration).to.be(null);
        });
      });

      describe('add severity', () => {
        it('adds the severity field for existing documents', async () => {
          const caseInfo = await getCase({
            supertest,
            caseId: '4537b380-a512-11ec-b92f-859b9e89e434',
          });

          expect(caseInfo).to.have.property('severity');
          expect(caseInfo.severity).to.be('low');
        });
      });
    });

    describe('8.5.0', () => {
      before(async () => {
        await kibanaServer.importExport.load(
          'x-pack/test/functional/fixtures/kbn_archiver/cases/8.2.0/cases_duration.json'
        );
        await kibanaServer.importExport.load(
          'x-pack/test/functional/fixtures/kbn_archiver/cases/8.5.0/cases_assignees.json'
        );
      });

      after(async () => {
        await kibanaServer.importExport.unload(
          'x-pack/test/functional/fixtures/kbn_archiver/cases/8.2.0/cases_duration.json'
        );
        await kibanaServer.importExport.unload(
          'x-pack/test/functional/fixtures/kbn_archiver/cases/8.5.0/cases_assignees.json'
        );
        await deleteAllCaseItems(es);
      });

      describe('assignees', () => {
        it('adds the assignees field for existing documents', async () => {
          const caseInfo = await getCase({
            supertest,
            // This case exists in the 8.2.0 cases_duration.json file and does not contain an assignees field
            caseId: '4537b380-a512-11ec-b92f-859b9e89e434',
          });

          expect(caseInfo).to.have.property('assignees');
          expect(caseInfo.assignees).to.eql([]);
        });

        it('does not overwrite the assignees field if it already exists', async () => {
          const caseInfo = await getCase({
            supertest,
            // This case exists in the 8.5.0 cases_assignees.json file and does contain an assignees field
            caseId: '063d5820-1284-11ed-81af-63a2bdfb2bf9',
          });

          expect(caseInfo).to.have.property('assignees');
          expect(caseInfo.assignees).to.eql([
            {
              uid: 'abc',
            },
          ]);
        });
      });
    });

    describe('8.7.0', () => {
      before(async () => {
        await kibanaServer.importExport.load(
          'x-pack/test/functional/fixtures/kbn_archiver/cases/8.5.0/cases_severity_and_status.json'
        );
      });

      after(async () => {
        await kibanaServer.importExport.unload(
          'x-pack/test/functional/fixtures/kbn_archiver/cases/8.5.0/cases_severity_and_status.json'
        );
        await deleteAllCaseItems(es);
      });

      describe('severity', () => {
        it('severity keyword values are converted to matching short', async () => {
          const expectedSeverityValues: Record<string, CasePersistedSeverity> = {
            'cases:063d5820-1284-11ed-81af-63a2bdfb2bf6': CasePersistedSeverity.LOW,
            'cases:063d5820-1284-11ed-81af-63a2bdfb2bf7': CasePersistedSeverity.MEDIUM,
            'cases:063d5820-1284-11ed-81af-63a2bdfb2bf8': CasePersistedSeverity.HIGH,
            'cases:063d5820-1284-11ed-81af-63a2bdfb2bf9': CasePersistedSeverity.CRITICAL,
          };

          const casesFromES = await getCaseSavedObjectsFromES({ es });

          for (const hit of casesFromES.body.hits.hits) {
            const caseID = hit._id!;
            expect(expectedSeverityValues[caseID]).not.to.be(undefined);
            expect(hit._source?.cases.severity).to.eql(expectedSeverityValues[caseID]);
          }
        });
      });

      describe('status', () => {
        it('status keyword values are converted to matching short', async () => {
          const expectedStatusValues: Record<string, CasePersistedStatus> = {
            'cases:063d5820-1284-11ed-81af-63a2bdfb2bf6': CasePersistedStatus.OPEN,
            'cases:063d5820-1284-11ed-81af-63a2bdfb2bf7': CasePersistedStatus.OPEN,
            'cases:063d5820-1284-11ed-81af-63a2bdfb2bf8': CasePersistedStatus.IN_PROGRESS,
            'cases:063d5820-1284-11ed-81af-63a2bdfb2bf9': CasePersistedStatus.CLOSED,
          };

          const casesFromES = await getCaseSavedObjectsFromES({ es });

          for (const hit of casesFromES.body.hits.hits) {
            const caseID = hit._id!;
            expect(expectedStatusValues[caseID]).not.to.be(undefined);
            expect(hit._source?.cases.status).to.eql(expectedStatusValues[caseID]);
          }
        });
      });

      describe('total_alerts', () => {
        it('total_alerts field has default value -1', async () => {
          const casesFromES = await getCaseSavedObjectsFromES({ es });
          for (const hit of casesFromES.body.hits.hits) {
            expect(hit._source?.cases.total_alerts).to.eql(-1);
          }
        });
      });

      describe('total_comments', () => {
        it('total_comments field has default value -1', async () => {
          const casesFromES = await getCaseSavedObjectsFromES({ es });
          for (const hit of casesFromES.body.hits.hits) {
            expect(hit._source?.cases.total_comments).to.eql(-1);
          }
        });
      });
    });
  });
}
