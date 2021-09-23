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

import type SuperTest from 'supertest';
import { ObjectRemover as ActionsRemover } from '../../../alerting_api_integration/common/lib';
import {
  CASES_URL,
  CASE_CONFIGURE_CONNECTORS_URL,
  CASE_CONFIGURE_URL,
  CASE_REPORTERS_URL,
  CASE_STATUS_URL,
  CASE_TAGS_URL,
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
  CasesConfigurationsResponse,
  CaseUserActionsResponse,
  AlertResponse,
  ConnectorMappings,
  CasesByAlertId,
  CaseResolveResponse,
} from '../../../../plugins/cases/common/api';
import { getPostCaseRequest, postCollectionReq, postCommentGenAlertReq } from './mock';
import { getCaseUserActionUrl, getSubCasesUrl } from '../../../../plugins/cases/common/api/helpers';
import { ContextTypeGeneratedAlertType } from '../../../../plugins/cases/server/connectors';
import { SignalHit } from '../../../../plugins/security_solution/server/lib/detection_engine/signals/types';
import { ActionResult, FindActionResult } from '../../../../plugins/actions/server/types';
import { User } from './authentication/types';
import { superUser } from './authentication/users';
import { ESCasesConfigureAttributes } from '../../../../plugins/cases/server/services/configure/types';
import { ESCaseAttributes } from '../../../../plugins/cases/server/services/cases/types';

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
}): Promise<Map<string, Map<string, estypes.SearchHit<SignalHit>>>> => {
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
      indexMap = new Map<string, estypes.SearchHit<SignalHit>>([[hit._id, hit]]);
    } else {
      indexMap.set(hit._id, hit);
    }
    acc.set(hit._index, indexMap);
    return acc;
  }, new Map<string, Map<string, estypes.SearchHit<SignalHit>>>());
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
  supertest: SuperTest.SuperTest<SuperTest.Test>;
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
  supertest: SuperTest.SuperTest<SuperTest.Test>;
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
export const createCaseAction = async (supertest: SuperTest.SuperTest<SuperTest.Test>) => {
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
  supertest: SuperTest.SuperTest<SuperTest.Test>,
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
  supertest: SuperTest.SuperTest<SuperTest.Test>;
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

type ConfigRequestParams = Partial<CaseConnector> & {
  overrides?: Record<string, unknown>;
};

export const getConfigurationRequest = ({
  id = 'none',
  name = 'none',
  type = ConnectorTypes.none,
  fields = null,
  overrides,
}: ConfigRequestParams = {}): CasesConfigureRequest => {
  return {
    connector: {
      id,
      name,
      type,
      fields,
    } as CaseConnector,
    closure_type: 'close-by-user',
    owner: 'securitySolutionFixture',
    ...overrides,
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
    q: 'type:cases-user-actions',
    wait_for_completion: true,
    refresh: true,
    body: {},
    conflicts: 'proceed',
  });
};

export const deleteCasesByESQuery = async (es: KibanaClient): Promise<void> => {
  await es.deleteByQuery({
    index: '.kibana',
    q: 'type:cases',
    wait_for_completion: true,
    refresh: true,
    body: {},
    conflicts: 'proceed',
  });
};

/**
 * Deletes all sub cases in the .kibana index. This uses ES to perform the delete and does
 * not go through the case API.
 */
export const deleteSubCases = async (es: KibanaClient): Promise<void> => {
  await es.deleteByQuery({
    index: '.kibana',
    q: 'type:cases-sub-case',
    wait_for_completion: true,
    refresh: true,
    body: {},
    conflicts: 'proceed',
  });
};

export const deleteComments = async (es: KibanaClient): Promise<void> => {
  await es.deleteByQuery({
    index: '.kibana',
    q: 'type:cases-comments',
    wait_for_completion: true,
    refresh: true,
    body: {},
    conflicts: 'proceed',
  });
};

export const deleteConfiguration = async (es: KibanaClient): Promise<void> => {
  await es.deleteByQuery({
    index: '.kibana',
    q: 'type:cases-configure',
    wait_for_completion: true,
    refresh: true,
    body: {},
    conflicts: 'proceed',
  });
};

