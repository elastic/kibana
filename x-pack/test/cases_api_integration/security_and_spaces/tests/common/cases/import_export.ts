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
  AttributesTypeUser,
  CommentsResponse,
  CASES_URL,
  CaseType,
  CASE_SAVED_OBJECT,
  CaseAttributes,
  CASE_USER_ACTION_SAVED_OBJECT,
  CaseUserActionAttributes,
  CASE_COMMENT_SAVED_OBJECT,
  CasePostRequest,
  CaseUserActionResponse,
} from '../../../../../../plugins/cases/common';

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
      expect(includesAllCreateCaseActionFields(userActions[0].action_field)).to.eql(true);

      expect(userActions[1].action).to.eql('create');
      expect(userActions[1].action_field).to.eql(['comment']);
      expect(userActions[1].old_value).to.eql(null);
      expect(JSON.parse(userActions[1].new_value!)).to.eql({
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

      actionsRemover.add('default', '1cd34740-06ad-11ec-babc-0b08808e8e01', 'action', 'actions');

      await expectImportToHaveOneCase(supertestService);

      const userActions = await getCaseUserActions({
        supertest: supertestService,
        caseID: '2e85c3f0-06ad-11ec-babc-0b08808e8e01',
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
  expect(includesAllCreateCaseActionFields(userAction.action_field)).to.eql(true);
};

const expectImportToHavePushUserAction = (userAction: CaseUserActionResponse) => {
  expect(userAction.action).to.eql('push-to-service');
  expect(userAction.action_field).to.eql(['pushed']);
  expect(userAction.old_value).to.eql(null);

  const parsedPushNewValue = JSON.parse(userAction.new_value!);
  expect(parsedPushNewValue.connector_name).to.eql('A jira connector');
  expect(parsedPushNewValue).to.not.have.property('connector_id');
  expect(userAction.new_val_connector_id).to.eql('1cd34740-06ad-11ec-babc-0b08808e8e01');
};

const expectImportToHaveUpdateConnector = (userAction: CaseUserActionResponse) => {
  expect(userAction.action).to.eql('update');
  expect(userAction.action_field).to.eql(['connector']);

  const parsedUpdateNewValue = JSON.parse(userAction.new_value!);
  expect(parsedUpdateNewValue).to.not.have.property('id');
  // the new val connector id is null because it is the none connector
  expect(userAction.new_val_connector_id).to.eql(null);

  const parsedUpdateOldValue = JSON.parse(userAction.old_value!);
  expect(parsedUpdateOldValue).to.not.have.property('id');
  expect(userAction.old_val_connector_id).to.eql('1cd34740-06ad-11ec-babc-0b08808e8e01');
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
  const userActionForCaseCreate = findUserActionSavedObject(
    userActions,
    'create',
    createCaseActionFields
  );

  expect(userActionForCaseCreate?.attributes.action).to.eql('create');

  const parsedCaseNewValue = JSON.parse(userActionForCaseCreate?.attributes.new_value as string);
  const {
    connector: { id: ignoreParsedId, ...restParsedConnector },
    ...restParsedCreateCase
  } = parsedCaseNewValue;

  const {
    connector: { id: ignoreConnectorId, ...restConnector },
    ...restCreateCase
  } = caseRequest;

  expect(restParsedCreateCase).to.eql({ ...restCreateCase, type: CaseType.individual });
  expect(restParsedConnector).to.eql(restConnector);

  expect(userActionForCaseCreate?.attributes.old_value).to.eql(null);
  expect(
    includesAllCreateCaseActionFields(userActionForCaseCreate?.attributes.action_field)
  ).to.eql(true);
};

const expectCreateCommentUserAction = (
  userActions: Array<SavedObject<CaseUserActionAttributes>>
) => {
  const userActionForComment = findUserActionSavedObject(userActions, 'create', ['comment']);

  expect(userActionForComment?.attributes.action).to.eql('create');
  expect(JSON.parse(userActionForComment!.attributes.new_value!)).to.eql(postCommentUserReq);
  expect(userActionForComment?.attributes.old_value).to.eql(null);
  expect(userActionForComment?.attributes.action_field).to.eql(['comment']);
};

const expectExportToHaveAComment = (objects: SavedObject[]) => {
  const commentSOs = findSavedObjectsByType<AttributesTypeUser>(objects, CASE_COMMENT_SAVED_OBJECT);

  expect(commentSOs.length).to.eql(1);

  const commentSO = commentSOs[0];
  expect(commentSO.attributes.comment).to.eql(postCommentUserReq.comment);
  expect(commentSO.attributes.type).to.eql(postCommentUserReq.type);
};

const createCaseActionFields = [
  'description',
  'status',
  'tags',
  'title',
  'connector',
  'settings',
  'owner',
];

const includesAllCreateCaseActionFields = (actionFields?: string[]): boolean => {
  return createCaseActionFields.every(
    (field) => actionFields != null && actionFields.includes(field)
  );
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
  actionFields: string[]
): SavedObject<CaseUserActionAttributes> | undefined => {
  return savedObjects.find(
    (so) =>
      so.attributes.action === action && hasAllStrings(so.attributes.action_field, actionFields)
  );
};

const hasAllStrings = (collection: string[], stringsToFind: string[]): boolean => {
  return stringsToFind.every((str) => collection.includes(str));
};
