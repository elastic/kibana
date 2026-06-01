/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppDeepLink } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { onboardingLinks } from '../../onboarding/links';

/**
 * Deep link id used by the Daybreak solution navigation tree's home
 * node. The chrome reaches the page through `/app/security/daybreak`,
 * which is routed inside `PageRouter` (see `app/routes.tsx`).
 *
 * Exported so the `security_solution_ess` plugin can reference it when
 * building the Daybreak navigation tree.
 */
export const DAYBREAK_DEEP_LINK_ID = 'daybreak';

export const defaultDeepLinks: AppDeepLink[] = [
  {
    id: onboardingLinks.id,
    path: onboardingLinks.path,
    title: onboardingLinks.title,
  },
  {
    id: DAYBREAK_DEEP_LINK_ID,
    path: '/daybreak',
    title: i18n.translate('xpack.securitySolution.daybreak.deepLinkTitle', {
      defaultMessage: 'Daybreak',
    }),
    keywords: ['daybreak'],
  },
];