export const deleteMappings = async (es: KibanaClient): Promise<void> => {
  await es.deleteByQuery({
    index: '.kibana',
    q: 'type:cases-connector-mappings',
    wait_for_completion: true,
    refresh: true,
    body: {},
    conflicts: 'proceed',
  });
};

export const superUserSpace1Auth = getAuthWithSuperUser();

/**
 * Returns an auth object with the specified space and user set as super user. The result can be passed to other utility
 * functions.
 */
export function getAuthWithSuperUser(space: string | null = 'space1'): {
  user: User;
  space: string | null;
} {
  return { user: superUser, space };
}

/**
 * Converts the space into the appropriate string for use by the actions remover utility object.
 */
export function getActionsSpace(space: string | null) {
  return space ?? 'default';
}

export const getSpaceUrlPrefix = (spaceId: string | undefined | null) => {
  return spaceId && spaceId !== 'default' ? `/s/${spaceId}` : ``;
};

interface OwnerEntity {
  owner: string;
}

export const ensureSavedObjectIsAuthorized = (
  entities: OwnerEntity[],
  numberOfExpectedCases: number,
  owners: string[]
) => {
  expect(entities.length).to.eql(numberOfExpectedCases);
  entities.forEach((entity) => expect(owners.includes(entity.owner)).to.be(true));
};

interface ConnectorMappingsSavedObject {
  'cases-connector-mappings': ConnectorMappings;
}

/**
 * Returns connector mappings saved objects from Elasticsearch directly.
 */
export const getConnectorMappingsFromES = async ({ es }: { es: KibanaClient }) => {
  const mappings: ApiResponse<estypes.SearchResponse<ConnectorMappingsSavedObject>> =
    await es.search({
      index: '.kibana',
      body: {
        query: {
          term: {
            type: {
              value: 'cases-connector-mappings',
            },
          },
        },
      },
    });

  return mappings;
};

interface ConfigureSavedObject {
  'cases-configure': ESCasesConfigureAttributes;
}

/**
 * Returns configure saved objects from Elasticsearch directly.
 */
export const getConfigureSavedObjectsFromES = async ({ es }: { es: KibanaClient }) => {
  const configure: ApiResponse<estypes.SearchResponse<ConfigureSavedObject>> = await es.search({
    index: '.kibana',
    body: {
      query: {
        term: {
          type: {
            value: 'cases-configure',
          },
        },
      },
    },
  });

  return configure;
};

export const getCaseSavedObjectsFromES = async ({ es }: { es: KibanaClient }) => {
  const configure: ApiResponse<estypes.SearchResponse<{ cases: ESCaseAttributes }>> =
    await es.search({
      index: '.kibana',
      body: {
        query: {
          term: {
            type: {
              value: 'cases',
            },
          },
        },
      },
    });

  return configure;
};

export const createCaseWithConnector = async ({
  supertest,
  configureReq = {},
  servicenowSimulatorURL,
  actionsRemover,
  auth = { user: superUser, space: null },
  createCaseReq = getPostCaseRequest(),
}: {
  supertest: SuperTest.SuperTest<SuperTest.Test>;
  servicenowSimulatorURL: string;
  actionsRemover: ActionsRemover;
  configureReq?: Record<string, unknown>;
  auth?: { user: User; space: string | null };
  createCaseReq?: CasePostRequest;
}): Promise<{
  postedCase: CaseResponse;
  connector: CreateConnectorResponse;
}> => {
  const connector = await createConnector({
    supertest,
    req: {
      ...getServiceNowConnector(),
      config: { apiUrl: servicenowSimulatorURL },
    },
    auth,
  });

  actionsRemover.add(auth.space ?? 'default', connector.id, 'action', 'actions');
  await createConfiguration(
    supertest,
    {
      ...getConfigurationRequest({
        id: connector.id,
        name: connector.name,
        type: connector.connector_type_id as ConnectorTypes,
      }),
      ...configureReq,
    },
    200,
    auth
  );

  const postedCase = await createCase(
    supertest,
    {
      ...createCaseReq,
      connector: {
        id: connector.id,
        name: connector.name,
        type: connector.connector_type_id,
        fields: {
          urgency: '2',
          impact: '2',
          severity: '2',
          category: 'software',
          subcategory: 'os',
        },
      } as CaseConnector,
    },
    200,
    auth
  );

  return { postedCase, connector };
};

