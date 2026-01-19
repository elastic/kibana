/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const AI_IS_CURRENTLY_ANALYZING = (alertsCount: number) =>
  i18n.translate(
    'xpack.securitySolution.attackDiscovery.pages.loadingCallout.aiIsCurrentlyAnalyzing',
    {
      defaultMessage: `AI is analyzing up to {alertsCount} {alertsCount, plural, =1 {alert} other {alerts}} in the last 24 hours to generate discoveries.`,
      values: { alertsCount },
    }
  );

export const AI_IS_CURRENTLY_ANALYZING_FROM = ({
  alertsCount,
  from,
}: {
  alertsCount: number;
  from: string;
}) =>
  i18n.translate(
    'xpack.securitySolution.attackDiscovery.loadingCallout.aiIsCurrentlyAnalyzingFromLabel',
    {
      defaultMessage: `AI is analyzing up to {alertsCount} {alertsCount, plural, =1 {alert} other {alerts}} {from} to generate discoveries.`,
      values: { alertsCount, from },
    }
  );

export const AI_IS_CURRENTLY_ANALYZING_RANGE = ({
  alertsCount,
  end,
  start,
}: {
  alertsCount: number;
  end: string;
  start: string;
}) =>
  i18n.translate(
    'xpack.securitySolution.attackDiscovery.loadingCallout.aiIsCurrentlyAnalyzingRangeLabel',
    {
      defaultMessage: `AI is analyzing up to {alertsCount} {alertsCount, plural, =1 {alert} other {alerts}} from {start} to {end} to generate discoveries.`,
      values: { alertsCount, end, start },
    }
  );

export const ATTACK_DISCOVERY_GENERATION_IN_PROGRESS = i18n.translate(
  'xpack.securitySolution.attackDiscovery.pages.loadingCallout.attackDiscoveryGenerationInProgressLabel',
  {
    defaultMessage: 'Attack discovery in progress',
  }
);

export const ATTACK_DISCOVERY_GENERATION_IN_PROGRESS_VIA = (connectorName: string) =>
  i18n.translate(
    'xpack.securitySolution.attackDiscovery.pages.loadingCallout.attackDiscoveryGenerationInProgressViaLabel',
    {
      defaultMessage: 'Attack discovery in progress via {connectorName}',
      values: { connectorName },
    }
  );

export const CANCELED_VIA = ({
  connectorName,
  formattedGenerationEndTime,
}: {
  connectorName?: string;
  formattedGenerationEndTime?: string;
}) =>
  i18n.translate('xpack.securitySolution.attackDiscovery.pages.loadingCallout.canceledViaLabel', {
    defaultMessage:
      'Attack discovery was canceled{connectorName, select, undefined {} other { for {connectorName}}}{formattedGenerationEndTime, select, undefined {} other { at {formattedGenerationEndTime}}}.',
    values: { connectorName, formattedGenerationEndTime },
  });

export const CLOSE = i18n.translate(
  'xpack.securitySolution.attackDiscovery.pages.loadingCallout.closeButtonLabel',
  {
    defaultMessage: 'Close',
  }
);

export const INFORMATION = i18n.translate(
  'xpack.securitySolution.attackDiscovery.pages.loadingCallout.informationButtonLabel',
  {
    defaultMessage: 'Information',
  }
);

export const NO_MATCHING_ALERTS_VIA = ({
  connectorName,
  formattedGenerationEndTime,
}: {
  connectorName?: string;
  formattedGenerationEndTime?: string;
}) =>
  i18n.translate(
    'xpack.securitySolution.attackDiscovery.pages.loadingCallout.noMatchingAlertsViaLabel',
    {
      defaultMessage:
        'Attack discovery ran successfully{connectorName, select, undefined {} other { via {connectorName}}}{formattedGenerationEndTime, select, undefined {} other { at {formattedGenerationEndTime}}}. There were no matching alerts in the configured time range.',
      values: { connectorName, formattedGenerationEndTime },
    }
  );

export const RAN_SUCCESSFULLY_VIA_NO_DISCOVERIES_COUNT = ({
  connectorName,
  formattedGenerationEndTime,
}: {
  connectorName?: string;
  formattedGenerationEndTime?: string;
}) =>
  i18n.translate(
    'xpack.securitySolution.attackDiscovery.pages.loadingCallout.ranSuccessfullyNoDiscoveriesCountLabel',
    {
      defaultMessage:
        'Attack discovery ran successfully{connectorName, select, undefined {} other { via {connectorName}}}{formattedGenerationEndTime, select, undefined {} other { at {formattedGenerationEndTime}}}. Refresh to view the results.',
      values: { connectorName, formattedGenerationEndTime },
    }
  );

export const RAN_SUCCESSFULLY_VIA_WITH_DISCOVERIES_COUNT = ({
  connectorName,
  discoveries,
  formattedGenerationEndTime,
}: {
  connectorName?: string;
  discoveries: number;
  formattedGenerationEndTime?: string;
}) =>
  i18n.translate(
    'xpack.securitySolution.attackDiscovery.pages.loadingCallout.ranSuccessfullyWithDiscoveriesCountLabel',
    {
      defaultMessage:
        'Attack discovery ran successfully{connectorName, select, undefined {} other { via {connectorName}}}{formattedGenerationEndTime, select, undefined {} other { at {formattedGenerationEndTime}}}{discoveries, plural, =0 { and 0 new attacks were discovered.} =1 { and 1 new attack was discovered. Refresh to view the results.} other { and {discoveries} new attacks were discovered. Refresh to view the results.}}',
      values: { connectorName, discoveries, formattedGenerationEndTime },
    }
  );

export const FAILED_VIA = ({
  connectorName,
  formattedGenerationEndTime,
}: {
  connectorName?: string;
  formattedGenerationEndTime?: string;
}) =>
  i18n.translate('xpack.securitySolution.attackDiscovery.pages.loadingCallout.failedVia', {
    defaultMessage:
      'Attack discovery failed{connectorName, select, undefined {} other { via {connectorName}}}{formattedGenerationEndTime, select, undefined {} other { at {formattedGenerationEndTime}}}.',
    values: { connectorName, formattedGenerationEndTime },
  });
