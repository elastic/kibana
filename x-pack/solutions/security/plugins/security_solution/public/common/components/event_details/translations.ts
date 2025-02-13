/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const ALERT_SUMMARY_CONVERSATION_ID = i18n.translate(
  'xpack.securitySolution.alertSummaryView.alertSummaryViewConversationId',
  {
    defaultMessage: 'Alert summary',
  }
);

export const ALERT_SUMMARY_CONTEXT_DESCRIPTION = (view: string) =>
  i18n.translate('xpack.securitySolution.alertSummaryView.alertSummaryViewContextDescription', {
    defaultMessage: 'Alert (from {view})',
    values: { view },
  });

export const ALERT_SUMMARY_VIEW_CONTEXT_TOOLTIP = i18n.translate(
  'xpack.securitySolution.alertSummaryView.alertSummaryViewContextTooltip',
  {
    defaultMessage: 'Add this alert as context',
  }
);

export const EVENT_SUMMARY_CONVERSATION_ID = i18n.translate(
  'xpack.securitySolution.alertSummaryView.eventSummaryViewConversationId',
  {
    defaultMessage: 'Event summary',
  }
);

export const EVENT_SUMMARY_CONTEXT_DESCRIPTION = (view: string) =>
  i18n.translate('xpack.securitySolution.alertSummaryView.eventSummaryViewContextDescription', {
    defaultMessage: 'Event (from {view})',
    values: { view },
  });

export const EVENT_SUMMARY_VIEW_CONTEXT_TOOLTIP = i18n.translate(
  'xpack.securitySolution.alertSummaryView.eventSummaryViewContextTooltip',
  {
    defaultMessage: 'Add this event as context',
  }
);