export const createCase = async (
  supertest: SuperTest.SuperTest<SuperTest.Test>,
  params: CasePostRequest,
  expectedHttpCode: number = 200,
  auth: { user: User; space: string | null } = { user: superUser, space: null }
): Promise<CaseResponse> => {
  const { body: theCase } = await supertest
    .post(`${getSpaceUrlPrefix(auth.space)}${CASES_URL}`)
    .auth(auth.user.username, auth.user.password)
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
  auth = { user: superUser, space: null },
}: {
  supertest: SuperTest.SuperTest<SuperTest.Test>;
  caseIDs: string[];
  expectedHttpCode?: number;
  auth?: { user: User; space: string | null };
}) => {
  const { body } = await supertest
    .delete(`${getSpaceUrlPrefix(auth.space)}${CASES_URL}`)
    .auth(auth.user.username, auth.user.password)
    // we need to json stringify here because just passing in the array of case IDs will cause a 400 with Kibana
    // not being able to parse the array correctly. The format ids=["1", "2"] seems to work, which stringify outputs.
    .query({ ids: JSON.stringify(caseIDs) })
    .set('kbn-xsrf', 'true')
    .send()
    .expect(expectedHttpCode);

  return body;
};

export const createComment = async ({
  supertest,
  caseId,
  params,
  auth = { user: superUser, space: null },
  expectedHttpCode = 200,
}: {
  supertest: SuperTest.SuperTest<SuperTest.Test>;
  caseId: string;
  params: CommentRequest;
  auth?: { user: User; space: string | null };
  expectedHttpCode?: number;
}): Promise<CaseResponse> => {
  const { body: theCase } = await supertest
    .post(`${getSpaceUrlPrefix(auth.space)}${CASES_URL}/${caseId}/comments`)
    .auth(auth.user.username, auth.user.password)
    .set('kbn-xsrf', 'true')
    .send(params)
    .expect(expectedHttpCode);

  return theCase;
};

export const updateCase = async ({
  supertest,
  params,
  expectedHttpCode = 200,
  auth = { user: superUser, space: null },
}: {
  supertest: SuperTest.SuperTest<SuperTest.Test>;
  params: CasesPatchRequest;
  expectedHttpCode?: number;
  auth?: { user: User; space: string | null };
}): Promise<CaseResponse[]> => {
  const { body: cases } = await supertest
    .patch(`${getSpaceUrlPrefix(auth.space)}${CASES_URL}`)
    .auth(auth.user.username, auth.user.password)
    .set('kbn-xsrf', 'true')
    .send(params)
    .expect(expectedHttpCode);

  return cases;
};

export const getCaseUserActions = async ({
  supertest,
  caseID,
  expectedHttpCode = 200,
  auth = { user: superUser, space: null },
}: {
  supertest: SuperTest.SuperTest<SuperTest.Test>;
  caseID: string;
  expectedHttpCode?: number;
  auth?: { user: User; space: string | null };
}): Promise<CaseUserActionsResponse> => {
  const { body: userActions } = await supertest
    .get(`${getSpaceUrlPrefix(auth.space)}${getCaseUserActionUrl(caseID)}`)
    .auth(auth.user.username, auth.user.password)
    .expect(expectedHttpCode);
  return userActions;
};

export const deleteComment = async ({
  supertest,
  caseId,
  commentId,
  expectedHttpCode = 204,
  auth = { user: superUser, space: null },
}: {
  supertest: SuperTest.SuperTest<SuperTest.Test>;
  caseId: string;
  commentId: string;
  expectedHttpCode?: number;
  auth?: { user: User; space: string | null };
}): Promise<{} | Error> => {
  const { body: comment } = await supertest
    .delete(`${getSpaceUrlPrefix(auth.space)}${CASES_URL}/${caseId}/comments/${commentId}`)
    .set('kbn-xsrf', 'true')
    .auth(auth.user.username, auth.user.password)
    .expect(expectedHttpCode)
    .send();

  return comment;
};

