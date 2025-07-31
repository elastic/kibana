/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LocatorDefinition } from '@kbn/share-plugin/common';
import { addSpaceIdToPath } from '@kbn/spaces-plugin/common';
import { type SerializableRecord } from '@kbn/utility-types';
import { casesDetailLocatorID, casesOverviewLocatorID } from '..';

export interface CasesOverviewLocatorParams extends SerializableRecord {
  spaceId?: string;
  basePath?: string;
}

export interface CasesLocatorParams extends CasesOverviewLocatorParams {
  caseId: string;
}

export const CASE_DETAIL_PATH = '/app/observability/cases';

export const CaseDetailsLocatorDefinition = (): LocatorDefinition<CasesLocatorParams> => ({
  id: casesDetailLocatorID,
  getLocation: async (params: CasesLocatorParams) => {
    const { spaceId, basePath, caseId } = params;
    const path = (
      spaceId
        ? addSpaceIdToPath(basePath ?? '', spaceId, CASE_DETAIL_PATH)
        : (basePath ?? '') + CASE_DETAIL_PATH
    ).concat('/', caseId);
    return {
      app: 'observability',
      path,
      state: {},
    };
  },
});

export const CasesOverviewLocatorDefinition =
  (): LocatorDefinition<CasesOverviewLocatorParams> => ({
    id: casesOverviewLocatorID,
    getLocation: async (params: CasesOverviewLocatorParams) => {
      const { spaceId, basePath } = params;
      const path = spaceId
        ? addSpaceIdToPath(basePath ?? '', spaceId, CASE_DETAIL_PATH)
        : (basePath ?? '') + CASE_DETAIL_PATH;
      return {
        app: 'observability',
        path,
        state: {},
      };
    },
  });
