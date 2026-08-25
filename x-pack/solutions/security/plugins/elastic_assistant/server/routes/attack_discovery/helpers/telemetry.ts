/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceSetup } from '@kbn/core/server';
import type { ApiConfig, AttackDiscovery } from '@kbn/elastic-assistant-common';
import moment from 'moment/moment';
import { uniq } from 'lodash/fp';

import dateMath from '@kbn/datemath';
import type { AttackDiscoveryScheduleInfo } from '../../../lib/telemetry/event_based_telemetry';
import {
  ATTACK_DISCOVERY_ERROR_EVENT,
  ATTACK_DISCOVERY_SUCCESS_EVENT,
} from '../../../lib/telemetry/event_based_telemetry';

export const reportAttackDiscoveryGenerationSuccess = ({
  alertsContextCount,
  apiConfig,
  attackDiscoveries,
  duplicatesDroppedCount,
  durationMs,
  end,
  execution_mode,
  hasFilter,
  scheduleInfo,
  size,
  start,
  telemetry,
  trigger,
}: {
  alertsContextCount: number;
  apiConfig: ApiConfig;
  attackDiscoveries: AttackDiscovery[] | null;
  duplicatesDroppedCount?: number;
  durationMs: number;
  end?: string;
  execution_mode?: string;
  hasFilter: boolean;
  scheduleInfo?: AttackDiscoveryScheduleInfo;
  size: number;
  start?: string;
  telemetry: AnalyticsServiceSetup;
  trigger?: string;
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
    duplicatesDroppedCount,
    durationMs,
    execution_mode,
    hasFilter,
    isDefaultDateRange,
    model: apiConfig.model,
    provider: apiConfig.provider,
    scheduleInfo,
    trigger,
  });
};

export const reportAttackDiscoveryGenerationFailure = ({
  apiConfig,
  errorMessage,
  execution_mode,
  scheduleInfo,
  telemetry,
  trigger,
}: {
  apiConfig: ApiConfig;
  errorMessage: string;
  execution_mode?: string;
  scheduleInfo?: AttackDiscoveryScheduleInfo;
  telemetry: AnalyticsServiceSetup;
  trigger?: string;
}) => {
  telemetry.reportEvent(ATTACK_DISCOVERY_ERROR_EVENT.eventType, {
    actionTypeId: apiConfig.actionTypeId,
    errorMessage,
    execution_mode,
    model: apiConfig.model,
    provider: apiConfig.provider,
    scheduleInfo,
    trigger,
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
