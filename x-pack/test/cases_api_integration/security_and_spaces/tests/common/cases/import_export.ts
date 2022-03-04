/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { join } from 'path';
import { SavedObject } from 'kibana/server';
import supertest from 'supertest';
import { ObjectRemover as ActionsRemover } from '../../../../../alerting_api_integration/common/lib';
import {
  deleteAllCaseItems,
  createCase,
  createComment,
  findCases,
  getCaseUserActions,
} from '../../../../common/lib/utils';
import { getPostCaseRequest, postCommentUserReq } from '../../../../common/lib/mock';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';
import {
  CASES_URL,
  CASE_SAVED_OBJECT,
  CASE_USER_ACTION_SAVED_OBJECT,
  CASE_COMMENT_SAVED_OBJECT,
} from '../../../../../../plugins/cases/common/constants';
import {
  AttributesTypeUser,
  CommentsResponse,
  CaseAttributes,
  CaseUserActionAttributes,
  CasePostRequest,
  CaseUserActionResponse,
  PushedUserAction,
  ConnectorUserAction,
  CommentUserAction,
  CreateCaseUserAction,
  CaseStatuses,
} from '../../../../../../plugins/cases/common/api';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertestService = getService('supertest');
  const es = getService('es');

  describe('import and export cases', () => {
    const actionsRemover = new ActionsRemover(supertestService);

    afterEach(async () => {
      await deleteAllCaseItems(es);
      await actionsRemover.removeAll();
    });

    it('exports a case with its associated user actions and comments', async () => {
      const caseRequest = getPostCaseRequest();
      const postedCase = await createCase(supertestService, caseRequest);
      await createComment({
        supertest: supertestService,
        caseId: postedCase.id,
        params: postCommentUserReq,
      });

      const { text } = await supertestService
        .post(`/api/saved_objects/_export`)
        .send({
          type: ['cases'],
          excludeExportDetails: true,
          includeReferencesDeep: true,
        })
        .set('kbn-xsrf', 'true');

      const objects = ndjsonToObject(text);

      expect(objects).to.have.length(4);

      expectExportToHaveCaseSavedObject(objects, caseRequest);
      expectExportToHaveUserActions(objects, caseRequest);
      expectExportToHaveAComment(objects);
    });

    it('imports a case with a comment and user actions', async () => {
      await supertestService
        .post('/api/saved_objects/_import')
        .query({ overwrite: true })
        .attach(
          'file',
          join(
            __dirname,
            '../../../../common/fixtures/saved_object_exports/single_case_user_actions_one_comment.ndjson'
          )
        )
        .set('kbn-xsrf', 'true')
        .expect(200);

      const findResponse = await findCases({ supertest: supertestService, query: {} });
      expect(findResponse.total).to.eql(1);
      expect(findResponse.cases[0].title).to.eql('A case to export');
      expect(findResponse.cases[0].description).to.eql('a description');

      const { body: commentsResponse }: { body: CommentsResponse } = await supertestService
        .get(`${CASES_URL}/${findResponse.cases[0].id}/comments/_find`)
        .send()
        .expect(200);

      const comment = commentsResponse.comments[0] as unknown as AttributesTypeUser;
      expect(comment.comment).to.eql('A comment for my case');

      const userActions = await getCaseUserActions({
        supertest: supertestService,
        caseID: findResponse.cases[0].id,
      });

      expect(userActions).to.have.length(2);
      expect(userActions[0].action).to.eql('create');

      expect(userActions[1].action).to.eql('create');
      expect(userActions[1].type).to.eql('comment');
      expect((userActions[1] as CommentUserAction).payload.comment).to.eql({
        comment: 'A comment for my case',
        type: 'user',
        owner: 'securitySolution',
      });
    });

    it('imports a case with a connector', async () => {
      await supertestService
        .post('/api/saved_objects/_import')
        .query({ overwrite: true })
        .attach(
          'file',
          join(
            __dirname,
            '../../../../common/fixtures/saved_object_exports/single_case_with_connector_update_to_none.ndjson'
          )
        )
        .set('kbn-xsrf', 'true')
        .expect(200);

      actionsRemover.add('default', '51a4cbe0-5cea-11ec-a615-15461784e410', 'action', 'actions');

      await expectImportToHaveOneCase(supertestService);

      const userActions = await getCaseUserActions({
        supertest: supertestService,
        caseID: 'afeefae0-5cea-11ec-a615-15461784e410',
      });
      expect(userActions).to.have.length(3);

      expectImportToHaveCreateCaseUserAction(userActions[0]);
      expectImportToHavePushUserAction(userActions[1]);
      expectImportToHaveUpdateConnector(userActions[2]);
    });
  });
};

const expectImportToHaveOneCase = async (supertestService: supertest.SuperTest<supertest.Test>) => {
  const findResponse = await findCases({ supertest: supertestService, query: {} });
  expect(findResponse.total).to.eql(1);
  expect(findResponse.cases[0].title).to.eql('A case with a connector');
  expect(findResponse.cases[0].description).to.eql('super description');
};