export const deleteAllComments = async ({
  supertest,
  caseId,
  expectedHttpCode = 204,
  auth = { user: superUser, space: null },
}: {
  supertest: SuperTest.SuperTest<SuperTest.Test>;
  caseId: string;
  expectedHttpCode?: number;
  auth?: { user: User; space: string | null };
}): Promise<{} | Error> => {
  const { body: comment } = await supertest
    .delete(`${getSpaceUrlPrefix(auth.space)}${CASES_URL}/${caseId}/comments`)
    .set('kbn-xsrf', 'true')
    .auth(auth.user.username, auth.user.password)
    .expect(expectedHttpCode)
    .send();

  return comment;
};

export const getAllComments = async ({
  supertest,
  caseId,
  expectedHttpCode = 200,
  auth = { user: superUser, space: null },
}: {
  supertest: SuperTest.SuperTest<SuperTest.Test>;
  caseId: string;
  auth?: { user: User; space: string | null };
  expectedHttpCode?: number;
}): Promise<AllCommentsResponse> => {
  const { body: comments } = await supertest
    .get(`${getSpaceUrlPrefix(auth.space)}${CASES_URL}/${caseId}/comments`)
    .auth(auth.user.username, auth.user.password)
    .expect(expectedHttpCode);

  return comments;
};

export const getComment = async ({
  supertest,
  caseId,
  commentId,
  expectedHttpCode = 200,
  auth = { user: superUser, space: null },
}: {
  supertest: SuperTest.SuperTest<SuperTest.Test>;
  caseId: string;
  commentId: string;
  expectedHttpCode?: number;
  auth?: { user: User; space: string | null };
}): Promise<CommentResponse> => {
  const { body: comment } = await supertest
    .get(`${getSpaceUrlPrefix(auth.space)}${CASES_URL}/${caseId}/comments/${commentId}`)
    .auth(auth.user.username, auth.user.password)
    .expect(expectedHttpCode);

  return comment;
};

export const updateComment = async ({
  supertest,
  caseId,
  req,
  expectedHttpCode = 200,
  auth = { user: superUser, space: null },
}: {
  supertest: SuperTest.SuperTest<SuperTest.Test>;
  caseId: string;
  req: CommentPatchRequest;
  expectedHttpCode?: number;
  auth?: { user: User; space: string | null };
}): Promise<CaseResponse> => {
  const { body: res } = await supertest
    .patch(`${getSpaceUrlPrefix(auth.space)}${CASES_URL}/${caseId}/comments`)
    .set('kbn-xsrf', 'true')
    .send(req)
    .auth(auth.user.username, auth.user.password)
    .expect(expectedHttpCode);

  return res;
};

export const getConfiguration = async ({
  supertest,
  query = { owner: 'securitySolutionFixture' },
  expectedHttpCode = 200,
  auth = { user: superUser, space: null },
}: {
  supertest: SuperTest.SuperTest<SuperTest.Test>;
  query?: Record<string, unknown>;
  expectedHttpCode?: number;
  auth?: { user: User; space: string | null };
}): Promise<CasesConfigurationsResponse> => {
  const { body: configuration } = await supertest
    .get(`${getSpaceUrlPrefix(auth.space)}${CASE_CONFIGURE_URL}`)
    .auth(auth.user.username, auth.user.password)
    .set('kbn-xsrf', 'true')
    .query(query)
    .expect(expectedHttpCode);

  return configuration;
};

export const createConfiguration = async (
  supertest: SuperTest.SuperTest<SuperTest.Test>,
  req: CasesConfigureRequest = getConfigurationRequest(),
  expectedHttpCode: number = 200,
  auth: { user: User; space: string | null } = { user: superUser, space: null }
): Promise<CasesConfigureResponse> => {
  const { body: configuration } = await supertest
    .post(`${getSpaceUrlPrefix(auth.space)}${CASE_CONFIGURE_URL}`)
    .auth(auth.user.username, auth.user.password)
    .set('kbn-xsrf', 'true')
    .send(req)
    .expect(expectedHttpCode);

  return configuration;
};

export type CreateConnectorResponse = Omit<ActionResult, 'actionTypeId'> & {
  connector_type_id: string;
};

