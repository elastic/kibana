/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CASES_URL } from '@kbn/cases-plugin/common';
import { Case, CaseSeverity, CaseStatuses } from '@kbn/cases-plugin/common/types/domain';
import type { CasePostRequest } from '@kbn/cases-plugin/common/types/api';
import { ConnectorTypes } from '@kbn/cases-plugin/common/types/domain';
import { CasesFindResponse } from '@kbn/cases-plugin/common/types/api';
import { kbnTestConfig, kibanaTestSuperuserServerless } from '@kbn/test';
import type { RoleCredentials } from '../../../shared/services';
import { FtrProviderContext } from '../../ftr_provider_context';

export interface User {
  username: string;
  password: string;
  description?: string;
  roles: string[];
}

export function SvlCasesApiServiceProvider({ getService }: FtrProviderContext) {
  const kbnServer = getService('kibanaServer');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const svlCommonApi = getService('svlCommonApi');

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
      roleAuthc: RoleCredentials,
      expectedHttpCode: number = 200
    ): Promise<Case> {
      const apiCall = supertestWithoutAuth.post(`${CASES_URL}`);

      const response = await apiCall
        .set(svlCommonApi.getInternalRequestHeader())
        .set(roleAuthc.apiKeyHeader)
        .send(params)
        .expect(expectedHttpCode);

      return response.body;
    },

    async findCases(
      {
        query = {},
        expectedHttpCode = 200,
        space = 'default',
      }: {
        query?: Record<string, unknown>;
        expectedHttpCode?: number;
        space?: string;
      },
      roleAuthc: RoleCredentials
    ): Promise<CasesFindResponse> {
      const { body: res } = await supertestWithoutAuth
        .get(`${this.getSpaceUrlPrefix(space)}${CASES_URL}/_find`)
        .set(svlCommonApi.getInternalRequestHeader())
        .set(roleAuthc.apiKeyHeader)
        .query({ sortOrder: 'asc', ...query })
        .send()
        .expect(expectedHttpCode);

      return res;
    },

    async getCase(
      {
        caseId,
        space = 'default',
        includeComments = false,
        expectedHttpCode = 200,
      }: {
        caseId: string;
        space?: string;
        includeComments?: boolean;
        expectedHttpCode?: number;
      },
      roleAuthc: RoleCredentials
    ): Promise<Case> {
      const { body: theCase } = await supertestWithoutAuth
        .get(
          `${this.getSpaceUrlPrefix(
            space
          )}${CASES_URL}/${caseId}?includeComments=${includeComments}`
        )
        .set(svlCommonApi.getInternalRequestHeader())
        .set(roleAuthc.apiKeyHeader)
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
