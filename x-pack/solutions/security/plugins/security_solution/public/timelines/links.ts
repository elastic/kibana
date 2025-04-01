/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import {
  SECURITY_FEATURE_ID,
  SecurityPageName,
  TIMELINE_FEATURE_ID,
  TIMELINES_PATH,
} from '../../common/constants';
import { TIMELINES } from '../app/translations';
import type { LinkItem } from '../common/links/types';

export const links: LinkItem = {
  id: SecurityPageName.timelines,
  title: TIMELINES,
  path: TIMELINES_PATH,
  globalNavPosition: 7,
  // It only makes sense to show this link when the user is also granted access to security solution
  capabilities: [[`${SECURITY_FEATURE_ID}.show`, `${TIMELINE_FEATURE_ID}.read`]],
  globalSearchKeywords: [
    i18n.translate('xpack.securitySolution.appLinks.timelines', {
      defaultMessage: 'Timelines',
    }),
  ],
  links: [
    {
      id: SecurityPageName.timelinesTemplates,
      title: i18n.translate('xpack.securitySolution.appLinks.timeline.templates', {
        defaultMessage: 'Templates',
      }),
      path: `${TIMELINES_PATH}/template`,
      sideNavDisabled: true,
      capabilities: [[`${SECURITY_FEATURE_ID}.show`, `${TIMELINE_FEATURE_ID}.read`]],
    },
  ],
};
