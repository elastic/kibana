/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const ALERTS = (count: number) =>
  i18n.translate(
    'xpack.securitySolution.attackDiscovery.loadingCallout.pipelineDataCards.alertsLabel',
    {
      defaultMessage: '{count} {count, plural, =1 {alert} other {alerts}}',
      values: { count },
    }
  );

export const COMBINED_ALERTS = (count: number) =>
  i18n.translate(
    'xpack.securitySolution.attackDiscovery.loadingCallout.pipelineDataCards.combinedAlertsLabel',
    {
      defaultMessage: '{count} combined {count, plural, =1 {alert} other {alerts}}',
      values: { count },
    }
  );

export const DISCOVERIES = (count: number) =>
  i18n.translate(
    'xpack.securitySolution.attackDiscovery.loadingCallout.pipelineDataCards.discoveriesLabel',
    {
      defaultMessage: '{count} {count, plural, =1 {discovery} other {discoveries}}',
      values: { count },
    }
  );

export const VALIDATED = (count: number) =>
  i18n.translate(
    'xpack.securitySolution.attackDiscovery.loadingCallout.pipelineDataCards.validatedLabel',
    {
      defaultMessage: '{count} validated',
      values: { count },
    }
  );

export const UNKNOWN_COUNT_TOOLTIP = i18n.translate(
  'xpack.securitySolution.attackDiscovery.loadingCallout.pipelineDataCards.unknownCountTooltip',
  {
    defaultMessage:
      'The alert count cannot be determined for this workflow type. The workflow output was included as a single entry for generation.',
  }
);

export const VIEW_DATA = i18n.translate(
  'xpack.securitySolution.attackDiscovery.loadingCallout.pipelineDataCards.viewDataLabel',
  {
    defaultMessage: 'View data',
  }
);
