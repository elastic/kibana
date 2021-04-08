/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit } from 'lodash';
import expect from '@kbn/expect';
import type { ApiResponse, estypes } from '@elastic/elasticsearch';
import type { KibanaClient } from '@elastic/elasticsearch/api/kibana';

import * as st from 'supertest';
import supertestAsPromised from 'supertest-as-promised';
import { CASES_URL, SUB_CASES_PATCH_DEL_URL } from '../../../../plugins/cases/common/constants';
import {
  CasesConfigureRequest,
  CasesConfigureResponse,
  CaseConnector,
  ConnectorTypes,
  CasePostRequest,
  CaseResponse,
  SubCasesFindResponse,
  CaseStatuses,
  SubCasesResponse,
  CasesResponse,
  CasesFindResponse,
  CommentRequest,
  CaseUserActionResponse,
  SubCaseResponse,
  CommentResponse,
  CasesPatchRequest,
  AllCommentsResponse,
} from '../../../../plugins/cases/common/api';
import { getPostCaseRequest, postCollectionReq, postCommentGenAlertReq } from './mock';
import { getSubCasesUrl } from '../../../../plugins/cases/common/api/helpers';
import { ContextTypeGeneratedAlertType } from '../../../../plugins/cases/server/connectors';
import { SignalHit } from '../../../../plugins/security_solution/server/lib/detection_engine/signals/types';
import { User } from './authentication/types';

function toArray<T>(input: T | T[]): T[] {
  if (Array.isArray(input)) {
    return input;
  }
  return [input];
}

/**
 * Query Elasticsearch for a set of signals within a set of indices
 */
export const getSignalsWithES = async ({
  es,
  indices,
  ids,
}: {
  es: KibanaClient;
  indices: string | string[];
  ids: string | string[];
}): Promise<Map<string, Map<string, estypes.Hit<SignalHit>>>> => {
  const signals: ApiResponse<estypes.SearchResponse<SignalHit>> = await es.search({
    index: indices,
    body: {
      size: 10000,
      query: {
        bool: {
          filter: [
            {
              ids: {
                values: toArray(ids),
              },
            },
          ],
        },
      },
    },
  });

  return signals.body.hits.hits.reduce((acc, hit) => {
    let indexMap = acc.get(hit._index);
    if (indexMap === undefined) {
      indexMap = new Map<string, estypes.Hit<SignalHit>>([[hit._id, hit]]);
    } else {
      indexMap.set(hit._id, hit);
    }
    acc.set(hit._index, indexMap);
    return acc;
  }, new Map<string, Map<string, estypes.Hit<SignalHit>>>());
};

interface SetStatusCasesParams {
  id: string;
  version: string;
  status: CaseStatuses;
}

/**
 * Sets the status of some cases or sub cases. The cases field must be all of one type.
 */
export const setStatus = async ({
  supertest,
  cases,
  type,
}: {
  supertest: st.SuperTest<supertestAsPromised.Test>;
  cases: SetStatusCasesParams[];
  type: 'case' | 'sub_case';
}): Promise<CasesResponse | SubCasesResponse> => {
  const url = type === 'case' ? CASES_URL : SUB_CASES_PATCH_DEL_URL;
  const patchFields = type === 'case' ? { cases } : { subCases: cases };
  const { body }: { body: CasesResponse | SubCasesResponse } = await supertest
    .patch(url)
    .set('kbn-xsrf', 'true')
    .send(patchFields)
    .expect(200);
  return body;
};

/**
 * Variable to easily access the default comment for the createSubCase function.
 */
export const defaultCreateSubComment = postCommentGenAlertReq;

/**
 * Variable to easily access the default comment for the createSubCase function.
 */
export const defaultCreateSubPost = postCollectionReq;

/**
 * Response structure for the createSubCase and createSubCaseComment functions.
 */
export interface CreateSubCaseResp {
  newSubCaseInfo: CaseResponse;
  modifiedSubCases?: SubCasesResponse;
}

/**
 * Creates a sub case using the actions API. If a caseID isn't passed in then it will create
 * the collection as well. To create a sub case a comment must be created so it uses a default
 * generated alert style comment which can be overridden.
 */
