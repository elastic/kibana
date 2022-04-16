/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { CASES_URL, SECURITY_SOLUTION_OWNER } from '@kbn/cases-plugin/common/constants';
import { CaseUserActionsResponse, CommentType } from '@kbn/cases-plugin/common/api';
import { FtrProviderContext } from '../../../../../common/ftr_provider_context';
import { deleteAllCaseItems, getCaseUserActions } from '../../../../common/lib/utils';

// eslint-disable-next-line import/no-default-export
export default function createGetTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const es = getService('es');

  describe('migrations', () => {
    describe('7.10.0', () => {
      const CASE_ID = 'e1900ac0-017f-11eb-93f8-d161651bf509';

      before(async () => {
        await esArchiver.load('x-pack/test/functional/es_archives/cases/migrations/7.10.0');
      });

      after(async () => {
        await esArchiver.unload('x-pack/test/functional/es_archives/cases/migrations/7.10.0');
      });

      it('7.10.0 migrates user actions connector', async () => {
        const { body } = await supertest
          .get(`${CASES_URL}/${CASE_ID}/user_actions`)
          .set('kbn-xsrf', 'true')
          .send()
          .expect(200);

        const connectorUserAction = body[1];

        expect(connectorUserAction.type).to.be('connector');
        expect(connectorUserAction.payload).to.eql({
          connector: {
            id: 'b1900ac0-017f-11eb-93f8-d161651bf509',
            fields: null,
            name: 'none',
            type: '.none',
          },
        });
      });

      it('7.10.0 migrates user actions correctly', async () => {
        const userActions = await getCaseUserActions({
          supertest,
          caseID: CASE_ID,
        });

        expect(userActions).to.eql([
          {
            owner: 'securitySolution',
            action: 'create',
            created_at: '2020-09-28T11:43:52.158Z',
            created_by: {
              email: null,
              full_name: null,
              username: 'elastic',
            },
            payload: {
              description: 'This is a brand new case of a bad meanie defacing data',
              status: 'open',
              tags: ['defacement'],
              title: 'Super Bad Security Issue',
              connector: {
                name: 'none',
                type: '.none',
                fields: null,
                id: 'none',
              },
              owner: 'securitySolution',
              settings: { syncAlerts: true },
            },
            type: 'create_case',
            action_id: 'e22a7600-017f-11eb-93f8-d161651bf509',
            case_id: 'e1900ac0-017f-11eb-93f8-d161651bf509',
            comment_id: null,
          },
          {
            owner: 'securitySolution',
            action: 'update',
            created_at: '2020-09-28T11:53:52.158Z',
            created_by: {
              email: null,
              full_name: null,
              username: 'elastic',
            },
            payload: {
              connector: {
                name: 'none',
                type: '.none',
                fields: null,
                id: 'b1900ac0-017f-11eb-93f8-d161651bf509',
              },
            },
            type: 'connector',
            action_id: 'a22a7600-017f-11eb-93f8-d161651bf509',
            case_id: 'e1900ac0-017f-11eb-93f8-d161651bf509',
            comment_id: null,
          },
          {
            owner: 'securitySolution',
            action: 'create',
            created_at: '2020-10-30T15:52:02.984Z',
            created_by: {
              email: null,
              full_name: null,
              username: 'elastic',
            },
            payload: {
              comment: {
                comment: 'This is a cool comment',
                type: 'user',
                owner: 'securitySolution',
              },
            },
            type: 'comment',
            action_id: 'db027ec0-1ac7-11eb-b5a3-25ee88122510',
            case_id: 'e1900ac0-017f-11eb-93f8-d161651bf509',
            comment_id: 'da677740-1ac7-11eb-b5a3-25ee88122510',
          },
        ]);
      });
    });

    describe('7.13.2', () => {
      const CASE_ID = 'e49ad6e0-cf9d-11eb-a603-13e7747d215c';

      before(async () => {
        await esArchiver.load('x-pack/test/functional/es_archives/cases/migrations/7.13.2');
      });

      after(async () => {
        await esArchiver.unload('x-pack/test/functional/es_archives/cases/migrations/7.13.2');
      });

      it('adds the owner field', async () => {
        const userActions = await getCaseUserActions({
          supertest,
          caseID: CASE_ID,
        });

        expect(userActions.length).to.not.be(0);
        for (const action of userActions) {
          expect(action.owner).to.be(SECURITY_SOLUTION_OWNER);
        }
      });

      it('7.13.2 migrates user actions correctly', async () => {
        const userActions = await getCaseUserActions({
          supertest,
          caseID: CASE_ID,
        });

        expect(userActions).to.eql([
          {
            owner: 'securitySolution',
            action: 'create',
            created_at: '2021-06-17T18:57:41.682Z',
            created_by: {
              email: null,
              full_name: 'j@j.com',
              username: '711621466',
            },
            payload: {
              description: 'asdf',
              status: 'open',
              tags: ['some tag'],
              title: 'A case',
              connector: {
                name: 'Test Jira',
                type: '.jira',
                fields: {
                  issueType: '10002',
                  parent: null,
                  priority: null,
                },
                id: 'd68508f0-cf9d-11eb-a603-13e7747d215c',
              },
              settings: {
                syncAlerts: true,
              },
              owner: 'securitySolution',
            },
            type: 'create_case',
            action_id: 'e5509250-cf9d-11eb-a603-13e7747d215c',
            case_id: 'e49ad6e0-cf9d-11eb-a603-13e7747d215c',
            comment_id: null,
          },
          {
            owner: 'securitySolution',
            action: 'push_to_service',
            created_at: '2021-06-17T18:57:45.524Z',
            created_by: {
              email: null,
              full_name: 'j@j.com',
              username: '711621466',
            },
            payload: {
              externalService: {
                pushed_at: '2021-06-17T18:57:45.524Z',
                pushed_by: {
                  username: '711621466',
                  full_name: 'j@j.com',
                  email: null,
                },
                connector_name: 'Test Jira',
                external_id: '10106',
                external_title: 'TPN-99',
                external_url: 'https://cases-testing.atlassian.net/browse/TPN-99',
                connector_id: 'd68508f0-cf9d-11eb-a603-13e7747d215c',
              },
            },
            type: 'pushed',
            action_id: 'e6e0f650-cf9d-11eb-a603-13e7747d215c',
            case_id: 'e49ad6e0-cf9d-11eb-a603-13e7747d215c',
            comment_id: null,
          },
          {
            owner: 'securitySolution',
            action: 'create',
            created_at: '2021-06-17T18:57:58.037Z',
            created_by: {
              email: null,
              full_name: 'j@j.com',
              username: '711621466',
            },
            payload: {
              comment: {
                comment: 'A comment',
                type: 'user',
                owner: 'securitySolution',
              },
            },
            type: 'comment',
            action_id: 'eee3be50-cf9d-11eb-a603-13e7747d215c',
            case_id: 'e49ad6e0-cf9d-11eb-a603-13e7747d215c',
            comment_id: 'ee59cdd0-cf9d-11eb-a603-13e7747d215c',
          },
        ]);
      });
    });

    describe('7.13 connector id extraction', () => {
      let userActions: CaseUserActionsResponse;

      before(async () => {
        await esArchiver.load(
          'x-pack/test/functional/es_archives/cases/migrations/7.13_user_actions'
        );
      });

      after(async () => {
        await esArchiver.unload(
          'x-pack/test/functional/es_archives/cases/migrations/7.13_user_actions'
        );
      });

      it('7.13 migrates user actions correctly for case with ID aa8ac630-005e-11ec-91f1-6daf2ab59fb5', async () => {
        userActions = await getCaseUserActions({
          supertest,
          caseID: 'aa8ac630-005e-11ec-91f1-6daf2ab59fb5',
        });

        expect(userActions).to.eql([
          {
            owner: 'securitySolution',
            action: 'create',
            created_at: '2021-08-18T19:58:32.955Z',
            created_by: {
              email: null,
              full_name: 'j@elastic.co',
              username: '1234',
            },
            payload: {
              description: 'a description',
              status: 'open',
              tags: ['super'],
              title: 'a case',
              connector: {
                name: 'none',
                type: '.none',
                fields: null,
                id: 'none',
              },
              settings: {
                syncAlerts: true,
              },
              owner: 'securitySolution',
            },
            type: 'create_case',
            action_id: 'ab43b5f0-005e-11ec-91f1-6daf2ab59fb5',
            case_id: 'aa8ac630-005e-11ec-91f1-6daf2ab59fb5',
            comment_id: null,
          },
          {
            owner: 'securitySolution',
            action: 'create',
            created_at: '2021-08-18T19:58:47.229Z',
            created_by: {
              email: null,
              full_name: 'j@elastic.co',
              username: '1234',
            },
            payload: {
              connector: {
                name: 'none',
                type: '.none',
                fields: null,
                id: 'none',
              },
              status: 'open',
              owner: 'securitySolution',
              settings: {
                syncAlerts: true,
              },
            },
            type: 'create_case',
            action_id: 'b3094de0-005e-11ec-91f1-6daf2ab59fb5',
            case_id: 'aa8ac630-005e-11ec-91f1-6daf2ab59fb5',
            comment_id: null,
          },
        ]);
      });

      it('7.13 migrates user actions correctly for case with ID e6fa9370-005e-11ec-91f1-6daf2ab59fb5', async () => {
        userActions = await getCaseUserActions({
          supertest,
          caseID: 'e6fa9370-005e-11ec-91f1-6daf2ab59fb5',
        });

        expect(userActions).to.eql([
          {
            owner: 'securitySolution',
            action: 'create',
            created_at: '2021-08-18T20:00:14.343Z',
            created_by: {
              email: null,
              full_name: 'j@elastic.co',
              username: '1234',
            },
            payload: {
              description: 'a description',
              status: 'open',
              tags: ['super'],
              title: 'a case',
              connector: {
                name: 'a jira connector',
                type: '.jira',
                fields: {
                  issueType: '10002',
                  parent: null,
                  priority: 'Highest',
                },
                id: 'd92243b0-005e-11ec-91f1-6daf2ab59fb5',
              },
              settings: {
                syncAlerts: true,
              },
              owner: 'securitySolution',
            },
            type: 'create_case',
            action_id: 'e7882d70-005e-11ec-91f1-6daf2ab59fb5',
            case_id: 'e6fa9370-005e-11ec-91f1-6daf2ab59fb5',
            comment_id: null,
          },
          {
            owner: 'securitySolution',
            action: 'push_to_service',
            created_at: '2021-08-18T20:00:18.230Z',
            created_by: {
              email: null,
              full_name: 'j@elastic.co',
              username: '1234',
            },
            payload: {
              externalService: {
                pushed_at: '2021-08-18T20:00:18.230Z',
                pushed_by: {
                  username: '1234',
                  full_name: 'j@elastic.co',
                  email: null,
                },
                connector_name: 'a jira connector',
                external_id: '10117',
                external_title: 'TPN-110',
                external_url: 'https://cases-testing.atlassian.net/browse/TPN-110',
                connector_id: 'd92243b0-005e-11ec-91f1-6daf2ab59fb5',
              },
            },
            type: 'pushed',
            action_id: 'e9471b80-005e-11ec-91f1-6daf2ab59fb5',
            case_id: 'e6fa9370-005e-11ec-91f1-6daf2ab59fb5',
            comment_id: null,
          },
          {
            owner: 'securitySolution',
            action: 'create',
            created_at: '2021-08-18T20:00:28.419Z',
            created_by: {
              email: null,
              full_name: 'j@elastic.co',
              username: '1234',
            },
            payload: {
              comment: {
                comment: 'a comment',
                type: 'user',
                owner: 'securitySolution',
              },
            },
            type: 'comment',
            action_id: 'efe9de50-005e-11ec-91f1-6daf2ab59fb5',
            case_id: 'e6fa9370-005e-11ec-91f1-6daf2ab59fb5',
            comment_id: 'ef5f0370-005e-11ec-91f1-6daf2ab59fb5',
          },
          {
            owner: 'securitySolution',
            action: 'update',
            created_at: '2021-08-18T20:01:33.450Z',
            created_by: {
              email: null,
              full_name: 'j@elastic.co',
              username: '1234',
            },
            payload: {
              connector: {
                name: 'a different jira connector',
                type: '.jira',
                fields: {
                  issueType: '10002',
                  parent: null,
                  priority: 'Low',
                },
                id: '0a572860-005f-11ec-91f1-6daf2ab59fb5',
              },
            },
            type: 'connector',
            action_id: '16cd9e30-005f-11ec-91f1-6daf2ab59fb5',
            case_id: 'e6fa9370-005e-11ec-91f1-6daf2ab59fb5',
            comment_id: null,
          },
          {
            owner: 'securitySolution',
            action: 'push_to_service',
            created_at: '2021-08-18T20:01:47.755Z',
            created_by: {
              email: null,
              full_name: 'j@elastic.co',
              username: '1234',
            },
            payload: {
              externalService: {
                pushed_at: '2021-08-18T20:01:47.755Z',
                pushed_by: {
                  username: '1234',
                  full_name: 'j@elastic.co',
                  email: null,
                },
                connector_name: 'a different jira connector',
                external_id: '10118',
                external_title: 'TPN-111',
                external_url: 'https://cases-testing.atlassian.net/browse/TPN-111',
                connector_id: '0a572860-005f-11ec-91f1-6daf2ab59fb5',
              },
            },
            type: 'pushed',
            action_id: '1ea33bb0-005f-11ec-91f1-6daf2ab59fb5',
            case_id: 'e6fa9370-005e-11ec-91f1-6daf2ab59fb5',
            comment_id: null,
          },
          {
            owner: 'securitySolution',
            action: 'create',
            created_at: '2021-08-18T20:02:05.465Z',
            created_by: {
              email: null,
              full_name: 'j@elastic.co',
              username: '1234',
            },
            payload: {
              comment: {
                comment: 'second comment',
                type: 'user',
                owner: 'securitySolution',
              },
            },
            type: 'comment',
            action_id: '29c98ad0-005f-11ec-91f1-6daf2ab59fb5',
            case_id: 'e6fa9370-005e-11ec-91f1-6daf2ab59fb5',
            comment_id: '29351300-005f-11ec-91f1-6daf2ab59fb5',
          },
          {
            owner: 'securitySolution',
            action: 'update',
            created_at: '2021-08-18T20:02:14.332Z',
            created_by: {
              email: null,
              full_name: 'j@elastic.co',
              username: '1234',
            },
            payload: {
              connector: {
                name: 'a jira connector',
                type: '.jira',
                fields: {
                  issueType: '10002',
                  parent: null,
                  priority: 'Highest',
                },
                id: 'd92243b0-005e-11ec-91f1-6daf2ab59fb5',
              },
            },
            type: 'connector',
            action_id: '2f6e65a0-005f-11ec-91f1-6daf2ab59fb5',
            case_id: 'e6fa9370-005e-11ec-91f1-6daf2ab59fb5',
            comment_id: null,
          },
          {
            owner: 'securitySolution',
            action: 'push_to_service',
            created_at: '2021-08-18T20:02:21.310Z',
            created_by: {
              email: null,
              full_name: 'j@elastic.co',
              username: '1234',
            },
            payload: {
              externalService: {
                pushed_at: '2021-08-18T20:02:21.310Z',
                pushed_by: {
                  username: '1234',
                  full_name: 'j@elastic.co',
                  email: null,
                },
                connector_name: 'a jira connector',
                external_id: '10117',
                external_title: 'TPN-110',
                external_url: 'https://cases-testing.atlassian.net/browse/TPN-110',
                connector_id: 'd92243b0-005e-11ec-91f1-6daf2ab59fb5',
              },
            },
            type: 'pushed',
            action_id: '32a351e0-005f-11ec-91f1-6daf2ab59fb5',
            case_id: 'e6fa9370-005e-11ec-91f1-6daf2ab59fb5',
            comment_id: null,
          },
        ]);
      });

      describe('none connector case', () => {
        it('removes the connector id from the case create user action and sets the ids to null', async () => {
          userActions = await getCaseUserActions({
            supertest,
            caseID: 'aa8ac630-005e-11ec-91f1-6daf2ab59fb5',
          });

          const userAction = getUserActionById(
            userActions,
            'ab43b5f0-005e-11ec-91f1-6daf2ab59fb5'
          )!;

          const payload = userAction.payload;
          expect(payload.description).to.be('a description');
          expect(payload.title).to.be('a case');
          expect(payload.connector.id).to.be('none');
        });

        it('sets the connector ids to null for a create user action with null new and old values', async () => {
          const userAction = getUserActionById(
            userActions,
            'b3094de0-005e-11ec-91f1-6daf2ab59fb5'
          )!;

          const payload = userAction.payload;
          expect(payload.connector.id).to.be('none');
        });
      });

      describe('case with many user actions', () => {
        before(async () => {
          userActions = await getCaseUserActions({
            supertest,
            caseID: 'e6fa9370-005e-11ec-91f1-6daf2ab59fb5',
          });
        });

        it('adds the connector id field for a created case user action', async () => {
          const userAction = getUserActionById(
            userActions,
            'e7882d70-005e-11ec-91f1-6daf2ab59fb5'
          )!;

          const payload = userAction.payload;
          expect(payload.description).to.be('a description');
          expect(payload.title).to.be('a case');
          expect(payload.connector.id).to.be('d92243b0-005e-11ec-91f1-6daf2ab59fb5');
        });

        it('adds the connector id from the external service new value', async () => {
          const userAction = getUserActionById(
            userActions,
            'e9471b80-005e-11ec-91f1-6daf2ab59fb5'
          )!;

          const externalService = userAction.payload.externalService;
          expect(externalService.connector_name).to.be('a jira connector');
          expect(externalService.connector_id).to.be('d92243b0-005e-11ec-91f1-6daf2ab59fb5');
        });

        it('adds the connector id for an update connector action', async () => {
          const userAction = getUserActionById(
            userActions,
            '16cd9e30-005f-11ec-91f1-6daf2ab59fb5'
          )!;

          const payload = userAction.payload;
          expect(payload.connector.name).to.be('a different jira connector');
          expect(payload.connector.id).to.be('0a572860-005f-11ec-91f1-6daf2ab59fb5');
        });

        it('adds the connector id from the external service new value for second push', async () => {
          const userAction = getUserActionById(
            userActions,
            '1ea33bb0-005f-11ec-91f1-6daf2ab59fb5'
          )!;

          const externalService = userAction.payload.externalService;
          expect(externalService.connector_name).to.be('a different jira connector');
          expect(externalService.connector_id).to.be('0a572860-005f-11ec-91f1-6daf2ab59fb5');
        });
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

      it('removes the rule information from alert user action', async () => {
        const userActions = await getCaseUserActions({
          supertest,
          caseID: 'e49ad6e0-cf9d-11eb-a603-13e7747d215c',
        });

        const userAction = getUserActionById(userActions, 'a5509250-cf9d-11eb-a603-13e7747d215c')!;

        expect(userAction.payload.comment.type).to.be(CommentType.alert);
        expect(userAction.payload.comment.alertId).to.be(
          '4eb4cd05b85bc65c7b9f22b776e0136f970f7538eb0d1b2e6e8c7d35b2e875cb'
        );
        expect(userAction.payload.comment.index).to.be(
          '.internal.alerts-security.alerts-default-000001'
        );
        expect(userAction.payload.comment.rule.id).to.be(null);
        expect(userAction.payload.comment.rule.name).to.be(null);
      });

      it('does not modify non-alert attachments', async () => {
        const userActions = await getCaseUserActions({
          supertest,
          caseID: 'e49ad6e0-cf9d-11eb-a603-13e7747d215c',
        });

        const userAction = getUserActionById(userActions, 'e5509250-cf9d-11eb-a603-13e7747d215c')!;

        expect(userAction.payload).to.not.have.property('rule');
        expect(userAction.payload.status).to.be('open');
        expect(userAction.payload.title).to.be('A case');
      });
    });

    describe('8.1.0', () => {
      const CASE_ID = '5257a000-5e7d-11ec-9ee9-cd64f0b77b3c';

      before(async () => {
        await kibanaServer.importExport.load(
          'x-pack/test/functional/fixtures/kbn_archiver/cases/8.0.0/cases.json'
        );
      });

      after(async () => {
        await kibanaServer.importExport.unload(
          'x-pack/test/functional/fixtures/kbn_archiver/cases/8.0.0/cases.json'
        );
        await deleteAllCaseItems(es);
      });

      it('migrates the user actions correctly', async () => {
        const userActions = await getCaseUserActions({
          supertest,
          caseID: CASE_ID,
        });

        expect(userActions).to.eql([
          {
            action: 'create',
            action_id: '5275af50-5e7d-11ec-9ee9-cd64f0b77b3c',
            case_id: '5257a000-5e7d-11ec-9ee9-cd64f0b77b3c',
            comment_id: null,
            created_at: '2021-12-16T14:34:48.709Z',
            created_by: {
              email: '',
              full_name: '',
              username: 'elastic',
            },
            owner: 'securitySolution',
            payload: {
              connector: {
                fields: null,
                id: 'none',
                name: 'none',
                type: '.none',
              },
              description: 'migrating user actions',
              settings: {
                syncAlerts: true,
              },
              status: 'open',
              tags: ['user', 'actions'],
              title: 'User actions',
              owner: 'securitySolution',
            },
            type: 'create_case',
          },
          {
            action: 'create',
            action_id: '72e73240-5e7d-11ec-9ee9-cd64f0b77b3c',
            case_id: '5257a000-5e7d-11ec-9ee9-cd64f0b77b3c',
            comment_id: '72a03e30-5e7d-11ec-9ee9-cd64f0b77b3c',
            created_at: '2021-12-16T14:35:42.872Z',
            created_by: {
              email: '',
              full_name: '',
              username: 'elastic',
            },
            owner: 'securitySolution',
            payload: {
              comment: {
                comment: 'a comment',
                owner: 'securitySolution',
                type: 'user',
              },
            },
            type: 'comment',
          },
          {
            action: 'update',
            action_id: '7685b5c0-5e7d-11ec-9ee9-cd64f0b77b3c',
            case_id: '5257a000-5e7d-11ec-9ee9-cd64f0b77b3c',
            comment_id: null,
            created_at: '2021-12-16T14:35:48.826Z',
            created_by: {
              email: '',
              full_name: '',
              username: 'elastic',
            },
            owner: 'securitySolution',
            payload: {
              title: 'User actions!',
            },
            type: 'title',
          },
          {
            action: 'update',
            action_id: '7a2d8810-5e7d-11ec-9ee9-cd64f0b77b3c',
            case_id: '5257a000-5e7d-11ec-9ee9-cd64f0b77b3c',
            comment_id: null,
            created_at: '2021-12-16T14:35:55.421Z',
            created_by: {
              email: '',
              full_name: '',
              username: 'elastic',
            },
            owner: 'securitySolution',
            payload: {
              description: 'migrating user actions and update!',
            },
            type: 'description',
          },
          {
            action: 'update',
            action_id: '7f942160-5e7d-11ec-9ee9-cd64f0b77b3c',
            case_id: '5257a000-5e7d-11ec-9ee9-cd64f0b77b3c',
            comment_id: '72a03e30-5e7d-11ec-9ee9-cd64f0b77b3c',
            created_at: '2021-12-16T14:36:04.120Z',
            created_by: {
              email: '',
              full_name: '',
              username: 'elastic',
            },
            owner: 'securitySolution',
            payload: {
              comment: {
                comment: 'a comment updated!',
                owner: 'securitySolution',
                type: 'user',
              },
            },
            type: 'comment',
          },
          {
            action: 'add',
            action_id: '8591a380-5e7d-11ec-9ee9-cd64f0b77b3c',
            case_id: '5257a000-5e7d-11ec-9ee9-cd64f0b77b3c',
            comment_id: null,
            created_at: '2021-12-16T14:36:13.840Z',
            created_by: {
              email: '',
              full_name: '',
              username: 'elastic',
            },
            owner: 'securitySolution',
            payload: {
              tags: ['migration'],
            },
            type: 'tags',
          },
          {
            action: 'delete',
            action_id: '8591a381-5e7d-11ec-9ee9-cd64f0b77b3c',
            case_id: '5257a000-5e7d-11ec-9ee9-cd64f0b77b3c',
            comment_id: null,
            created_at: '2021-12-16T14:36:13.840Z',
            created_by: {
              email: '',
              full_name: '',
              username: 'elastic',
            },
            owner: 'securitySolution',
            payload: {
              tags: ['user'],
            },
            type: 'tags',
          },
          {
            action: 'update',
            action_id: '87fadb50-5e7d-11ec-9ee9-cd64f0b77b3c',
            case_id: '5257a000-5e7d-11ec-9ee9-cd64f0b77b3c',
            comment_id: null,
            created_at: '2021-12-16T14:36:17.764Z',
            created_by: {
              email: '',
              full_name: '',
              username: 'elastic',
            },
            owner: 'securitySolution',
            payload: {
              settings: {
                syncAlerts: false,
              },
            },
            type: 'settings',
          },
          {
            action: 'update',
            action_id: '89ca4420-5e7d-11ec-9ee9-cd64f0b77b3c',
            case_id: '5257a000-5e7d-11ec-9ee9-cd64f0b77b3c',
            comment_id: null,
            created_at: '2021-12-16T14:36:21.509Z',
            created_by: {
              email: '',
              full_name: '',
              username: 'elastic',
            },
            owner: 'securitySolution',
            payload: {
              status: 'in-progress',
            },
            type: 'status',
          },
          {
            action: 'update',
            action_id: '9060aae0-5e7d-11ec-9ee9-cd64f0b77b3c',
            case_id: '5257a000-5e7d-11ec-9ee9-cd64f0b77b3c',
            comment_id: null,
            created_at: '2021-12-16T14:36:32.716Z',
            created_by: {
              email: '',
              full_name: '',
              username: 'elastic',
            },
            owner: 'securitySolution',
            payload: {
              connector: {
                fields: {
                  issueType: '10001',
                  parent: null,
                  priority: 'High',
                },
                id: '6773fba0-5e7d-11ec-9ee9-cd64f0b77b3c',
                name: 'Jira',
                type: '.jira',
              },
            },
            type: 'connector',
          },
          {
            action: 'push_to_service',
            action_id: '988579d0-5e7d-11ec-9ee9-cd64f0b77b3c',
            case_id: '5257a000-5e7d-11ec-9ee9-cd64f0b77b3c',
            comment_id: null,
            created_at: '2021-12-16T14:36:46.443Z',
            created_by: {
              email: '',
              full_name: '',
              username: 'elastic',
            },
            owner: 'securitySolution',
            payload: {
              externalService: {
                connector_id: '6773fba0-5e7d-11ec-9ee9-cd64f0b77b3c',
                connector_name: 'Jira',
                external_id: '26225',
                external_title: 'CASES-229',
                external_url: 'https://example.com/browse/CASES-229',
                pushed_at: '2021-12-16T14:36:46.443Z',
                pushed_by: {
                  email: '',
                  full_name: '',
                  username: 'elastic',
                },
              },
            },
            type: 'pushed',
          },
          {
            action: 'update',
            action_id: 'bcb76020-5e7d-11ec-9ee9-cd64f0b77b3c',
            case_id: '5257a000-5e7d-11ec-9ee9-cd64f0b77b3c',
            comment_id: null,
            created_at: '2021-12-16T14:37:46.863Z',
            created_by: {
              email: '',
              full_name: '',
              username: 'elastic',
            },
            owner: 'securitySolution',
            payload: {
              connector: {
                fields: {
                  incidentTypes: ['17', '4'],
                  severityCode: '5',
                },
                id: 'b3214df0-5e7d-11ec-9ee9-cd64f0b77b3c',
                name: 'IBM',
                type: '.resilient',
              },
            },
            type: 'connector',
          },
          {
            action: 'push_to_service',
            action_id: 'c0338e90-5e7d-11ec-9ee9-cd64f0b77b3c',
            case_id: '5257a000-5e7d-11ec-9ee9-cd64f0b77b3c',
            comment_id: null,
            created_at: '2021-12-16T14:37:53.016Z',
            created_by: {
              email: '',
              full_name: '',
              username: 'elastic',
            },
            owner: 'securitySolution',
            payload: {
              externalService: {
                connector_id: 'b3214df0-5e7d-11ec-9ee9-cd64f0b77b3c',
                connector_name: 'IBM',
                external_id: '17574',
                external_title: '17574',
                external_url: 'https://example.com/#incidents/17574',
                pushed_at: '2021-12-16T14:37:53.016Z',
                pushed_by: {
                  email: '',
                  full_name: '',
                  username: 'elastic',
                },
              },
            },
            type: 'pushed',
          },
          {
            action: 'update',
            action_id: 'c5b6d7a0-5e7d-11ec-9ee9-cd64f0b77b3c',
            case_id: '5257a000-5e7d-11ec-9ee9-cd64f0b77b3c',
            comment_id: null,
            created_at: '2021-12-16T14:38:01.895Z',
            created_by: {
              email: '',
              full_name: '',
              username: 'elastic',
            },
            owner: 'securitySolution',
            payload: {
              connector: {
                fields: {
                  issueType: '10001',
                  parent: null,
                  priority: 'Lowest',
                },
                id: '6773fba0-5e7d-11ec-9ee9-cd64f0b77b3c',
                name: 'Jira',
                type: '.jira',
              },
            },
            type: 'connector',
          },
          {
            action: 'create',
            action_id: 'ca8f61c0-5e7d-11ec-9ee9-cd64f0b77b3c',
            case_id: '5257a000-5e7d-11ec-9ee9-cd64f0b77b3c',
            comment_id: 'ca1d17f0-5e7d-11ec-9ee9-cd64f0b77b3c',
            created_at: '2021-12-16T14:38:09.649Z',
            created_by: {
              email: '',
              full_name: '',
              username: 'elastic',
            },
            owner: 'securitySolution',
            payload: {
              comment: {
                comment: 'and another comment!',
                owner: 'securitySolution',
                type: 'user',
              },
            },
            type: 'comment',
          },
        ]);
      });
    });
  });
}

function getUserActionById(userActions: CaseUserActionsResponse, id: string): any {
  return userActions.find((userAction) => userAction.action_id === id);
}
