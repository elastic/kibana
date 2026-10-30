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
import {
  CASES_FEATURE_ID,
  CASES_FEATURE_ID_V4,
  CASES_PATH,
  SecurityPageName,
} from '../../common/constants';
import type { LinkItem } from '../common/links/types';

const casesLinks = getCasesDeepLinks<LinkItem>({
  basePath: CASES_PATH,
  extend: {
    // With the top-level Cases app on, only casesV4 capabilities reach the browser. The links stay
    // so existing Security navigation still resolves (and redirects to /app/cases), but the nav
    // shows the top-level Cases app instead.
    [SecurityPageName.case]: {
      globalNavPosition: 6,
      capabilities: [
        `${CASES_FEATURE_ID}.${READ_CASES_CAPABILITY}`,
        `${CASES_FEATURE_ID_V4}.${READ_CASES_CAPABILITY}`,
      ],
      hiddenWhenCapabilityExists: CASES_FEATURE_ID_V4,
    },
    [SecurityPageName.caseConfigure]: {
      capabilities: [
        `${CASES_FEATURE_ID}.${CASES_SETTINGS_CAPABILITY}`,
        `${CASES_FEATURE_ID_V4}.${CASES_SETTINGS_CAPABILITY}`,
      ],
      sideNavDisabled: true,
    },
    [SecurityPageName.caseCreate]: {
      capabilities: [
        `${CASES_FEATURE_ID}.${CREATE_CASES_CAPABILITY}`,
        `${CASES_FEATURE_ID_V4}.${CREATE_CASES_CAPABILITY}`,
      ],
      sideNavDisabled: true,
    },
  },
});

const { id, deepLinks, ...rest } = casesLinks;

export const links = {
  ...rest,
  id: SecurityPageName.case,
  links: deepLinks as LinkItem[],
};
