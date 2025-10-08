/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isRight } from 'fp-ts/Either';
import Mustache from 'mustache';
import type { AlertsLocatorParams } from '@kbn/observability-plugin/common';
import { getAlertUrl } from '@kbn/observability-plugin/common';
import type { LocatorPublic } from '@kbn/share-plugin/common';
import type { ObservabilityUptimeAlert } from '@kbn/alerts-as-data-utils';
import { legacyExperimentalFieldMap } from '@kbn/alerts-as-data-utils';
import type { IBasePath } from '@kbn/core/server';
import type { IRuleTypeAlerts } from '@kbn/alerting-plugin/server';
import type { RuleExecutorServices } from '@kbn/alerting-plugin/server';
import { addSpaceIdToPath } from '@kbn/spaces-plugin/common';
import type { AlertInstanceState } from '@kbn/alerting-plugin/server';
import type { AlertInstanceContext } from '@kbn/alerting-plugin/server';
import { ALERT_GROUPING } from '@kbn/rule-data-utils';
import type { MappingDynamicTemplate } from '@elastic/elasticsearch/lib/api/types';
import { uptimeRuleFieldMap } from '../../../../common/rules/uptime_rule_field_map';
import { SYNTHETICS_RULE_TYPES_ALERT_CONTEXT } from '../../../../common/constants/synthetics_alerts';
import type { UptimeCommonState } from '../../../../common/runtime_types';
import { UptimeCommonStateType } from '../../../../common/runtime_types';
import { ALERT_DETAILS_URL } from './action_variables';

export type UpdateUptimeAlertState = (
  state: Record<string, any>,
  isTriggeredNow: boolean
) => UptimeCommonState;

export const updateState: UpdateUptimeAlertState = (state, isTriggeredNow) => {
  const now = new Date().toISOString();
  const decoded = UptimeCommonStateType.decode(state);
  if (!isRight(decoded)) {
    const triggerVal = isTriggeredNow ? now : undefined;
    return {
      currentTriggerStarted: triggerVal,
      firstCheckedAt: now,
      firstTriggeredAt: triggerVal,
      isTriggered: isTriggeredNow,
      lastTriggeredAt: triggerVal,
      lastCheckedAt: now,
      lastResolvedAt: undefined,
    };
  }
  const {
    currentTriggerStarted,
    firstCheckedAt,
    firstTriggeredAt,
    lastTriggeredAt,
    // this is the stale trigger status, we're naming it `wasTriggered`
    // to differentiate it from the `isTriggeredNow` param
    isTriggered: wasTriggered,
    lastResolvedAt,
  } = decoded.right;

  let cts: string | undefined;
  if (isTriggeredNow && !currentTriggerStarted) {
    cts = now;
  } else if (isTriggeredNow) {
    cts = currentTriggerStarted;
  }
  return {
    currentTriggerStarted: cts,
    firstCheckedAt: firstCheckedAt ?? now,
    firstTriggeredAt: isTriggeredNow && !firstTriggeredAt ? now : firstTriggeredAt,
    lastCheckedAt: now,
    lastTriggeredAt: isTriggeredNow ? now : lastTriggeredAt,
    lastResolvedAt: !isTriggeredNow && wasTriggered ? now : lastResolvedAt,
    isTriggered: isTriggeredNow,
  };
};

export const generateAlertMessage = (messageTemplate: string, fields: Record<string, any>) => {
  return Mustache.render(messageTemplate, { context: { ...fields }, state: { ...fields } });
};

export const getViewInAppUrl = (
  basePath: IBasePath,
  spaceId: string,
  relativeViewInAppUrl: string
) => addSpaceIdToPath(basePath.publicBaseUrl, spaceId, relativeViewInAppUrl);

export const getAlertDetailsUrl = (
  basePath: IBasePath,
  spaceId: string,
  alertUuid: string | null
) => addSpaceIdToPath(basePath.publicBaseUrl, spaceId, `/app/observability/alerts/${alertUuid}`);

export const setRecoveredAlertsContext = async <ActionGroupIds extends string>({
  alertsClient,
  alertsLocator,
  basePath,
  defaultStartedAt,
  spaceId,
}: {
  alertsClient: RuleExecutorServices<
    AlertInstanceState,
    AlertInstanceContext,
    ActionGroupIds,
    ObservabilityUptimeAlert
  >['alertsClient'];
  alertsLocator?: LocatorPublic<AlertsLocatorParams>;
  basePath: IBasePath;
  defaultStartedAt: string;
  spaceId: string;
}) => {
  for (const recoveredAlert of alertsClient?.getRecoveredAlerts() ?? []) {
    const recoveredAlertId = recoveredAlert.alert.getId();
    const alertUuid = recoveredAlert.alert.getUuid();
    const indexedStartedAt = recoveredAlert.alert.getStart() ?? defaultStartedAt;
    const state = recoveredAlert.alert.getState();
    const alertUrl = await getAlertUrl(
      alertUuid,
      spaceId,
      indexedStartedAt,
      alertsLocator,
      basePath.publicBaseUrl
    );

    alertsClient!.setAlertData({
      id: recoveredAlertId,
      context: {
        ...state,
        [ALERT_DETAILS_URL]: alertUrl,
      },
    });
  }
};

export const uptimeRuleTypeFieldMap = { ...uptimeRuleFieldMap, ...legacyExperimentalFieldMap };

const stringAsKeywords: MappingDynamicTemplate = {
  path_match: `${ALERT_GROUPING}.*`,
  match_mapping_type: 'string',
  mapping: { type: 'keyword', ignore_above: 1024 },
};
const dynamicTemplates = [
  {
    strings_as_keywords: stringAsKeywords,
  },
];

export const UptimeRuleTypeAlertDefinition: IRuleTypeAlerts<ObservabilityUptimeAlert> = {
  context: SYNTHETICS_RULE_TYPES_ALERT_CONTEXT,
  mappings: { fieldMap: uptimeRuleTypeFieldMap, dynamicTemplates },
  useLegacyAlerts: true,
  shouldWrite: true,
};
