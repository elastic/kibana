/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CREATE_CASES_CAPABILITY,
  READ_CASES_CAPABILITY,
  CASES_SETTINGS_CAPABILITY,
} from '@kbn/cases-plugin/common';
import { getCasesDeepLinks } from '@kbn/cases-plugin/public';
import { CASES_FEATURE_ID, CASES_PATH, SecurityPageName } from '../../common/constants';
import type { LinkItem } from '../common/links/types';

export const getCasesLinks = (templatesEnabled: boolean = false) => {
  const casesLinks = getCasesDeepLinks<LinkItem>({
    basePath: CASES_PATH,
    templatesEnabled,
    extend: {
      [SecurityPageName.case]: {
        globalNavPosition: 6,
        capabilities: [`${CASES_FEATURE_ID}.${READ_CASES_CAPABILITY}`],
      },
      [SecurityPageName.caseConfigure]: {
        capabilities: [`${CASES_FEATURE_ID}.${CASES_SETTINGS_CAPABILITY}`],
        sideNavDisabled: true,
      },
      [SecurityPageName.caseCreate]: {
        capabilities: [`${CASES_FEATURE_ID}.${CREATE_CASES_CAPABILITY}`],
        sideNavDisabled: true,
      },
      [SecurityPageName.caseTemplates]: {
        capabilities: [`${CASES_FEATURE_ID}.${CASES_SETTINGS_CAPABILITY}`],
      },
    },
  });

  const { id, deepLinks, ...rest } = casesLinks;

  return {
    ...rest,
    id: SecurityPageName.case,
    links: deepLinks as LinkItem[],
  };
};

// Default export for backward compatibility
export const links = getCasesLinks(false);
