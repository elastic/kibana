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
  tabs: {
    overview: i18n.translate('xpack.pnd.detailsFlyout.tabs.overview', {
      defaultMessage: 'Overview',
    }),
    attachments: i18n.translate('xpack.pnd.detailsFlyout.tabs.attachments', {
      defaultMessage: 'Attachments',
    }),
    timeline: i18n.translate('xpack.pnd.detailsFlyout.tabs.timeline', {
      defaultMessage: 'Timeline',
    }),
  },
  header: {
    since: (time: string) =>
      i18n.translate('xpack.pnd.detailsFlyout.header.since', {
        defaultMessage: 'Since {time} ',
        values: { time },
      }),
    flyoutMenu: {
      share: i18n.translate('xpack.pnd.detailsFlyout.header.flyoutMenuAriaLabel', {
        defaultMessage: 'Share',
      }),
      close: i18n.translate('xpack.pnd.detailsFlyout.header.closeButtonAriaLabel', {
        defaultMessage: 'Close',
      }),
    },
    criticalityBadge: (priorityScore: number) =>
      i18n.translate('xpack.pnd.detailsFlyout.criticalityBadge.priorityScore', {
        defaultMessage: 'Criticality · {priorityScore}',
        values: { priorityScore },
      }),
  },
  sections: {
    overview: i18n.translate('xpack.pnd.detailsFlyout.sections.situation', {
      defaultMessage: "What's happened",
    }),
    impact: i18n.translate('xpack.pnd.detailsFlyout.sections.impact', {
      defaultMessage: 'Impact',
    }),
    conclusion: i18n.translate('xpack.pnd.detailsFlyout.sections.conclusion', {
      defaultMessage: 'Conclusion',
    }),
    parentInvestigation: i18n.translate('xpack.pnd.detailsFlyout.sections.parentInvestigation', {
      defaultMessage: 'Parent investigation',
    }),
    attachments: i18n.translate('xpack.pnd.detailsFlyout.sections.attachments', {
      defaultMessage: 'Attachments',
    }),
    timeline: i18n.translate('xpack.pnd.detailsFlyout.sections.timeline', {
      defaultMessage: 'Timeline',
    }),
  },
  overview: {
    showMore: i18n.translate('xpack.pnd.detailsFlyout.overview.showMore', {
      defaultMessage: 'Show more',
    }),
    showLess: i18n.translate('xpack.pnd.detailsFlyout.overview.showLess', {
      defaultMessage: 'Show less',
    }),
    triggerAlert: i18n.translate('xpack.pnd.detailsFlyout.overview.triggerAlert', {
      defaultMessage: 'Trigger · Alert',
    }),
    fieldColumn: i18n.translate('xpack.pnd.detailsFlyout.overview.fieldColumn', {
      defaultMessage: 'Field',
    }),
    tableCaption: i18n.translate('xpack.pnd.detailsFlyout.tabs.tableCaption', {
      defaultMessage: 'Conversation overview tabs',
    }),
    valueColumn: i18n.translate('xpack.pnd.detailsFlyout.overview.valueColumn', {
      defaultMessage: 'Value',
    }),
    compromised: i18n.translate('xpack.pnd.detailsFlyout.overview.compromised', {
      defaultMessage: 'Compromised',
    }),
    severity: i18n.translate('xpack.pnd.detailsFlyout.overview.severity', {
      defaultMessage: 'Severity',
    }),
  },
  attachments: {
    emptyTitle: i18n.translate('xpack.pnd.detailsFlyout.attachments.emptyTitle', {
      defaultMessage: 'No attachments',
    }),
    emptyBody: i18n.translate('xpack.pnd.detailsFlyout.attachments.emptyBody', {
      defaultMessage: 'Attachments will appear here.',
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
