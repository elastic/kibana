/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { generatePath } from 'react-router-dom';
import { useCallback } from 'react';
import { CASES_APP_ID } from '@kbn/cases-plugin/common';
import { observabilityAppId } from '../../common';
import { useKibana } from '../utils/kibana_react';

export type NavigateToCaseView = (pathParams: { caseId: string }) => void;

const CASE_DEEP_LINK_ID = 'cases';

const generateCaseViewPath = (caseId: string): string => {
  return generatePath('/:caseId', { caseId });
};

export const useCaseViewNavigation = () => {
  const {
    application: { navigateToApp },
    cases,
  } = useKibana().services;
  const topLevelAppEnabled = cases?.config.topLevelAppEnabled ?? false;

  const navigateToCaseView = useCallback<NavigateToCaseView>(
    (pathParams) =>
      topLevelAppEnabled
        ? navigateToApp(CASES_APP_ID, { path: generateCaseViewPath(pathParams.caseId) })
        : navigateToApp(observabilityAppId, {
            deepLinkId: CASE_DEEP_LINK_ID,
            path: generateCaseViewPath(pathParams.caseId),
          }),
    [navigateToApp, topLevelAppEnabled]
  );

  return { navigateToCaseView };
};
