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
import {
  CASES_URL,
  CASE_CONFIGURE_CONNECTORS_URL,
  CASE_CONFIGURE_URL,
  CASE_STATUS_URL,
  SUB_CASES_PATCH_DEL_URL,
} from '../../../../plugins/cases/common/constants';
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
  CommentPatchRequest,
  CasesConfigurePatch,
  CasesStatusResponse,
} from '../../../../plugins/cases/common/api';
import { getPostCaseRequest, postCollectionReq, postCommentGenAlertReq } from './mock';
import { getSubCasesUrl } from '../../../../plugins/cases/common/api/helpers';
import { ContextTypeGeneratedAlertType } from '../../../../plugins/cases/server/connectors';
import { SignalHit } from '../../../../plugins/security_solution/server/lib/detection_engine/signals/types';
import { ActionResult, FindActionResult } from '../../../../plugins/actions/server/types';
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
    .post('/api/actions/connector')
    .set('kbn-xsrf', 'foo')
    .send({
      name: 'A case connector',
      connector_type_id: '.case',
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
  await supertest.delete(`/api/actions/connector/${id}`).set('kbn-xsrf', 'foo');
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
    .post(`/api/actions/connector/${actionIDToUse}/_execute`)
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

export const getConfigurationRequest = ({
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

export const getConfigurationOutput = (
  update = false,
  overwrite = {}
): Partial<CasesConfigureResponse> => {
  return {
    ...getConfigurationRequest(),
    error: null,
    mappings: [],
    created_by: { email: null, full_name: null, username: 'elastic' },
    updated_by: update ? { email: null, full_name: null, username: 'elastic' } : null,
    ...overwrite,
  };
};

export const getServiceNowConnector = () => ({
  name: 'ServiceNow Connector',
  connector_type_id: '.servicenow',
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
  connector_type_id: '.jira',
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
  connector_type_id: '.resilient',
  secrets: {
    apiKeyId: 'id',
    apiKeySecret: 'secret',
  },
  config: {
    apiUrl: 'http://some.non.existent.com',
    orgId: 'pkey',
  },
});

export const getServiceNowSIRConnector = () => ({
  name: 'ServiceNow Connector',
  connector_type_id: '.servicenow-sir',
  secrets: {
    username: 'admin',
    password: 'password',
  },
  config: {
    apiUrl: 'http://some.non.existent.com',
  },
});

export const getWebhookConnector = () => ({
  name: 'A generic Webhook action',
  connector_type_id: '.webhook',
  secrets: {
    user: 'user',
    password: 'password',
  },
  config: {
    headers: {
      'Content-Type': 'text/plain',
    },
    url: 'http://some.non.existent.com',
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
    deleteCasesByESQuery(es),
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

export const deleteCasesByESQuery = async (es: KibanaClient): Promise<void> => {
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

/**
 * Sends a delete request for the specified case IDs.
 */
export const deleteCases = async ({
  supertest,
  caseIDs,
  expectedHttpCode = 204,
}: {
  supertest: st.SuperTest<supertestAsPromised.Test>;
  caseIDs: string[];
  expectedHttpCode?: number;
}) => {
  const { body } = await supertest
    .delete(`${CASES_URL}`)
    // we need to json stringify here because just passing in the array of case IDs will cause a 400 with Kibana
    // not being able to parse the array correctly. The format ids=["1", "2"] seems to work, which stringify outputs.
    .query({ ids: JSON.stringify(caseIDs) })
    .set('kbn-xsrf', 'true')
    .send()
    .expect(expectedHttpCode);

  return body;
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
): Promise<CaseUserActionResponse[]> => {
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
): Promise<{} | Error> => {
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
  expectedHttpCode: number = 200
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
  expectedHttpCode: number = 200
): Promise<CommentResponse> => {
  const { body: comment } = await supertest
    .get(`${CASES_URL}/${caseId}/comments/${commentId}`)
    .set('kbn-xsrf', 'true')
    .send()
    .expect(expectedHttpCode);

  return comment;
};

export const updateComment = async (
  supertest: st.SuperTest<supertestAsPromised.Test>,
  caseId: string,
  req: CommentPatchRequest,
  expectedHttpCode: number = 200
): Promise<CaseResponse> => {
  const { body: res } = await supertest
    .patch(`${CASES_URL}/${caseId}/comments`)
    .set('kbn-xsrf', 'true')
    .send(req)
    .expect(expectedHttpCode);

  return res;
};

export const getConfiguration = async (
  supertest: st.SuperTest<supertestAsPromised.Test>,
  expectedHttpCode: number = 200
): Promise<CasesConfigureResponse> => {
  const { body: configuration } = await supertest
    .get(CASE_CONFIGURE_URL)
    .set('kbn-xsrf', 'true')
    .send()
    .expect(expectedHttpCode);

  return configuration;
};

export const createConfiguration = async (
  supertest: st.SuperTest<supertestAsPromised.Test>,
  req: CasesConfigureRequest = getConfigurationRequest(),
  expectedHttpCode: number = 200
): Promise<CasesConfigureResponse> => {
  const { body: configuration } = await supertest
    .post(CASE_CONFIGURE_URL)
    .set('kbn-xsrf', 'true')
    .send(req)
    .expect(expectedHttpCode);

  return configuration;
};

export type CreateConnectorResponse = Omit<ActionResult, 'actionTypeId'> & {
  connector_type_id: string;
};

export const createConnector = async (
  supertest: st.SuperTest<supertestAsPromised.Test>,
  req: Record<string, unknown>,
  expectedHttpCode: number = 200
): Promise<CreateConnectorResponse> => {
  const { body: connector } = await supertest
    .post('/api/actions/connector')
    .set('kbn-xsrf', 'true')
    .send(req)
    .expect(expectedHttpCode);

  return connector;
};

export const getCaseConnectors = async (
  supertest: st.SuperTest<supertestAsPromised.Test>,
  expectedHttpCode: number = 200
): Promise<FindActionResult[]> => {
  const { body: connectors } = await supertest
    .get(`${CASE_CONFIGURE_CONNECTORS_URL}/_find`)
    .set('kbn-xsrf', 'true')
    .send()
    .expect(expectedHttpCode);

  return connectors;
};

export const updateConfiguration = async (
  supertest: st.SuperTest<supertestAsPromised.Test>,
  req: CasesConfigurePatch,
  expectedHttpCode: number = 200
): Promise<CasesConfigureResponse> => {
  const { body: configuration } = await supertest
    .patch(CASE_CONFIGURE_URL)
    .set('kbn-xsrf', 'true')
    .send(req)
    .expect(expectedHttpCode);

  return configuration;
};

export const getAllCasesStatuses = async (
  supertest: st.SuperTest<supertestAsPromised.Test>,
  expectedHttpCode: number = 200
): Promise<CasesStatusResponse> => {
  const { body: statuses } = await supertest
    .get(CASE_STATUS_URL)
    .set('kbn-xsrf', 'true')
    .send()
    .expect(expectedHttpCode);

  return statuses;
};

export const getCase = async (
  supertest: st.SuperTest<supertestAsPromised.Test>,
  caseId: string,
  includeComments: boolean = false,
  expectedHttpCode: number = 200
): Promise<CaseResponse> => {
  const { body: theCase } = await supertest
    .get(`${CASES_URL}/${caseId}?includeComments=${includeComments}`)
    .set('kbn-xsrf', 'true')
    .send()
    .expect(expectedHttpCode);

  return theCase;
};

export const findCases = async (
  supertest: st.SuperTest<supertestAsPromised.Test>,
  query: Record<string, unknown> = {},
  expectedHttpCode: number = 200
): Promise<CasesFindResponse> => {
  const { body: res } = await supertest
    .get(`${CASES_URL}/_find`)
    .query({ sortOrder: 'asc', ...query })
    .set('kbn-xsrf', 'true')
    .send()
    .expect(expectedHttpCode);

  return res;
};

export const pushCase = async (
  supertest: st.SuperTest<supertestAsPromised.Test>,
  caseId: string,
  connectorId: string,
  expectedHttpCode: number = 200
): Promise<CaseResponse> => {
  const { body: res } = await supertest
    .post(`${CASES_URL}/${caseId}/connector/${connectorId}/_push`)
    .set('kbn-xsrf', 'true')
    .send({})
    .expect(expectedHttpCode);

  return res;
};
