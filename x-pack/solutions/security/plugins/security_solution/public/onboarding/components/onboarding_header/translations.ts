/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const ONBOARDING_PAGE_TITLE = (userName: string) =>
  i18n.translate('xpack.securitySolution.onboarding.Title', {
    defaultMessage: `Hi {userName}!`,
    values: { userName },
  });

export const ONBOARDING_PAGE_SUBTITLE = i18n.translate(
  'xpack.securitySolution.onboarding.subTitle',
  {
    defaultMessage: `Welcome to Elastic Security`,
  }
);

export const ONBOARDING_PAGE_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.onboarding.description',
  {
    defaultMessage: `A SIEM with AI-driven security analytics, XDR and Cloud Security.`,
  }
);

export const ONBOARDING_SEARCH_AI_LAKE_PAGE_TITLE = i18n.translate(
  'xpack.securitySolution.onboarding.searchAILake.title',
  {
    defaultMessage: `Welcome to Elastic’s AI for the SOC`,
  }
);

export const ONBOARDING_SEARCH_AI_LAKE_PAGE_SUB_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.onboarding.searchAILake.subDescription',
  {
    defaultMessage: `Empowering SOCs for faster threat detection, investigation, and response.`,
  }
);