const expectImportToHaveCreateCaseUserAction = (userAction: CaseUserActionResponse) => {
  expect(userAction.action).to.eql('create');
};

const expectImportToHavePushUserAction = (userAction: CaseUserActionResponse) => {
  const pushedUserAction = userAction as PushedUserAction;
  expect(userAction.action).to.eql('push_to_service');
  expect(userAction.type).to.eql('pushed');

  expect(pushedUserAction.payload.externalService.connector_name).to.eql('A jira connector');
  expect(pushedUserAction.payload.externalService.connector_id).to.eql(
    '51a4cbe0-5cea-11ec-a615-15461784e410'
  );
};

const expectImportToHaveUpdateConnector = (userAction: CaseUserActionResponse) => {
  const connectorUserAction = userAction as ConnectorUserAction;
  expect(userAction.action).to.eql('update');
  expect(userAction.type).to.eql('connector');

  expect(connectorUserAction.payload.connector.id).to.eql('none');
};

const ndjsonToObject = (input: string) => {
  return input.split('\n').map((str) => JSON.parse(str));
};

const expectExportToHaveCaseSavedObject = (
  objects: SavedObject[],
  caseRequest: CasePostRequest
) => {
  const caseSOs = findSavedObjectsByType<CaseAttributes>(objects, CASE_SAVED_OBJECT);
  expect(caseSOs.length).to.eql(1);

  const createdCaseSO = caseSOs[0];

  // should be the case
  expect(createdCaseSO.attributes.title).to.eql(caseRequest.title);
  expect(createdCaseSO.attributes.description).to.eql(caseRequest.description);
  expect(createdCaseSO.attributes.connector.type).to.eql(caseRequest.connector.type);
  expect(createdCaseSO.attributes.connector.name).to.eql(caseRequest.connector.name);
  expect(createdCaseSO.attributes.connector.fields).to.eql([]);
  expect(createdCaseSO.attributes.settings).to.eql(caseRequest.settings);
};

const expectExportToHaveUserActions = (objects: SavedObject[], caseRequest: CasePostRequest) => {
  const userActionSOs = findSavedObjectsByType<CaseUserActionAttributes>(
    objects,
    CASE_USER_ACTION_SAVED_OBJECT
  );

  expect(userActionSOs.length).to.eql(2);

  expectCaseCreateUserAction(userActionSOs, caseRequest);
  expectCreateCommentUserAction(userActionSOs);
};

const expectCaseCreateUserAction = (
  userActions: Array<SavedObject<CaseUserActionAttributes>>,
  caseRequest: CasePostRequest
) => {
  const userActionForCaseCreate = findUserActionSavedObject(userActions, 'create', 'create_case');
  expect(userActionForCaseCreate?.attributes.action).to.eql('create');
  const createCaseUserAction = userActionForCaseCreate!.attributes as CreateCaseUserAction;

  const {
    connector: { id: ignoreParsedId, ...restParsedConnector },
    ...restParsedCreateCase
  } = createCaseUserAction.payload;

  const {
    connector: { id: ignoreConnectorId, ...restConnector },
    ...restCreateCase
  } = caseRequest;

  expect(restParsedCreateCase).to.eql({
    ...restCreateCase,
    status: CaseStatuses.open,
  });
  expect(restParsedConnector).to.eql(restConnector);
};

const expectCreateCommentUserAction = (
  userActions: Array<SavedObject<CaseUserActionAttributes>>
) => {
  const userActionForComment = findUserActionSavedObject(userActions, 'create', 'comment');
  const createCommentUserAction = userActionForComment!.attributes as CommentUserAction;

  expect(userActionForComment?.attributes.action).to.eql('create');
  expect(userActionForComment?.attributes.type).to.eql('comment');
  expect(createCommentUserAction.payload.comment).to.eql(postCommentUserReq);
};

const expectExportToHaveAComment = (objects: SavedObject[]) => {
  const commentSOs = findSavedObjectsByType<AttributesTypeUser>(objects, CASE_COMMENT_SAVED_OBJECT);

  expect(commentSOs.length).to.eql(1);

  const commentSO = commentSOs[0];
  expect(commentSO.attributes.comment).to.eql(postCommentUserReq.comment);
  expect(commentSO.attributes.type).to.eql(postCommentUserReq.type);
};

const findSavedObjectsByType = <ReturnType>(
  savedObjects: SavedObject[],
  type: string
): Array<SavedObject<ReturnType>> => {
  return (savedObjects.filter((so) => so.type === type) ?? []) as Array<SavedObject<ReturnType>>;
};

const findUserActionSavedObject = (
  savedObjects: Array<SavedObject<CaseUserActionAttributes>>,
  action: string,
  type: string
): SavedObject<CaseUserActionAttributes> | undefined => {
  return savedObjects.find((so) => so.attributes.action === action && so.attributes.type === type);
};
