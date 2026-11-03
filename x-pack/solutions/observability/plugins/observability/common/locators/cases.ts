/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LocatorDefinition } from '@kbn/share-plugin/common';
import { addSpaceIdToPath } from '@kbn/core-spaces-common';
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
const TOP_LEVEL_CASES_PATH = '/app/cases';

interface CasesLocatorOptions {
  /** Cases runs as the single top-level app at `/app/cases`. */
  topLevelAppEnabled?: boolean;
}

const getCasesLocation = (
  { spaceId, basePath }: CasesOverviewLocatorParams,
  { topLevelAppEnabled = false }: CasesLocatorOptions
) => {
  const casesPath = topLevelAppEnabled ? TOP_LEVEL_CASES_PATH : CASE_DETAIL_PATH;
  return {
    app: topLevelAppEnabled ? 'cases' : 'observability',
    path: spaceId
      ? addSpaceIdToPath(basePath ?? '', spaceId, casesPath)
      : (basePath ?? '') + casesPath,
  };
};

export const CaseDetailsLocatorDefinition = (
  options: CasesLocatorOptions = {}
): LocatorDefinition<CasesLocatorParams> => ({
  id: casesDetailLocatorID,
  getLocation: async (params: CasesLocatorParams) => {
    const { app, path } = getCasesLocation(params, options);
    return { app, path: path.concat('/', params.caseId), state: {} };
  },
});

export const CasesOverviewLocatorDefinition = (
  options: CasesLocatorOptions = {}
): LocatorDefinition<CasesOverviewLocatorParams> => ({
  id: casesOverviewLocatorID,
  getLocation: async (params: CasesOverviewLocatorParams) => ({
    ...getCasesLocation(params, options),
    state: {},
  }),
});
