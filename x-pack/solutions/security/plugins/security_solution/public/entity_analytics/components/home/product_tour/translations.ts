/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const BANNER_TITLE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.home.productTour.bannerTitle',
  { defaultMessage: 'Smarter Entity analytics to kick off your hunt' }
);

export const BANNER_TEXT = i18n.translate(
  'xpack.securitySolution.entityAnalytics.home.productTour.bannerText',
  {
    defaultMessage:
      'See which users, hosts and services need attention, and why: six attention signals, entities resolved across your data sources, and a one-click AI brief. Take a short tour, or dive in.',
  }
);

export const BANNER_START_TOUR = i18n.translate(
  'xpack.securitySolution.entityAnalytics.home.productTour.bannerStartTour',
  { defaultMessage: 'Start tour' }
);

export const BANNER_VIEW_DOCS = i18n.translate(
  'xpack.securitySolution.entityAnalytics.home.productTour.bannerViewDocs',
  { defaultMessage: 'View docs' }
);

export const BANNER_DISMISS = i18n.translate(
  'xpack.securitySolution.entityAnalytics.home.productTour.bannerDismiss',
  { defaultMessage: 'Dismiss' }
);

export const ATTENTION_STEP_TITLE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.home.productTour.attentionStepTitle',
  { defaultMessage: 'Start with what needs attention' }
);

export const ATTENTION_STEP_CONTENT = i18n.translate(
  'xpack.securitySolution.entityAnalytics.home.productTour.attentionStepContent',
  {
    defaultMessage:
      'Each metric counts entities matching one attention signal in the selected time range. Click a card to filter the table to those entities; click again to clear.',
  }
);

export const AI_STEP_TITLE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.home.productTour.aiStepTitle',
  { defaultMessage: 'Get a head start from AI' }
);

export const AI_STEP_CONTENT = i18n.translate(
  'xpack.securitySolution.entityAnalytics.home.productTour.aiStepContent',
  {
    defaultMessage:
      'Let the AI agent suggest threat hunting leads: which entities to look at first, and why. Generate an AI brief of the current entity risk landscape and recommended next steps to share with your team or leadership.',
  }
);

export const ROWS_STEP_TITLE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.home.productTour.rowsStepTitle',
  { defaultMessage: 'Choose your level of detail' }
);

export const ROWS_STEP_CONTENT = i18n.translate(
  'xpack.securitySolution.entityAnalytics.home.productTour.rowsStepContent',
  {
    defaultMessage:
      'Each row is one entity, resolved from its records across different sources, which are nested underneath. Switch to Individual records to see every record on its own.',
  }
);

export const STEP_NEXT = i18n.translate(
  'xpack.securitySolution.entityAnalytics.home.productTour.next',
  { defaultMessage: 'Next' }
);

export const STEP_CLOSE_TOUR = i18n.translate(
  'xpack.securitySolution.entityAnalytics.home.productTour.closeTour',
  { defaultMessage: 'Close tour' }
);

export const STEP_FINISH_TOUR = i18n.translate(
  'xpack.securitySolution.entityAnalytics.home.productTour.finishTour',
  { defaultMessage: 'Finish tour' }
);
