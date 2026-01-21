/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppDeepLink } from '@kbn/core/public';
import { onboardingLinks } from '../../onboarding/links';

export const defaultDeepLinks: AppDeepLink[] = [
  {
    id: onboardingLinks.id,
    path: onboardingLinks.path,
    title: onboardingLinks.title,
  },
];