export const createSubCase = async (args: {
  supertest: st.SuperTest<supertestAsPromised.Test>;
  comment?: ContextTypeGeneratedAlertType;
  caseID?: string;
  caseInfo?: CasePostRequest;
  actionID?: string;
}): Promise<CreateSubCaseResp> => {
  return createSubCaseComment({ ...args, forceNewSubCase: true });
};

/**
 * Add case as a connector
 */
export const createCaseAction = async (supertest: st.SuperTest<supertestAsPromised.Test>) => {
  const { body: createdAction } = await supertest
    .post('/api/actions/action')
    .set('kbn-xsrf', 'foo')
    .send({
      name: 'A case connector',
      actionTypeId: '.case',
      config: {},
    })
    .expect(200);
  return createdAction.id;
};

/**
 * Remove a connector
 */
export const deleteCaseAction = async (
  supertest: st.SuperTest<supertestAsPromised.Test>,
  id: string
) => {
  await supertest.delete(`/api/actions/action/${id}`).set('kbn-xsrf', 'foo');
};

/**
 * Creates a sub case using the actions APIs. This will handle forcing a creation of a new sub case even if one exists
 * if the forceNewSubCase parameter is set to true.
 */
export const createSubCaseComment = async ({
  supertest,
  caseID,
  comment = defaultCreateSubComment,
  caseInfo = defaultCreateSubPost,
  // if true it will close any open sub cases and force a new sub case to be opened
  forceNewSubCase = false,
  actionID,
}: {
  supertest: st.SuperTest<supertestAsPromised.Test>;
  comment?: ContextTypeGeneratedAlertType;
  caseID?: string;
  caseInfo?: CasePostRequest;
  forceNewSubCase?: boolean;
  actionID?: string;
}): Promise<CreateSubCaseResp> => {
  let actionIDToUse: string;

  if (actionID === undefined) {
    actionIDToUse = await createCaseAction(supertest);
  } else {
    actionIDToUse = actionID;
  }

  let collectionID: string;

  if (!caseID) {
    collectionID = (
      await supertest.post(CASES_URL).set('kbn-xsrf', 'true').send(caseInfo).expect(200)
    ).body.id;
  } else {
    collectionID = caseID;
  }

  let closedSubCases: SubCasesResponse | undefined;
  if (forceNewSubCase) {
    const { body: subCasesResp }: { body: SubCasesFindResponse } = await supertest
      .get(`${getSubCasesUrl(collectionID)}/_find`)
      .expect(200);

    const nonClosed = subCasesResp.subCases.filter(
      (subCase) => subCase.status !== CaseStatuses.closed
    );
    if (nonClosed.length > 0) {
      // mark the sub case as closed so a new sub case will be created on the next comment
      closedSubCases = (
        await supertest
          .patch(SUB_CASES_PATCH_DEL_URL)
          .set('kbn-xsrf', 'true')
          .send({
            subCases: nonClosed.map((subCase) => ({
              id: subCase.id,
              version: subCase.version,
              status: CaseStatuses.closed,
            })),
          })
          .expect(200)
      ).body;
    }
  }

  const caseConnector = await supertest
    .post(`/api/actions/action/${actionIDToUse}/_execute`)
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
  return { newSubCaseInfo: caseConnector.body.data, modifiedSubCases: closedSubCases };
};

