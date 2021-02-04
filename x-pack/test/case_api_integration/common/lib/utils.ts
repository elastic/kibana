/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';

import { Client } from '@elastic/elasticsearch';
import * as st from 'supertest';
import supertestAsPromised from 'supertest-as-promised';
import { CASES_URL } from '../../../../plugins/case/common/constants';
import {
  CasesConfigureRequest,
  CasesConfigureResponse,
  CaseConnector,
  ConnectorTypes,
  CasePostRequest,
  CollectionWithSubCaseResponse,
  CommentRequestGeneratedAlertType,
} from '../../../../plugins/case/common/api';
import { postCollectionReq, postCommentGenAlertReq } from './mock';

/**
 * Variable to easily access the default comment for the createSubCase function.
 */
export const defaultCreateSubComment = postCommentGenAlertReq;

/**
 * Variable to easily access the default comment for the createSubCase function.
 */
export const defaultCreateSubPost = postCollectionReq;

/**
 * Creates a sub case using the actions API. If a caseID isn't passed in then it will create
 * the collection as well. To create a sub case a comment must be created so it uses a default
 * generated alert style comment which can be overridden.
 */
export const createSubCase = async ({
  supertest,
  caseID,
  comment = defaultCreateSubComment,
  caseInfo = defaultCreateSubPost,
}: {
  supertest: st.SuperTest<supertestAsPromised.Test>;
  comment?: CommentRequestGeneratedAlertType;
  caseID?: string;
  caseInfo?: CasePostRequest;
}): Promise<CollectionWithSubCaseResponse> => {
  const { body: createdAction } = await supertest
    .post('/api/actions/action')
    .set('kbn-xsrf', 'foo')
    .send({
      name: 'A case connector',
      actionTypeId: '.case',
      config: {},
    })
    .expect(200);

  let collectionID: string;

  if (!caseID) {
    collectionID = (
      await supertest.post(CASES_URL).set('kbn-xsrf', 'true').send(caseInfo).expect(200)
    ).body.id;
  } else {
    collectionID = caseID;
  }
  const caseConnector = await supertest
    .post(`/api/actions/action/${createdAction.id}/_execute`)
    .set('kbn-xsrf', 'foo')
    .send({
      params: {
        subAction: 'addComment',
        subActionParams: {
          caseId: collectionID,
          comment,
        },
      },
    })
    .expect(200);

  expect(caseConnector.body.status).to.eql('ok');
  return caseConnector.body.data;
};

export const getConfiguration = ({
  id = 'connector-1',
  name = 'Connector 1',
  type = ConnectorTypes.none,
  fields = null,
}: Partial<CaseConnector> = {}): CasesConfigureRequest => {
  return {
    connector: {
      id,
      name,
      type,
      fields,
    } as CaseConnector,
    closure_type: 'close-by-user',
  };
};

export const getConfigurationOutput = (update = false): Partial<CasesConfigureResponse> => {
  return {
    ...getConfiguration(),
    error: null,
    mappings: [],
    created_by: { email: null, full_name: null, username: 'elastic' },
    updated_by: update ? { email: null, full_name: null, username: 'elastic' } : null,
  };
};

export const getServiceNowConnector = () => ({
  name: 'ServiceNow Connector',
  actionTypeId: '.servicenow',
  secrets: {
    username: 'admin',
    password: 'password',
  },
  config: {
    apiUrl: 'http://some.non.existent.com',
  },
});

export const getJiraConnector = () => ({
  name: 'Jira Connector',
  actionTypeId: '.jira',
  secrets: {
    email: 'elastic@elastic.co',
    apiToken: 'token',
  },
  config: {
    apiUrl: 'http://some.non.existent.com',
    projectKey: 'pkey',
  },
});

export const getMappings = () => [
  {
    source: 'title',
    target: 'name',
    actionType: 'overwrite',
  },
  {
    source: 'description',
    target: 'description',
    actionType: 'overwrite',
  },
  {
    source: 'comments',
    target: 'comments',
    actionType: 'append',
  },
];

export const getResilientConnector = () => ({
  name: 'Resilient Connector',
  actionTypeId: '.resilient',
  secrets: {
    apiKeyId: 'id',
    apiKeySecret: 'secret',
  },
  config: {
    apiUrl: 'http://some.non.existent.com',
    orgId: 'pkey',
  },
});

export const removeServerGeneratedPropertiesFromConfigure = (
  config: Partial<CasesConfigureResponse>
): Partial<CasesConfigureResponse> => {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  const { created_at, updated_at, version, ...rest } = config;
  return rest;
};

export const deleteAllCaseItems = async (es: Client) => {
  await Promise.all([
    deleteCases(es),
    deleteSubCases(es),
    deleteCasesUserActions(es),
    deleteComments(es),
    deleteConfiguration(es),
  ]);
};

export const deleteCasesUserActions = async (es: Client): Promise<void> => {
  await es.deleteByQuery({
    index: '.kibana',
    q: 'type:cases-user-actions',
    wait_for_completion: true,
    refresh: true,
    body: {},
  });
};

export const deleteCases = async (es: Client): Promise<void> => {
  await es.deleteByQuery({
    index: '.kibana',
    q: 'type:cases',
    wait_for_completion: true,
    refresh: true,
    body: {},
  });
};

/**
 * Deletes all sub cases in the .kibana index. This uses ES to perform the delete and does
 * not go through the case API.
 */
export const deleteSubCases = async (es: Client): Promise<void> => {
  await es.deleteByQuery({
    index: '.kibana',
    q: 'type:cases-sub-case',
    wait_for_completion: true,
    refresh: true,
    body: {},
  });
};

export const deleteComments = async (es: Client): Promise<void> => {
  await es.deleteByQuery({
    index: '.kibana',
    q: 'type:cases-comments',
    wait_for_completion: true,
    refresh: true,
    body: {},
  });
};

export const deleteConfiguration = async (es: Client): Promise<void> => {
  await es.deleteByQuery({
    index: '.kibana',
    q: 'type:cases-configure',
    wait_for_completion: true,
    refresh: true,
    body: {},
  });
};
