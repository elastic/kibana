/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pMap from 'p-map';
import {
  Case,
  CaseSeverity,
  CaseStatuses,
  Configuration,
} from '@kbn/cases-plugin/common/types/domain';
import { CasePostRequest } from '@kbn/cases-plugin/common/types/api';
import {
  createCase as createCaseAPI,
  deleteAllCaseItems,
  createComment,
  updateCase,
  getCase,
  createConfiguration,
  getConfigurationRequest,
} from '../../../cases_api_integration/common/lib/api';
import {
  loginUsers,
  suggestUserProfiles,
} from '../../../cases_api_integration/common/lib/api/user_profiles';
import { User } from '../../../cases_api_integration/common/lib/authentication/types';

import { FtrProviderContext } from '../../ftr_provider_context';
import { generateRandomCaseWithoutConnector } from './helpers';

type GetParams<T extends (...args: any) => any> = Omit<Parameters<T>[0], 'supertest'>;

export function CasesAPIServiceProvider({ getService }: FtrProviderContext) {
  const kbnSupertest = getService('supertest');
  const es = getService('es');
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  const getSuperTest = (hasAuth: boolean) => (hasAuth ? supertestWithoutAuth : kbnSupertest);

  const createApiFunction =
    <T extends (...args: any) => any>(apiFunc: T) =>
    (params: GetParams<typeof apiFunc>): ReturnType<typeof apiFunc> => {
      const supertest = getSuperTest(Boolean(params.auth));
      return apiFunc({ supertest, ...params });
    };

  return {
    async createCase(overwrites: Partial<CasePostRequest> = {}): Promise<Case> {
      const caseData = {
        ...generateRandomCaseWithoutConnector(),
        ...overwrites,
      } as CasePostRequest;

      return createCaseAPI(kbnSupertest, caseData);
    },

    async createNthRandomCases(amount: number = 3, owner?: string) {
      const cases: CasePostRequest[] = Array.from(
        { length: amount },
        () => generateRandomCaseWithoutConnector(owner) as CasePostRequest
      );

      await pMap(cases, async (caseData) => createCaseAPI(kbnSupertest, caseData), {
        concurrency: 4,
      });
    },

    async deleteAllCases() {
      await deleteAllCaseItems(es);
    },

    createAttachment: createApiFunction(createComment),

    async setStatus(
      caseId: string,
      caseVersion: string,
      newStatus: 'open' | 'in-progress' | 'closed'
    ) {
      await updateCase({
        supertest: kbnSupertest,
        params: {
          cases: [
            {
              id: caseId,
              version: caseVersion,
              status: CaseStatuses[newStatus],
            },
          ],
        },
      });
    },

    async activateUserProfiles(users: User[]) {
      await loginUsers({
        supertest: supertestWithoutAuth,
        users,
      });
    },

    async suggestUserProfiles(options: Parameters<typeof suggestUserProfiles>[0]['req']) {
      return suggestUserProfiles({ supertest: kbnSupertest, req: options });
    },

    getCase: createApiFunction(getCase),

    async generateUserActions({
      caseId,
      caseVersion,
      totalUpdates = 1,
    }: {
      caseId: string;
      caseVersion: string;
      totalUpdates: number;
    }) {
      let latestVersion = caseVersion;
      const severities = Object.values(CaseSeverity);
      const statuses = Object.values(CaseStatuses);

      for (let index = 0; index < totalUpdates; index++) {
        const severity = severities[index % severities.length];
        const status = statuses[index % statuses.length];

        const theCase = await updateCase({
          supertest: kbnSupertest,
          params: {
            cases: [
              {
                id: caseId,
                version: latestVersion,
                title: `Title update ${index}`,
                description: `Desc update ${index}`,
                severity,
                status,
                tags: [`tag-${index}`],
              },
            ],
          },
        });

        latestVersion = theCase[0].version;
      }
    },

    async createConfigWithCustomFields({
      customFields,
      owner,
    }: {
      customFields: Configuration['customFields'];
      owner: string;
    }) {
      return createConfiguration(
        kbnSupertest,
        getConfigurationRequest({
          overrides: {
            customFields,
            owner,
          },
        })
      );
    },
  };
}
