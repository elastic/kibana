/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { RecommendedAction } from '@kbn/pnd-common';

export const DETAILS_FLYOUT_LABELS = Object.freeze({
  ariaLabel: i18n.translate('xpack.pnd.detailsFlyout.ariaLabel', {
    defaultMessage: 'Conversation details',
  }),
  sections: {
    situation: i18n.translate('xpack.pnd.detailsFlyout.sections.situation', {
      defaultMessage: 'Situation',
    }),
    timeline: i18n.translate('xpack.pnd.detailsFlyout.sections.timeline', {
      defaultMessage: 'Timeline',
    }),
  },
  recommendedAction: {
    contain: i18n.translate('xpack.pnd.detailsFlyout.recommendedAction.contain', {
      defaultMessage: 'Contain',
    }),
    escalate: i18n.translate('xpack.pnd.detailsFlyout.recommendedAction.escalate', {
      defaultMessage: 'Escalate',
    }),
    investigate: i18n.translate('xpack.pnd.detailsFlyout.recommendedAction.investigate', {
      defaultMessage: 'Investigate',
    }),
    tune: i18n.translate('xpack.pnd.detailsFlyout.recommendedAction.tune', {
      defaultMessage: 'Tune',
    }),
  } satisfies Record<RecommendedAction, string>,
  actions: {
    openChat: i18n.translate('xpack.pnd.detailsFlyout.actions.openChat', {
      defaultMessage: 'Open in chat',
    }),
    openCase: i18n.translate('xpack.pnd.detailsFlyout.actions.openCase', {
      defaultMessage: 'Open a case',
    }),
    assign: i18n.translate('xpack.pnd.detailsFlyout.actions.assign', {
      defaultMessage: 'Assign',
    }),
    dismiss: i18n.translate('xpack.pnd.detailsFlyout.actions.dismiss', {
      defaultMessage: 'Dismiss',
    }),
  },
});
