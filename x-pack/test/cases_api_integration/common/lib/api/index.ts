/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { TransportResult } from '@elastic/elasticsearch';
import type { Client } from '@elastic/elasticsearch';
import { GetResponse } from '@elastic/elasticsearch/lib/api/types';
import { ALERTING_CASES_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server/src/saved_objects_index_pattern';

import type SuperTest from 'supertest';
import {
  CASES_INTERNAL_URL,
  CASES_URL,
  CASE_COMMENT_SAVED_OBJECT,
  CASE_CONFIGURE_SAVED_OBJECT,
  CASE_REPORTERS_URL,
  CASE_SAVED_OBJECT,
  CASE_STATUS_URL,
  CASE_TAGS_URL,
  CASE_USER_ACTION_SAVED_OBJECT,
  INTERNAL_CASE_METRICS_URL,
  INTERNAL_GET_CASE_CATEGORIES_URL,
} from '@kbn/cases-plugin/common/constants';
import { CaseMetricsFeature } from '@kbn/cases-plugin/common';
import type { SingleCaseMetricsResponse, CasesMetricsResponse } from '@kbn/cases-plugin/common';
import { SignalHit } from '@kbn/security-solution-plugin/server/lib/detection_engine/rule_types/types';
import { CasePersistedAttributes } from '@kbn/cases-plugin/server/common/types/case';
import type { SavedObjectsRawDocSource } from '@kbn/core/server';
import type { ConfigurationPersistedAttributes } from '@kbn/cases-plugin/server/common/types/configure';
import {
  ConnectorMappingsAttributes,
  Case,
  Cases,
  CaseStatuses,
} from '@kbn/cases-plugin/common/types/domain';
import {
  AlertResponse,
  CaseResolveResponse,
  CasesBulkGetResponse,
  CasesFindResponse,
  CasesPatchRequest,
  CasesStatusResponse,
  GetRelatedCasesByAlertResponse,
} from '@kbn/cases-plugin/common/types/api';
import { User } from '../authentication/types';
import { superUser } from '../authentication/users';
import { getSpaceUrlPrefix, setupAuth } from './helpers';

export * from './attachments';
export * from './case';
export * from './connectors';
export * from './user_actions';
export * from './user_profiles';
export * from './omit';
export * from './configuration';
export * from './files';
export { getSpaceUrlPrefix } from './helpers';

function toArray<T>(input: T | T[]): T[] {
  if (Array.isArray(input)) {
    return input;
  }
  return [input];
}

/**
 * Query Elasticsearch for a set of signals within a set of indices
 */
// TODO: fix this to use new API/schema
export const getSignalsWithES = async ({
  es,
  indices,
  ids,
}: {
  es: Client;
  indices: string | string[];
  ids: string | string[];
}): Promise<Map<string, Map<string, estypes.SearchHit<SignalHit>>>> => {
  const signals: TransportResult<estypes.SearchResponse<SignalHit>, unknown> = await es.search(
    {
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
    },
    { meta: true }
  );

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
 * Sets the status of some cases.
 */
export const setStatus = async ({
  supertest,
  cases,
}: {
  supertest: SuperTest.SuperTest<SuperTest.Test>;
  cases: SetStatusCasesParams[];
}): Promise<Cases> => {
  const { body }: { body: Cases } = await supertest
    .patch(CASES_URL)
    .set('kbn-xsrf', 'true')
    .send({ cases })
    .expect(200);
  return body;
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

export const deleteAllCaseItems = async (es: Client) => {
  await Promise.all([
    deleteCasesByESQuery(es),
    deleteCasesUserActions(es),
    deleteComments(es),
    deleteConfiguration(es),
    deleteMappings(es),
  ]);
};

export const deleteCasesUserActions = async (es: Client): Promise<void> => {
  await es.deleteByQuery({
    index: ALERTING_CASES_SAVED_OBJECT_INDEX,
    q: 'type:cases-user-actions',
    wait_for_completion: true,
    refresh: true,
    body: {},
    conflicts: 'proceed',
  });
};

export const deleteCasesByESQuery = async (es: Client): Promise<void> => {
  await es.deleteByQuery({
    index: ALERTING_CASES_SAVED_OBJECT_INDEX,
    q: 'type:cases',
    wait_for_completion: true,
    refresh: true,
    body: {},
    conflicts: 'proceed',
  });
};

export const deleteComments = async (es: Client): Promise<void> => {
  await es.deleteByQuery({
    index: ALERTING_CASES_SAVED_OBJECT_INDEX,
    q: 'type:cases-comments',
    wait_for_completion: true,
    refresh: true,
    body: {},
    conflicts: 'proceed',
  });
};

export const deleteConfiguration = async (es: Client): Promise<void> => {
  await es.deleteByQuery({
    index: ALERTING_CASES_SAVED_OBJECT_INDEX,
    q: 'type:cases-configure',
    wait_for_completion: true,
    refresh: true,
    body: {},
    conflicts: 'proceed',
  });
};

export const deleteMappings = async (es: Client): Promise<void> => {
  await es.deleteByQuery({
    index: ALERTING_CASES_SAVED_OBJECT_INDEX,
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
  'cases-connector-mappings': ConnectorMappingsAttributes;
}

/**
 * Returns connector mappings saved objects from Elasticsearch directly.
 */
export const getConnectorMappingsFromES = async ({ es }: { es: Client }) => {
  const mappings: TransportResult<
    estypes.SearchResponse<ConnectorMappingsSavedObject>,
    unknown
  > = await es.search(
    {
      index: ALERTING_CASES_SAVED_OBJECT_INDEX,
      body: {
        query: {
          term: {
            type: {
              value: 'cases-connector-mappings',
            },
          },
        },
      },
    },
    { meta: true }
  );

  return mappings;
};

interface ConfigureSavedObject {
  'cases-configure': ConfigurationPersistedAttributes;
}

/**
 * Returns configure saved objects from Elasticsearch directly.
 */
export const getConfigureSavedObjectsFromES = async ({ es }: { es: Client }) => {
  const configure: TransportResult<
    estypes.SearchResponse<ConfigureSavedObject>,
    unknown
  > = await es.search(
    {
      index: ALERTING_CASES_SAVED_OBJECT_INDEX,
      body: {
        query: {
          term: {
            type: {
              value: CASE_CONFIGURE_SAVED_OBJECT,
            },
          },
        },
      },
    },
    { meta: true }
  );

  return configure;
};

export const getCaseSavedObjectsFromES = async ({ es }: { es: Client }) => {
  const cases: TransportResult<
    estypes.SearchResponse<{ cases: CasePersistedAttributes }>,
    unknown
  > = await es.search(
    {
      index: ALERTING_CASES_SAVED_OBJECT_INDEX,
      body: {
        query: {
          term: {
            type: {
              value: CASE_SAVED_OBJECT,
            },
          },
        },
      },
    },
    { meta: true }
  );

  return cases;
};

export const getCaseCommentSavedObjectsFromES = async ({ es }: { es: Client }) => {
  const comments: TransportResult<
    estypes.SearchResponse<{ ['cases-comments']: CasePersistedAttributes }>,
    unknown
  > = await es.search(
    {
      index: ALERTING_CASES_SAVED_OBJECT_INDEX,
      body: {
        query: {
          term: {
            type: {
              value: CASE_COMMENT_SAVED_OBJECT,
            },
          },
        },
      },
    },
    { meta: true }
  );

  return comments;
};

export const getCaseUserActionsSavedObjectsFromES = async ({ es }: { es: Client }) => {
  const userActions: TransportResult<
    estypes.SearchResponse<{ ['cases-user-actions']: CasePersistedAttributes }>,
    unknown
  > = await es.search(
    {
      index: ALERTING_CASES_SAVED_OBJECT_INDEX,
      body: {
        query: {
          term: {
            type: {
              value: CASE_USER_ACTION_SAVED_OBJECT,
            },
          },
        },
      },
    },
    { meta: true }
  );

  return userActions;
};

export const updateCase = async ({
  supertest,
  params,
  expectedHttpCode = 200,
  auth = { user: superUser, space: null },
  headers = {},
}: {
  supertest: SuperTest.SuperTest<SuperTest.Test>;
  params: CasesPatchRequest;
  expectedHttpCode?: number;
  auth?: { user: User; space: string | null } | null;
  headers?: Record<string, unknown>;
}): Promise<Case[]> => {
  const apiCall = supertest.patch(`${getSpaceUrlPrefix(auth?.space)}${CASES_URL}`);

  setupAuth({ apiCall, headers, auth });

  const { body: cases } = await apiCall
    .set('kbn-xsrf', 'true')
    .set('x-elastic-internal-origin', 'foo')
    .set(headers)
    .send(params)
    .expect(expectedHttpCode);

  return cases;
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
}): Promise<Case> => {
  const { body: theCase } = await supertest
    .get(
      `${getSpaceUrlPrefix(auth?.space)}${CASES_URL}/${caseId}?includeComments=${includeComments}`
    )
    .set('kbn-xsrf', 'true')
    .set('x-elastic-internal-origin', 'foo')
    .auth(auth.user.username, auth.user.password)
    .expect(expectedHttpCode);

  return theCase;
};

export const getCaseMetrics = async ({
  supertest,
  caseId,
  features,
  expectedHttpCode = 200,
  auth = { user: superUser, space: null },
}: {
  supertest: SuperTest.SuperTest<SuperTest.Test>;
  caseId: string;
  features: CaseMetricsFeature[] | CaseMetricsFeature;
  expectedHttpCode?: number;
  auth?: { user: User; space: string | null };
}): Promise<SingleCaseMetricsResponse> => {
  const { body: metricsResponse } = await supertest
    .get(`${getSpaceUrlPrefix(auth?.space)}${INTERNAL_CASE_METRICS_URL}/${caseId}`)
    .query({ features })
    .auth(auth.user.username, auth.user.password)
    .expect(expectedHttpCode);

  return metricsResponse;
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
}): Promise<GetRelatedCasesByAlertResponse> => {
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

export const getCategories = async ({
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
    .get(`${getSpaceUrlPrefix(auth.space)}${INTERNAL_GET_CASE_CATEGORIES_URL}`)
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
  headers = {},
}: {
  supertest: SuperTest.SuperTest<SuperTest.Test>;
  caseId: string;
  connectorId: string;
  expectedHttpCode?: number;
  auth?: { user: User; space: string | null } | null;
  headers?: Record<string, unknown>;
}): Promise<Case> => {
  const apiCall = supertest.post(
    `${getSpaceUrlPrefix(auth?.space)}${CASES_URL}/${caseId}/connector/${connectorId}/_push`
  );

  setupAuth({ apiCall, headers, auth });

  const { body: res } = await apiCall
    .set('kbn-xsrf', 'true')
    .set(headers)
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

/**
 * Extracts the warning value a warning header that is formatted according to RFC 7234.
 * For example for the string 299 Kibana-8.1.0 "Deprecation endpoint", the return value is Deprecation endpoint.
 *
 */
export const extractWarningValueFromWarningHeader = (warningHeader: string) => {
  const firstQuote = warningHeader.indexOf('"');
  const lastQuote = warningHeader.length - 1;
  const warningValue = warningHeader.substring(firstQuote + 1, lastQuote);
  return warningValue;
};

export const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const calculateDuration = (closedAt: string | null, createdAt: string | null): number => {
  if (closedAt == null || createdAt == null) {
    throw new Error('Dates are null');
  }

  const createdAtMillis = new Date(createdAt).getTime();
  const closedAtMillis = new Date(closedAt).getTime();

  if (isNaN(createdAtMillis) || isNaN(closedAtMillis)) {
    throw new Error('Dates are invalid');
  }

  if (closedAtMillis < createdAtMillis) {
    throw new Error('Closed date is earlier than created date');
  }

  return Math.floor(Math.abs((closedAtMillis - createdAtMillis) / 1000));
};

export const getCasesMetrics = async ({
  supertest,
  features,
  query = {},
  expectedHttpCode = 200,
  auth = { user: superUser, space: null },
}: {
  supertest: SuperTest.SuperTest<SuperTest.Test>;
  features: string[] | string;
  query?: Record<string, unknown>;
  expectedHttpCode?: number;
  auth?: { user: User; space: string | null };
}): Promise<CasesMetricsResponse> => {
  const { body: metricsResponse } = await supertest
    .get(`${getSpaceUrlPrefix(auth?.space)}${INTERNAL_CASE_METRICS_URL}`)
    .query({ features, ...query })
    .auth(auth.user.username, auth.user.password)
    .expect(expectedHttpCode);

  return metricsResponse;
};

export const getSOFromKibanaIndex = async ({
  es,
  soType,
  soId,
}: {
  es: Client;
  soType: string;
  soId: string;
}) => {
  const esResponse = await es.get<SavedObjectsRawDocSource>(
    {
      index: ALERTING_CASES_SAVED_OBJECT_INDEX,
      id: `${soType}:${soId}`,
    },
    { meta: true }
  );

  return esResponse;
};

export const getReferenceFromEsResponse = (
  esResponse: TransportResult<GetResponse<SavedObjectsRawDocSource>, unknown>,
  id: string
) => esResponse.body._source?.references?.find((r) => r.id === id);

export const bulkGetCases = async ({
  supertest,
  ids,
  fields,
  expectedHttpCode = 200,
  auth = { user: superUser, space: null },
}: {
  supertest: SuperTest.SuperTest<SuperTest.Test>;
  ids: string[];
  fields?: string[];
  expectedHttpCode?: number;
  auth?: { user: User; space: string | null };
}): Promise<CasesBulkGetResponse> => {
  const { body: res } = await supertest
    .post(`${getSpaceUrlPrefix(auth.space)}${CASES_INTERNAL_URL}/_bulk_get`)
    .auth(auth.user.username, auth.user.password)
    .set('kbn-xsrf', 'true')
    .send({ ids, fields })
    .expect(expectedHttpCode);

  return res;
};
