/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type SuperTest from 'supertest';
import { CASES_URL } from '@kbn/cases-plugin/common';
import { Case, CaseSeverity, CaseStatuses } from '@kbn/cases-plugin/common/types/domain';
import type { CasePostRequest } from '@kbn/cases-plugin/common/types/api';
import { ConnectorTypes } from '@kbn/cases-plugin/common/types/domain';
import { CasesFindResponse } from '@kbn/cases-plugin/common/types/api';
import { kbnTestConfig, kibanaTestSuperuserServerless } from '@kbn/test';
import { FtrProviderContext } from '../../ftr_provider_context';

export interface User {
  username: string;
  password: string;
  description?: string;
  roles: string[];
}

export function SvlCasesApiServiceProvider({ getService }: FtrProviderContext) {
  const kbnServer = getService('kibanaServer');
  const supertest = getService('supertest');

  const superUser: User = {
    username: 'superuser',
    password: 'superuser',
    roles: ['superuser'],
  };

  const defaultUser = {
    email: null,
    full_name: null,
    username: kbnTestConfig.getUrlParts(kibanaTestSuperuserServerless).username,
  };

  /**
   * A null filled user will occur when the security plugin is disabled
   */
  const nullUser = { email: null, full_name: null, username: null };

  const findCommon = {
    page: 1,
    per_page: 20,
    total: 0,
    count_open_cases: 0,
    count_closed_cases: 0,
    count_in_progress_cases: 0,
  };

  const findCasesResp: CasesFindResponse = {
    ...findCommon,
    cases: [],
  };

  return {
    setupAuth({
      apiCall,
      headers,
      auth,
    }: {
      apiCall: SuperTest.Test;
      headers: Record<string, unknown>;
      auth?: { user: User; space: string | null } | null;
    }): SuperTest.Test {
      if (!Object.hasOwn(headers, 'Cookie') && auth != null) {
        return apiCall.auth(auth.user.username, auth.user.password);
      }

      return apiCall;
    },

    getSpaceUrlPrefix(spaceId: string | undefined | null) {
      return spaceId && spaceId !== 'default' ? `/s/${spaceId}` : ``;
    },

    async deleteAllCaseItems() {
      await Promise.all([
        this.deleteCases(),
        this.deleteCasesUserActions(),
        this.deleteComments(),
        this.deleteConfiguration(),
        this.deleteMappings(),
      ]);
    },

    async deleteCasesUserActions(): Promise<void> {
      await kbnServer.savedObjects.clean({ types: ['cases-user-actions'] });
    },

    async deleteCases(): Promise<void> {
      await kbnServer.savedObjects.clean({ types: ['cases'] });
    },

    async deleteComments(): Promise<void> {
      await kbnServer.savedObjects.clean({ types: ['cases-comments'] });
    },

    async deleteConfiguration(): Promise<void> {
      await kbnServer.savedObjects.clean({ types: ['cases-configure'] });
    },

    async deleteMappings(): Promise<void> {
      await kbnServer.savedObjects.clean({ types: ['cases-connector-mappings'] });
    },

    /**
     * Return a request for creating a case.
     */
    getPostCaseRequest(owner: string, req?: Partial<CasePostRequest>): CasePostRequest {
      return {
        ...this.getPostCaseReq(owner),
        ...req,
      };
    },

    postCaseResp(owner: string, id?: string | null, req?: CasePostRequest): Partial<Case> {
      const request = req ?? this.getPostCaseReq(owner);
      return {
        ...request,
        ...(id != null ? { id } : {}),
        comments: [],
        duration: null,
        severity: request.severity ?? CaseSeverity.LOW,
        totalAlerts: 0,
        totalComment: 0,
        closed_by: null,
        created_by: defaultUser,
        external_service: null,
        status: CaseStatuses.open,
        updated_by: null,
        category: null,
        customFields: [],
      };
    },

    async createCase(
      params: CasePostRequest,
      expectedHttpCode: number = 200,
      auth: { user: User; space: string | null } | null = { user: superUser, space: null },
      headers: Record<string, unknown> = {}
    ): Promise<Case> {
      const apiCall = supertest.post(`${CASES_URL}`);

      this.setupAuth({ apiCall, headers, auth });

      const response = await apiCall
        .set('kbn-xsrf', 'foo')
        .set('x-elastic-internal-origin', 'foo')
        .set(headers)
        .send(params)
        .expect(expectedHttpCode);

      return response.body;
    },

    async findCases({
      query = {},
      expectedHttpCode = 200,
      auth = { user: superUser, space: null },
    }: {
      query?: Record<string, unknown>;
      expectedHttpCode?: number;
      auth?: { user: User; space: string | null };
    }): Promise<CasesFindResponse> {
      const { body: res } = await supertest
        .get(`${this.getSpaceUrlPrefix(auth.space)}${CASES_URL}/_find`)
        .auth(auth.user.username, auth.user.password)
        .query({ sortOrder: 'asc', ...query })
        .set('kbn-xsrf', 'foo')
        .set('x-elastic-internal-origin', 'foo')
        .send()
        .expect(expectedHttpCode);

      return res;
    },

    async getCase({
      caseId,
      includeComments = false,
      expectedHttpCode = 200,
      auth = { user: superUser, space: null },
    }: {
      caseId: string;
      includeComments?: boolean;
      expectedHttpCode?: number;
      auth?: { user: User; space: string | null };
    }): Promise<Case> {
      const { body: theCase } = await supertest
        .get(
          `${this.getSpaceUrlPrefix(
            auth?.space
          )}${CASES_URL}/${caseId}?includeComments=${includeComments}`
        )
        .set('kbn-xsrf', 'foo')
        .set('x-elastic-internal-origin', 'foo')
        .auth(auth.user.username, auth.user.password)
        .expect(expectedHttpCode);

      return theCase;
    },

    getFindCasesResp() {
      return findCasesResp;
    },

    getPostCaseReq(owner: string): CasePostRequest {
      return {
        description: 'This is a brand new case of a bad meanie defacing data',
        title: 'Super Bad Observability Issue',
        tags: ['defacement'],
        severity: CaseSeverity.LOW,
        connector: {
          id: 'none',
          name: 'none',
          type: ConnectorTypes.none,
          fields: null,
        },
        settings: {
          syncAlerts: true,
        },
        owner,
        assignees: [],
      };
    },

    getNullUser() {
      return nullUser;
    },
  };
}
