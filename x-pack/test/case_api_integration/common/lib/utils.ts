/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
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
} from '../../../../plugins/cases/common/api';
import { postCollectionReq, postCommentGenAlertReq } from './mock';
import { getSubCasesUrl } from '../../../../plugins/cases/common/api/helpers';
import { ContextTypeGeneratedAlertType } from '../../../../plugins/cases/server/connectors';
import { SignalHit } from '../../../../plugins/security_solution/server/lib/detection_engine/signals/types';

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

export const removeServerGeneratedPropertiesFromConfigure = (
  config: Partial<CasesConfigureResponse>
): Partial<CasesConfigureResponse> => {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  const { created_at, updated_at, version, ...rest } = config;
  return rest;
};

export const deleteAllCaseItems = async (es: KibanaClient) => {
  await Promise.all([
    deleteCases(es),
    deleteSubCases(es),
    deleteCasesUserActions(es),
    deleteComments(es),
    deleteConfiguration(es),
  ]);
};

export const deleteCasesUserActions = async (es: KibanaClient): Promise<void> => {
  await es.deleteByQuery({
    index: '.kibana',
    q: 'type:cases-user-actions',
    wait_for_completion: true,
    refresh: true,
    body: {},
  });
};

export const deleteCases = async (es: KibanaClient): Promise<void> => {
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
export const deleteSubCases = async (es: KibanaClient): Promise<void> => {
  await es.deleteByQuery({
    index: '.kibana',
    q: 'type:cases-sub-case',
    wait_for_completion: true,
    refresh: true,
    body: {},
  });
};

export const deleteComments = async (es: KibanaClient): Promise<void> => {
  await es.deleteByQuery({
    index: '.kibana',
    q: 'type:cases-comments',
    wait_for_completion: true,
    refresh: true,
    body: {},
  });
};

export const deleteConfiguration = async (es: KibanaClient): Promise<void> => {
  await es.deleteByQuery({
    index: '.kibana',
    q: 'type:cases-configure',
    wait_for_completion: true,
    refresh: true,
    body: {},
  });
};