export const getConfiguration = ({
  id = 'none',
  name = 'none',
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

interface CommonSavedObjectAttributes {
  id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  version?: string | null;
  [key: string]: unknown;
}

const savedObjectCommonAttributes = ['created_at', 'updated_at', 'version', 'id'];

const removeServerGeneratedPropertiesFromObject = <T extends object, K extends keyof T>(
  object: T,
  keys: K[]
): Omit<T, K> => {
  return omit<T, K>(object, keys);
};
export const removeServerGeneratedPropertiesFromSavedObject = <
  T extends CommonSavedObjectAttributes
>(
  attributes: T,
  keys: Array<keyof T> = []
): Omit<T, typeof savedObjectCommonAttributes[number] | typeof keys[number]> => {
  return removeServerGeneratedPropertiesFromObject(attributes, [
    ...savedObjectCommonAttributes,
    ...keys,
  ]);
};

export const removeServerGeneratedPropertiesFromUserAction = (
  attributes: CaseUserActionResponse
) => {
  const keysToRemove: Array<keyof CaseUserActionResponse> = ['action_id', 'action_at'];
  return removeServerGeneratedPropertiesFromObject<
    CaseUserActionResponse,
    typeof keysToRemove[number]
  >(attributes, keysToRemove);
};

export const removeServerGeneratedPropertiesFromSubCase = (
  subCase: SubCaseResponse | undefined
) => {
  if (!subCase) {
    return;
  }

  return removeServerGeneratedPropertiesFromSavedObject<SubCaseResponse>(subCase, [
    'closed_at',
    'comments',
  ]);
};

export const removeServerGeneratedPropertiesFromCase = (
  theCase: CaseResponse
): Partial<CaseResponse> => {
  return removeServerGeneratedPropertiesFromSavedObject<CaseResponse>(theCase, ['closed_at']);
};

export const removeServerGeneratedPropertiesFromComments = (
  comments: CommentResponse[] | undefined
): Array<Partial<CommentResponse>> | undefined => {
  return comments?.map((comment) => {
    return removeServerGeneratedPropertiesFromSavedObject<CommentResponse>(comment, []);
  });
};

export const deleteAllCaseItems = async (es: KibanaClient) => {
  await Promise.all([
    deleteCases(es),
    deleteSubCases(es),
    deleteCasesUserActions(es),
    deleteComments(es),
    deleteConfiguration(es),
    deleteMappings(es),
  ]);
};

export const deleteCasesUserActions = async (es: KibanaClient): Promise<void> => {
  await es.deleteByQuery({
    index: '.kibana',
    // @ts-expect-error @elastic/elasticsearch DeleteByQueryRequest doesn't accept q parameter
    q: 'type:cases-user-actions',
    wait_for_completion: true,
    refresh: true,
    body: {},
  });
};

export const deleteCases = async (es: KibanaClient): Promise<void> => {
  await es.deleteByQuery({
    index: '.kibana',
    // @ts-expect-error @elastic/elasticsearch DeleteByQueryRequest doesn't accept q parameter
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
export const deleteSubCases = async (es: KibanaClient): Promise<void> => {
  await es.deleteByQuery({
    index: '.kibana',
    // @ts-expect-error @elastic/elasticsearch DeleteByQueryRequest doesn't accept q parameter
    q: 'type:cases-sub-case',
    wait_for_completion: true,
    refresh: true,
    body: {},
  });
};

export const deleteComments = async (es: KibanaClient): Promise<void> => {
  await es.deleteByQuery({
    index: '.kibana',
    // @ts-expect-error @elastic/elasticsearch DeleteByQueryRequest doesn't accept q parameter
    q: 'type:cases-comments',
    wait_for_completion: true,
    refresh: true,
    body: {},
  });
};

export const deleteConfiguration = async (es: KibanaClient): Promise<void> => {
  await es.deleteByQuery({
    index: '.kibana',
    // @ts-expect-error @elastic/elasticsearch DeleteByQueryRequest doesn't accept q parameter
    q: 'type:cases-configure',
    wait_for_completion: true,
    refresh: true,
    body: {},
  });
};

export const deleteMappings = async (es: KibanaClient): Promise<void> => {
  await es.deleteByQuery({
    index: '.kibana',
    // @ts-expect-error @elastic/elasticsearch DeleteByQueryRequest doesn't accept q parameter
    q: 'type:cases-connector-mappings',
    wait_for_completion: true,
    refresh: true,
    body: {},
  });
};

export const getSpaceUrlPrefix = (spaceId: string) => {
  return spaceId && spaceId !== 'default' ? `/s/${spaceId}` : ``;
};

export const createCaseAsUser = async ({
  supertestWithoutAuth,
  user,
  space,
  owner,
  expectedHttpCode = 200,
}: {
  supertestWithoutAuth: st.SuperTest<supertestAsPromised.Test>;
  user: User;
  space: string;
  owner?: string;
  expectedHttpCode?: number;
}): Promise<CaseResponse> => {
  const { body: theCase } = await supertestWithoutAuth
    .post(`${getSpaceUrlPrefix(space)}${CASES_URL}`)
    .auth(user.username, user.password)
    .set('kbn-xsrf', 'true')
    .send(getPostCaseRequest({ owner }))
    .expect(expectedHttpCode);

  return theCase;
};

export const findCasesAsUser = async ({
  supertestWithoutAuth,
  user,
  space,
  expectedHttpCode = 200,
  appendToUrl = '',
}: {
  supertestWithoutAuth: st.SuperTest<supertestAsPromised.Test>;
  user: User;
  space: string;
  expectedHttpCode?: number;
  appendToUrl?: string;
}): Promise<CasesFindResponse> => {
  const { body: res } = await supertestWithoutAuth
    .get(`${getSpaceUrlPrefix(space)}${CASES_URL}/_find?sortOrder=asc&${appendToUrl}`)
    .auth(user.username, user.password)
    .set('kbn-xsrf', 'true')
    .send()
    .expect(expectedHttpCode);

  return res;
};

export const ensureSavedObjectIsAuthorized = (
  cases: CaseResponse[],
  numberOfExpectedCases: number,
  owners: string[]
) => {
  expect(cases.length).to.eql(numberOfExpectedCases);
  cases.forEach((theCase) => expect(owners.includes(theCase.owner)).to.be(true));
};

export const createCase = async (
  supertest: st.SuperTest<supertestAsPromised.Test>,
  params: CasePostRequest,
  expectedHttpCode: number = 200
): Promise<CaseResponse> => {
  const { body: theCase } = await supertest
    .post(CASES_URL)
    .set('kbn-xsrf', 'true')
    .send(params)
    .expect(expectedHttpCode);

  return theCase;
};

export const createComment = async (
  supertest: st.SuperTest<supertestAsPromised.Test>,
  caseId: string,
  params: CommentRequest,
  expectedHttpCode: number = 200
): Promise<CaseResponse> => {
  const { body: theCase } = await supertest
    .post(`${CASES_URL}/${caseId}/comments`)
    .set('kbn-xsrf', 'true')
    .send(params)
    .expect(expectedHttpCode);

  return theCase;
};

export const getAllUserAction = async (
  supertest: st.SuperTest<supertestAsPromised.Test>,
  caseId: string,
  expectedHttpCode: number = 200
) => {
  const { body: userActions } = await supertest
    .get(`${CASES_URL}/${caseId}/user_actions`)
    .set('kbn-xsrf', 'true')
    .send()
    .expect(expectedHttpCode);

  return userActions;
};

export const updateCase = async (
  supertest: st.SuperTest<supertestAsPromised.Test>,
  params: CasesPatchRequest,
  expectedHttpCode: number = 200
): Promise<CaseResponse[]> => {
  const { body: cases } = await supertest
    .patch(CASES_URL)
    .set('kbn-xsrf', 'true')
    .send(params)
    .expect(expectedHttpCode);

  return cases;
};

export const deleteComment = async (
  supertest: st.SuperTest<supertestAsPromised.Test>,
  caseId: string,
  commentId: string,
  expectedHttpCode: number = 204
): Promise<void> => {
  const { body: comment } = await supertest
    .delete(`${CASES_URL}/${caseId}/comments/${commentId}`)
    .set('kbn-xsrf', 'true')
    .expect(expectedHttpCode)
    .send();

  return comment;
};

export const getAllComments = async (
  supertest: st.SuperTest<supertestAsPromised.Test>,
  caseId: string,
  expectedHttpCode: number = 204
): Promise<AllCommentsResponse> => {
  const { body: comments } = await supertest
    .get(`${CASES_URL}/${caseId}/comments`)
    .set('kbn-xsrf', 'true')
    .send()
    .expect(expectedHttpCode);

  return comments;
};

export const getComment = async (
  supertest: st.SuperTest<supertestAsPromised.Test>,
  caseId: string,
  commentId: string,
  expectedHttpCode: number = 204
): Promise<CommentResponse> => {
  const { body: comment } = await supertest
    .get(`${CASES_URL}/${caseId}/comments/${commentId}`)
    .set('kbn-xsrf', 'true')
    .send()
    .expect(expectedHttpCode);

  return comment;
};