export const createConnector = async ({
  supertest,
  req,
  expectedHttpCode = 200,
  auth = { user: superUser, space: null },
}: {
  supertest: SuperTest.SuperTest<SuperTest.Test>;
  req: Record<string, unknown>;
  expectedHttpCode?: number;
  auth?: { user: User; space: string | null };
}): Promise<CreateConnectorResponse> => {
  const { body: connector } = await supertest
    .post(`${getSpaceUrlPrefix(auth.space)}/api/actions/connector`)
    .auth(auth.user.username, auth.user.password)
    .set('kbn-xsrf', 'true')
    .send(req)
    .expect(expectedHttpCode);

  return connector;
};

export const getCaseConnectors = async ({
  supertest,
  expectedHttpCode = 200,
  auth = { user: superUser, space: null },
}: {
  supertest: SuperTest.SuperTest<SuperTest.Test>;
  expectedHttpCode?: number;
  auth?: { user: User; space: string | null };
}): Promise<FindActionResult[]> => {
  const { body: connectors } = await supertest
    .get(`${getSpaceUrlPrefix(auth.space)}${CASE_CONFIGURE_CONNECTORS_URL}/_find`)
    .auth(auth.user.username, auth.user.password)
    .expect(expectedHttpCode);

  return connectors;
};

export const updateConfiguration = async (
  supertest: SuperTest.SuperTest<SuperTest.Test>,
  id: string,
  req: CasesConfigurePatch,
  expectedHttpCode: number = 200,
  auth: { user: User; space: string | null } = { user: superUser, space: null }
): Promise<CasesConfigureResponse> => {
  const { body: configuration } = await supertest
    .patch(`${getSpaceUrlPrefix(auth.space)}${CASE_CONFIGURE_URL}/${id}`)
    .auth(auth.user.username, auth.user.password)
    .set('kbn-xsrf', 'true')
    .send(req)
    .expect(expectedHttpCode);

  return configuration;
};

export const getAllCasesStatuses = async ({
  supertest,
  expectedHttpCode = 200,
  auth = { user: superUser, space: null },
  query = {},
}: {
  supertest: SuperTest.SuperTest<SuperTest.Test>;
  expectedHttpCode?: number;
  auth?: { user: User; space: string | null };
  query?: Record<string, unknown>;
}): Promise<CasesStatusResponse> => {
  const { body: statuses } = await supertest
    .get(`${getSpaceUrlPrefix(auth.space)}${CASE_STATUS_URL}`)
    .auth(auth.user.username, auth.user.password)
    .query({ ...query })
    .expect(expectedHttpCode);

  return statuses;
};

export const getCase = async ({
  supertest,
  caseId,
  includeComments = false,
  expectedHttpCode = 200,
  auth = { user: superUser, space: null },
}: {
  supertest: SuperTest.SuperTest<SuperTest.Test>;
  caseId: string;
  includeComments?: boolean;
  expectedHttpCode?: number;
  auth?: { user: User; space: string | null };
}): Promise<CaseResponse> => {
  const { body: theCase } = await supertest
    .get(
      `${getSpaceUrlPrefix(auth?.space)}${CASES_URL}/${caseId}?includeComments=${includeComments}`
    )
    .set('kbn-xsrf', 'true')
    .auth(auth.user.username, auth.user.password)
    .expect(expectedHttpCode);

  return theCase;
};

export const resolveCase = async ({
  supertest,
  caseId,
  includeComments = false,
  expectedHttpCode = 200,
  auth = { user: superUser, space: null },
}: {
  supertest: SuperTest.SuperTest<SuperTest.Test>;
  caseId: string;
  includeComments?: boolean;
  expectedHttpCode?: number;
  auth?: { user: User; space: string | null };
}): Promise<CaseResolveResponse> => {
  const { body: theResolvedCase } = await supertest
    .get(
      `${getSpaceUrlPrefix(
        auth?.space
      )}${CASES_URL}/${caseId}/resolve?includeComments=${includeComments}`
    )
    .set('kbn-xsrf', 'true')
    .auth(auth.user.username, auth.user.password)
    .expect(expectedHttpCode);

  return theResolvedCase;
};

