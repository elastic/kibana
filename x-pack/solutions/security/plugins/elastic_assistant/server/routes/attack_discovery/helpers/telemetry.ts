/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AnalyticsServiceSetup } from '@kbn/core/server';
import { ApiConfig, AttackDiscovery } from '@kbn/elastic-assistant-common';
import moment from 'moment/moment';
import { uniq } from 'lodash/fp';

import dateMath from '@kbn/datemath';
import {
  ATTACK_DISCOVERY_ERROR_EVENT,
  ATTACK_DISCOVERY_SUCCESS_EVENT,
  AttackDiscoveryScheduleInfo,
} from '../../../lib/telemetry/event_based_telemetry';

export const reportAttackDiscoveryGenerationSuccess = ({
  alertsContextCount,
  apiConfig,
  attackDiscoveries,
  durationMs,
  end,
  hasFilter,
  scheduleInfo,
  size,
  start,
  telemetry,
}: {
  alertsContextCount: number;
  apiConfig: ApiConfig;
  attackDiscoveries: AttackDiscovery[] | null;
  durationMs: number;
  end?: string;
  hasFilter: boolean;
  scheduleInfo?: AttackDiscoveryScheduleInfo;
  size: number;
  start?: string;
  telemetry: AnalyticsServiceSetup;
}) => {
  const { dateRangeDuration, isDefaultDateRange } = getTimeRangeDuration({ start, end });

  telemetry.reportEvent(ATTACK_DISCOVERY_SUCCESS_EVENT.eventType, {
    actionTypeId: apiConfig.actionTypeId,
    alertsContextCount,
    alertsCount:
      uniq(
        attackDiscoveries?.flatMap((attackDiscovery: AttackDiscovery) => attackDiscovery.alertIds)
      ).length ?? 0,
    configuredAlertsCount: size,
    dateRangeDuration,
    discoveriesGenerated: attackDiscoveries?.length ?? 0,
    durationMs,
    hasFilter,
    isDefaultDateRange,
    model: apiConfig.model,
    provider: apiConfig.provider,
    scheduleInfo,
  });
};

export const reportAttackDiscoveryGenerationFailure = ({
  apiConfig,
  errorMessage,
  scheduleInfo,
  telemetry,
}: {
  apiConfig: ApiConfig;
  errorMessage: string;
  scheduleInfo?: AttackDiscoveryScheduleInfo;
  telemetry: AnalyticsServiceSetup;
}) => {
  telemetry.reportEvent(ATTACK_DISCOVERY_ERROR_EVENT.eventType, {
    actionTypeId: apiConfig.actionTypeId,
    errorMessage,
    model: apiConfig.model,
    provider: apiConfig.provider,
    scheduleInfo,
  });
};

const getTimeRangeDuration = ({
  start,
  end,
}: {
  start?: string;
  end?: string;
}): {
  dateRangeDuration: number;
  isDefaultDateRange: boolean;
} => {
  if (start && end) {
    const forceNow = moment().toDate();
    const dateStart = dateMath.parse(start, {
      roundUp: false,
      momentInstance: moment,
      forceNow,
    });
    const dateEnd = dateMath.parse(end, {
      roundUp: false,
      momentInstance: moment,
      forceNow,
    });
    if (dateStart && dateEnd) {
      const dateRangeDuration = moment.duration(dateEnd.diff(dateStart)).asHours();
      return {
        dateRangeDuration,
        isDefaultDateRange: end === 'now' && start === 'now-24h',
      };
    }
  }
  return {
    // start and/or end undefined, return 0 hours
    dateRangeDuration: 0,
    isDefaultDateRange: false,
  };
};
