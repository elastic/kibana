/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { join } from 'path';
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
} from '../../../../../../plugins/cases/common';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');

  // FLAKY: https://github.com/elastic/kibana/issues/112353
  describe.skip('import and export cases', () => {
    const actionsRemover = new ActionsRemover(supertest);

    afterEach(async () => {
      await deleteAllCaseItems(es);
      await actionsRemover.removeAll();
    });

    it('exports a case with its associated user actions and comments', async () => {
      const caseRequest = getPostCaseRequest();
      const postedCase = await createCase(supertest, caseRequest);
      await createComment({
        supertest,
        caseId: postedCase.id,
        params: postCommentUserReq,
      });

      const { text } = await supertest
        .post(`/api/saved_objects/_export`)
        .send({
          type: ['cases'],
          excludeExportDetails: true,
          includeReferencesDeep: true,
        })
        .set('kbn-xsrf', 'true');

      const objects = ndjsonToObject(text);

      expect(objects).to.have.length(4);

      // should be the case
      expect(objects[0].attributes.title).to.eql(caseRequest.title);
      expect(objects[0].attributes.description).to.eql(caseRequest.description);
      expect(objects[0].attributes.connector.type).to.eql(caseRequest.connector.type);
      expect(objects[0].attributes.connector.name).to.eql(caseRequest.connector.name);
      expect(objects[0].attributes.connector.fields).to.eql([]);
      expect(objects[0].attributes.settings).to.eql(caseRequest.settings);

      // should be two user actions
      expect(objects[1].attributes.action).to.eql('create');

      const parsedCaseNewValue = JSON.parse(objects[1].attributes.new_value);
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

      expect(objects[1].attributes.old_value).to.eql(null);
      expect(includesAllRequiredFields(objects[1].attributes.action_field)).to.eql(true);

      // should be the comment
      expect(objects[2].attributes.comment).to.eql(postCommentUserReq.comment);
      expect(objects[2].attributes.type).to.eql(postCommentUserReq.type);

      expect(objects[3].attributes.action).to.eql('create');
      expect(JSON.parse(objects[3].attributes.new_value)).to.eql(postCommentUserReq);
      expect(objects[3].attributes.old_value).to.eql(null);
      expect(objects[3].attributes.action_field).to.eql(['comment']);
    });

    it('imports a case with a comment and user actions', async () => {
      await supertest
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

      const findResponse = await findCases({ supertest, query: {} });
      expect(findResponse.total).to.eql(1);
      expect(findResponse.cases[0].title).to.eql('A case to export');
      expect(findResponse.cases[0].description).to.eql('a description');

      const { body: commentsResponse }: { body: CommentsResponse } = await supertest
        .get(`${CASES_URL}/${findResponse.cases[0].id}/comments/_find`)
        .send()
        .expect(200);

      const comment = commentsResponse.comments[0] as unknown as AttributesTypeUser;
      expect(comment.comment).to.eql('A comment for my case');

      const userActions = await getCaseUserActions({
        supertest,
        caseID: findResponse.cases[0].id,
      });

      expect(userActions).to.have.length(2);
      expect(userActions[0].action).to.eql('create');
      expect(includesAllRequiredFields(userActions[0].action_field)).to.eql(true);

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
      await supertest
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

      const findResponse = await findCases({ supertest, query: {} });
      expect(findResponse.total).to.eql(1);
      expect(findResponse.cases[0].title).to.eql('A case with a connector');
      expect(findResponse.cases[0].description).to.eql('super description');

      const userActions = await getCaseUserActions({
        supertest,
        caseID: findResponse.cases[0].id,
      });

      expect(userActions).to.have.length(3);
      expect(userActions[0].action).to.eql('create');
      expect(includesAllRequiredFields(userActions[0].action_field)).to.eql(true);

      expect(userActions[1].action).to.eql('push-to-service');
      expect(userActions[1].action_field).to.eql(['pushed']);
      expect(userActions[1].old_value).to.eql(null);

      const parsedPushNewValue = JSON.parse(userActions[1].new_value!);
      expect(parsedPushNewValue.connector_name).to.eql('A jira connector');
      expect(parsedPushNewValue.connector_id).to.eql('1cd34740-06ad-11ec-babc-0b08808e8e01');

      expect(userActions[2].action).to.eql('update');
      expect(userActions[2].action_field).to.eql(['connector']);

      const parsedUpdateNewValue = JSON.parse(userActions[2].new_value!);
      expect(parsedUpdateNewValue.id).to.eql('none');
    });
  });
};

const ndjsonToObject = (input: string) => {
  return input.split('\n').map((str) => JSON.parse(str));
};

const includesAllRequiredFields = (actionFields: string[]): boolean => {
  const requiredFields = [
    'description',
    'status',
    'tags',
    'title',
    'connector',
    'settings',
    'owner',
  ];

  return requiredFields.every((field) => actionFields.includes(field));
};