export const findCases = async ({
  supertest,
  query = {},
  expectedHttpCode = 200,
  auth = { user: superUser, space: null },
}: {
  supertest: SuperTest.SuperTest<SuperTest.Test>;
  query?: Record<string, unknown>;
  expectedHttpCode?: number;
  auth?: { user: User; space: string | null };
}): Promise<CasesFindResponse> => {
  const { body: res } = await supertest
    .get(`${getSpaceUrlPrefix(auth.space)}${CASES_URL}/_find`)
    .auth(auth.user.username, auth.user.password)
    .query({ sortOrder: 'asc', ...query })
    .set('kbn-xsrf', 'true')
    .send()
    .expect(expectedHttpCode);

  return res;
};

export const getCasesByAlert = async ({
  supertest,
  alertID,
  query = {},
  expectedHttpCode = 200,
  auth = { user: superUser, space: null },
}: {
  supertest: SuperTest.SuperTest<SuperTest.Test>;
  alertID: string;
  query?: Record<string, unknown>;
  expectedHttpCode?: number;
  auth?: { user: User; space: string | null };
}): Promise<CasesByAlertId> => {
  const { body: res } = await supertest
    .get(`${getSpaceUrlPrefix(auth.space)}${CASES_URL}/alerts/${alertID}`)
    .auth(auth.user.username, auth.user.password)
    .query(query)
    .expect(expectedHttpCode);

  return res;
};

export const getTags = async ({
  supertest,
  query = {},
  expectedHttpCode = 200,
  auth = { user: superUser, space: null },
}: {
  supertest: SuperTest.SuperTest<SuperTest.Test>;
  query?: Record<string, unknown>;
  expectedHttpCode?: number;
  auth?: { user: User; space: string | null };
}): Promise<CasesFindResponse> => {
  const { body: res } = await supertest
    .get(`${getSpaceUrlPrefix(auth.space)}${CASE_TAGS_URL}`)
    .auth(auth.user.username, auth.user.password)
    .set('kbn-xsrf', 'true')
    .query({ ...query })
    .expect(expectedHttpCode);

  return res;
};

export const getReporters = async ({
  supertest,
  query = {},
  expectedHttpCode = 200,
  auth = { user: superUser, space: null },
}: {
  supertest: SuperTest.SuperTest<SuperTest.Test>;
  query?: Record<string, unknown>;
  expectedHttpCode?: number;
  auth?: { user: User; space: string | null };
}): Promise<CasesFindResponse> => {
  const { body: res } = await supertest
    .get(`${getSpaceUrlPrefix(auth.space)}${CASE_REPORTERS_URL}`)
    .auth(auth.user.username, auth.user.password)
    .set('kbn-xsrf', 'true')
    .query({ ...query })
    .expect(expectedHttpCode);

  return res;
};

export const pushCase = async ({
  supertest,
  caseId,
  connectorId,
  expectedHttpCode = 200,
  auth = { user: superUser, space: null },
}: {
  supertest: SuperTest.SuperTest<SuperTest.Test>;
  caseId: string;
  connectorId: string;
  expectedHttpCode?: number;
  auth?: { user: User; space: string | null };
}): Promise<CaseResponse> => {
  const { body: res } = await supertest
    .post(`${getSpaceUrlPrefix(auth.space)}${CASES_URL}/${caseId}/connector/${connectorId}/_push`)
    .auth(auth.user.username, auth.user.password)
    .set('kbn-xsrf', 'true')
    .send({})
    .expect(expectedHttpCode);

  return res;
};

export const getAlertsAttachedToCase = async ({
  supertest,
  caseId,
  expectedHttpCode = 200,
  auth = { user: superUser, space: null },
}: {
  supertest: SuperTest.SuperTest<SuperTest.Test>;
  caseId: string;
  expectedHttpCode?: number;
  auth?: { user: User; space: string | null };
}): Promise<AlertResponse> => {
  const { body: theCase } = await supertest
    .get(`${getSpaceUrlPrefix(auth?.space)}${CASES_URL}/${caseId}/alerts`)
    .auth(auth.user.username, auth.user.password)
    .expect(expectedHttpCode);

  return theCase;
};
