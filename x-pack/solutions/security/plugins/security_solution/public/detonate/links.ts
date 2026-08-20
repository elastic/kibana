/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SECURITY_UI_SHOW_PRIVILEGE } from '@kbn/security-solution-features/constants';
import { DETONATE_PATH, SecurityPageName } from '../../common/constants';
import type { LinkItem } from '../common/links/types';
import { DETONATE, DETONATE_DESCRIPTION } from './translations';

export const detonateLinks: LinkItem = {
  id: SecurityPageName.detonate,
  title: DETONATE,
  description: DETONATE_DESCRIPTION,
  path: DETONATE_PATH,
  capabilities: [SECURITY_UI_SHOW_PRIVILEGE],
  experimentalKey: 'detonateEnabled',
  globalSearchKeywords: [DETONATE],
  hideTimeline: true,
};
