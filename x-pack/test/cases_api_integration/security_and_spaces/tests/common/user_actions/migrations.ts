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
import { deleteAllCaseItems, getCaseUserActions } from '../../../../common/lib/utils';
import { CaseUserActionsResponse } from '../../../../../../plugins/cases/common/api';

// eslint-disable-next-line import/no-default-export
export default function createGetTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const es = getService('es');

  describe('migrations', () => {
    describe('7.10.0', () => {
      before(async () => {
        await esArchiver.load('x-pack/test/functional/es_archives/cases/migrations/7.10.0');
      });

      after(async () => {
        await esArchiver.unload('x-pack/test/functional/es_archives/cases/migrations/7.10.0');
      });

      it('7.10.0 migrates user actions connector', async () => {
        const { body } = await supertest
          .get(`${CASES_URL}/e1900ac0-017f-11eb-93f8-d161651bf509/user_actions`)
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
    });

    describe('7.13.2', () => {
      before(async () => {
        await esArchiver.load('x-pack/test/functional/es_archives/cases/migrations/7.13.2');
      });

      after(async () => {
        await esArchiver.unload('x-pack/test/functional/es_archives/cases/migrations/7.13.2');
      });

      it('adds the owner field', async () => {
        const userActions = await getCaseUserActions({
          supertest,
          caseID: 'e49ad6e0-cf9d-11eb-a603-13e7747d215c',
        });

        expect(userActions.length).to.not.be(0);
        for (const action of userActions) {
          expect(action.owner).to.be(SECURITY_SOLUTION_OWNER);
        }
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

    // From 8.0.0 to 8.1.0
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
              status: '',
              tags: ['user', 'actions'],
              title: 'User actions',
            },
            sub_case_id: '',
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
            sub_case_id: '',
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
            sub_case_id: '',
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
            sub_case_id: '',
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
            sub_case_id: '',
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
            sub_case_id: '',
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
            sub_case_id: '',
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
            sub_case_id: '',
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
            sub_case_id: '',
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
            sub_case_id: '',
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
            sub_case_id: '',
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
            sub_case_id: '',
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
            sub_case_id: '',
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
            sub_case_id: '',
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
            sub_case_id: '',
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
