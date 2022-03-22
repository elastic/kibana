/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pMap from 'p-map';
import { CasePostRequest } from '../../../../plugins/cases/common/api';
import { createCase, deleteAllCaseItems } from '../../../cases_api_integration/common/lib/utils';
import { FtrProviderContext } from '../../ftr_provider_context';
import { generateRandomCaseWithoutConnector } from './helpers';

export function CasesAPIServiceProvider({ getService }: FtrProviderContext) {
  const kbnSupertest = getService('supertest');
  const es = getService('es');

  return {
    async createCaseWithData(overwrites: { title?: string } = {}) {
      const caseData = {
        ...generateRandomCaseWithoutConnector(),
        ...overwrites,
      } as CasePostRequest;
      await createCase(kbnSupertest, caseData);
    },

    async createNthRandomCases(amount: number = 3) {
      const cases: CasePostRequest[] = Array.from(
        { length: amount },
        () => generateRandomCaseWithoutConnector() as CasePostRequest
      );
      await pMap(
        cases,
        (caseData) => {
          return createCase(kbnSupertest, caseData);
        },
        { concurrency: 4 }
      );
    },

    async deleteAllCases() {
      deleteAllCaseItems(es);
    },
  };
}
