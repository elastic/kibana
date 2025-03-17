/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import moment from 'moment';
import {
  SavedObjectsClientContract,
  SavedObjectsFindResult,
} from '@kbn/core-saved-objects-api-server';
import { Logger } from '@kbn/core/server';
import { intersection, isEmpty, uniq } from 'lodash';
import { getAlertDetailsUrl } from '@kbn/observability-plugin/common';
import { SyntheticsMonitorStatusRuleParams as StatusRuleParams } from '@kbn/response-ops-rule-params/synthetics_monitor_status';
import {
  AlertOverviewStatus,
  AlertStatusConfigs,
  AlertStatusMetaData,
  StaleDownConfig,
  StatusRuleInspect,
} from '../../../common/runtime_types/alert_rules/common';
import { queryFilterMonitors } from './queries/filter_monitors';
import { MonitorSummaryStatusRule, StatusRuleExecutorOptions } from './types';
import {
  AND_LABEL,
  getFullViewInAppMessage,
  getRelativeViewInAppUrl,
  getViewInAppUrl,
} from '../common';
import {
  DOWN_LABEL,
  getMonitorAlertDocument,
  getMonitorSummary,
  getUngroupedReasonMessage,
} from './message_utils';
import { queryMonitorStatusAlert } from './queries/query_monitor_status_alert';
import { parseArrayFilters } from '../../routes/common';
import { SyntheticsServerSetup } from '../../types';
import { SyntheticsEsClient } from '../../lib';
import {
  getAllMonitors,
  processMonitors,
} from '../../saved_objects/synthetics_monitor/get_all_monitors';
import { getConditionType } from '../../../common/rules/status_rule';
import { ConfigKey, EncryptedSyntheticsMonitorAttributes } from '../../../common/runtime_types';
import { SyntheticsMonitorClient } from '../../synthetics_service/synthetics_monitor/synthetics_monitor_client';
import { monitorAttributes } from '../../../common/types/saved_objects';
import { AlertConfigKey } from '../../../common/constants/monitor_management';
import { ALERT_DETAILS_URL, VIEW_IN_APP_URL } from '../action_variables';
import { MONITOR_STATUS } from '../../../common/constants/synthetics_alerts';

export class StatusRuleExecutor {
  previousStartedAt: Date | null;
  params: StatusRuleParams;
  esClient: SyntheticsEsClient;
  soClient: SavedObjectsClientContract;
  server: SyntheticsServerSetup;
  syntheticsMonitorClient: SyntheticsMonitorClient;
  monitors: Array<SavedObjectsFindResult<EncryptedSyntheticsMonitorAttributes>> = [];
  hasCustomCondition: boolean;
  monitorLocationsMap: Record<string, string[]>; // monitorId: locationIds
  dateFormat?: string;
  tz?: string;
  options: StatusRuleExecutorOptions;
  logger: Logger;
  ruleName: string;

  constructor(
    esClient: SyntheticsEsClient,
    server: SyntheticsServerSetup,
    syntheticsMonitorClient: SyntheticsMonitorClient,
    options: StatusRuleExecutorOptions
  ) {
    const { services, params, previousStartedAt, rule } = options;
    const { savedObjectsClient } = services;
    this.ruleName = rule.name;
    this.logger = server.logger;
    this.previousStartedAt = previousStartedAt;
    this.params = params;
    this.soClient = savedObjectsClient;
    this.esClient = esClient;
    this.server = server;
    this.syntheticsMonitorClient = syntheticsMonitorClient;
    this.hasCustomCondition = !isEmpty(this.params);
    this.monitorLocationsMap = {};
    this.options = options;
  }

  debug(message: string) {
    this.logger.debug(`[Status Rule Executor][${this.ruleName}] ${message}`);
  }

  async init() {
    const { uiSettingsClient } = this.options.services;
    this.dateFormat = await uiSettingsClient.get('dateFormat');
    const timezone = await uiSettingsClient.get('dateFormat:tz');
    this.tz = timezone === 'Browser' ? 'UTC' : timezone;
    return await this.getMonitors();
  }

  async getMonitors() {
    const baseFilter = !this.hasCustomCondition
      ? `${monitorAttributes}.${AlertConfigKey.STATUS_ENABLED}: true`
      : '';

    const configIds = await queryFilterMonitors({
      spaceId: this.options.spaceId,
      esClient: this.esClient,
      ruleParams: this.params,
    });

    if (this.params.kqlQuery && isEmpty(configIds)) {
      this.debug(`No monitor found with the given KQL query ${this.params.kqlQuery}`);
      return processMonitors([]);
    }

    const { filtersStr } = parseArrayFilters({
      configIds,
      filter: baseFilter,
      tags: this.params?.tags,
      locations: this.params?.locations,
      monitorTypes: this.params?.monitorTypes,
      monitorQueryIds: this.params?.monitorIds,
      projects: this.params?.projects,
    });

    this.monitors = await getAllMonitors({
      soClient: this.soClient,
      filter: filtersStr,
    });

    this.debug(`Found ${this.monitors.length} monitors for params ${JSON.stringify(this.params)}`);
    return processMonitors(this.monitors);
  }

  async getDownChecks(prevDownConfigs: AlertStatusConfigs = {}): Promise<AlertOverviewStatus> {
    const { enabledMonitorQueryIds, maxPeriod, monitorLocationIds, monitorLocationsMap } =
      await this.init();

    const range = this.getRange(maxPeriod);

    const { numberOfChecks } = getConditionType(this.params.condition);

    if (enabledMonitorQueryIds.length === 0) {
      const staleDownConfigs = this.markDeletedConfigs(prevDownConfigs);
      return {
        downConfigs: { ...prevDownConfigs },
        upConfigs: {},
        staleDownConfigs,
        enabledMonitorQueryIds,
        pendingConfigs: {},
        maxPeriod,
      };
    }

    const queryLocations = this.params?.locations;

    // Account for locations filter
    const listOfLocationAfterFilter = queryLocations
      ? intersection(monitorLocationIds, queryLocations)
      : monitorLocationIds;

    const currentStatus = await queryMonitorStatusAlert({
      esClient: this.esClient,
      monitorLocationIds: listOfLocationAfterFilter,
      range,
      monitorQueryIds: enabledMonitorQueryIds,
      numberOfChecks,
      monitorLocationsMap,
      includeRetests: this.params.condition?.includeRetests,
    });

    const { downConfigs, upConfigs } = currentStatus;

    this.debug(
      `Found ${Object.keys(downConfigs).length} down configs and ${
        Object.keys(upConfigs).length
      } up configs`
    );

    const downConfigsById = getConfigsByIds(downConfigs);
    const upConfigsById = getConfigsByIds(upConfigs);

    uniq([...downConfigsById.keys(), ...upConfigsById.keys()]).forEach((configId) => {
      const downCount = downConfigsById.get(configId)?.length ?? 0;
      const upCount = upConfigsById.get(configId)?.length ?? 0;
      const name = this.monitors.find((m) => m.id === configId)?.attributes.name ?? configId;
      this.debug(
        `Monitor: ${name} with id ${configId} has ${downCount} down check and ${upCount} up check`
      );
    });

    Object.keys(prevDownConfigs).forEach((locId) => {
      if (!downConfigs[locId] && !upConfigs[locId]) {
        downConfigs[locId] = prevDownConfigs[locId];
      }
    });

    const staleDownConfigs = this.markDeletedConfigs(downConfigs);

    return {
      ...currentStatus,
      staleDownConfigs,
      pendingConfigs: {},
      maxPeriod,
    };
  }

  getRange = (maxPeriod: number) => {
    let from = this.previousStartedAt
      ? moment(this.previousStartedAt).subtract(1, 'minute').toISOString()
      : 'now-2m';

    const condition = this.params.condition;
    if (condition && 'numberOfChecks' in condition?.window) {
      const numberOfChecks = condition.window.numberOfChecks;
      from = moment()
        .subtract(maxPeriod * numberOfChecks, 'milliseconds')
        .subtract(5, 'minutes')
        .toISOString();
    } else if (condition && 'time' in condition.window) {
      const time = condition.window.time;
      const { unit, size } = time;

      from = moment().subtract(size, unit).toISOString();
    }

    this.debug(
      `Using range from ${from} to now, diff of ${moment().diff(from, 'minutes')} minutes`
    );

    return { from, to: 'now' };
  };

  markDeletedConfigs(downConfigs: AlertStatusConfigs): Record<string, StaleDownConfig> {
    const monitors = this.monitors;
    const staleDownConfigs: AlertOverviewStatus['staleDownConfigs'] = {};
    Object.keys(downConfigs).forEach((locPlusId) => {
      const downConfig = downConfigs[locPlusId];
      const monitor = monitors.find((m) => {
        return (
          m.id === downConfig.configId ||
          m.attributes[ConfigKey.MONITOR_QUERY_ID] === downConfig.monitorQueryId
        );
      });
      if (!monitor) {
        staleDownConfigs[locPlusId] = { ...downConfig, isDeleted: true };
        delete downConfigs[locPlusId];
      } else {
        const { locations } = monitor.attributes;
        const isLocationRemoved = !locations.some((l) => l.id === downConfig.locationId);
        if (isLocationRemoved) {
          staleDownConfigs[locPlusId] = { ...downConfig, isLocationRemoved: true };
          delete downConfigs[locPlusId];
        }
      }
    });

    return staleDownConfigs;
  }

  handleDownMonitorThresholdAlert = ({ downConfigs }: { downConfigs: AlertStatusConfigs }) => {
    const { useTimeWindow, useLatestChecks, downThreshold, locationsThreshold } = getConditionType(
      this.params?.condition
    );
    const groupBy = this.params?.condition?.groupBy ?? 'locationId';

    if (groupBy === 'locationId' && locationsThreshold === 1) {
      Object.entries(downConfigs).forEach(([idWithLocation, statusConfig]) => {
        const doesMonitorMeetLocationThreshold = getDoesMonitorMeetLocationThreshold({
          matchesByLocation: [statusConfig],
          locationsThreshold,
          downThreshold,
          useTimeWindow: useTimeWindow || false,
        });
        if (doesMonitorMeetLocationThreshold) {
          const alertId = idWithLocation;
          const monitorSummary = this.getMonitorDownSummary({
            statusConfig,
          });

          return this.scheduleAlert({
            idWithLocation,
            alertId,
            monitorSummary,
            statusConfig,
            downThreshold,
            useLatestChecks,
            locationNames: [statusConfig.ping.observer.geo?.name!],
            locationIds: [statusConfig.ping.observer.name!],
          });
        }
      });
    } else {
      const downConfigsById = getConfigsByIds(downConfigs);

      for (const [configId, configs] of downConfigsById) {
        const doesMonitorMeetLocationThreshold = getDoesMonitorMeetLocationThreshold({
          matchesByLocation: configs,
          locationsThreshold,
          downThreshold,
          useTimeWindow: useTimeWindow || false,
        });

        if (doesMonitorMeetLocationThreshold) {
          const alertId = configId;
          const monitorSummary = this.getUngroupedDownSummary({
            statusConfigs: configs,
          });
          return this.scheduleAlert({
            idWithLocation: configId,
            alertId,
            monitorSummary,
            statusConfig: configs[0],
            downThreshold,
            useLatestChecks,
            locationNames: configs.map((c) => c.ping.observer.geo?.name!),
            locationIds: configs.map((c) => c.ping.observer.name!),
          });
        }
      }
    }
  };

  getMonitorDownSummary({ statusConfig }: { statusConfig: AlertStatusMetaData }) {
    const { ping, configId, locationId, checks } = statusConfig;

    return getMonitorSummary({
      monitorInfo: ping,
      statusMessage: DOWN_LABEL,
      locationId: [locationId],
      configId,
      dateFormat: this.dateFormat ?? 'Y-MM-DD HH:mm:ss',
      tz: this.tz ?? 'UTC',
      checks,
      params: this.params,
    });
  }

  getUngroupedDownSummary({ statusConfigs }: { statusConfigs: AlertStatusMetaData[] }) {
    const sampleConfig = statusConfigs[0];
    const { ping, configId, checks } = sampleConfig;
    const baseSummary = getMonitorSummary({
      monitorInfo: ping,
      statusMessage: DOWN_LABEL,
      locationId: statusConfigs.map((c) => c.ping.observer.name!),
      configId,
      dateFormat: this.dateFormat!,
      tz: this.tz!,
      checks,
      params: this.params,
    });
    baseSummary.reason = getUngroupedReasonMessage({
      statusConfigs,
      monitorName: baseSummary.monitorName,
      params: this.params,
    });
    if (statusConfigs.length > 1) {
      baseSummary.locationNames = statusConfigs
        .map((c) => c.ping.observer.geo?.name!)
        .join(` ${AND_LABEL} `);
    }

    return baseSummary;
  }

  scheduleAlert({
    idWithLocation,
    alertId,
    monitorSummary,
    statusConfig,
    downThreshold,
    useLatestChecks = false,
    locationNames,
    locationIds,
  }: {
    idWithLocation: string;
    alertId: string;
    monitorSummary: MonitorSummaryStatusRule;
    statusConfig: AlertStatusMetaData;
    downThreshold: number;
    useLatestChecks?: boolean;
    locationNames: string[];
    locationIds: string[];
  }) {
    const { configId, locationId, checks } = statusConfig;
    const { spaceId, startedAt } = this.options;
    const { alertsClient } = this.options.services;
    const { basePath } = this.server;
    if (!alertsClient) return;

    const { uuid: alertUuid, start } = alertsClient.report({
      id: alertId,
      actionGroup: MONITOR_STATUS.id,
    });
    const errorStartedAt = start ?? startedAt.toISOString() ?? monitorSummary.timestamp;

    let relativeViewInAppUrl = '';
    if (monitorSummary.stateId) {
      relativeViewInAppUrl = getRelativeViewInAppUrl({
        configId,
        locationId,
        stateId: monitorSummary.stateId,
      });
    }

    const context = {
      ...monitorSummary,
      idWithLocation,
      checks,
      downThreshold,
      errorStartedAt,
      linkMessage: monitorSummary.stateId
        ? getFullViewInAppMessage(basePath, spaceId, relativeViewInAppUrl)
        : '',
      [VIEW_IN_APP_URL]: getViewInAppUrl(basePath, spaceId, relativeViewInAppUrl),
      [ALERT_DETAILS_URL]: getAlertDetailsUrl(basePath, spaceId, alertUuid),
    };

    const alertDocument = getMonitorAlertDocument(
      monitorSummary,
      locationNames,
      locationIds,
      useLatestChecks
    );

    alertsClient.setAlertData({
      id: alertId,
      payload: alertDocument,
      context,
    });
  }

  getRuleThresholdOverview = async (): Promise<StatusRuleInspect> => {
    const data = await this.getDownChecks({});
    return {
      ...data,
      monitors: this.monitors.map((monitor) => ({
        id: monitor.id,
        name: monitor.attributes.name,
        type: monitor.attributes.type,
      })),
    };
  };
}

export const getDoesMonitorMeetLocationThreshold = ({
  matchesByLocation,
  locationsThreshold,
  downThreshold,
  useTimeWindow,
}: {
  matchesByLocation: AlertStatusMetaData[];
  locationsThreshold: number;
  downThreshold: number;
  useTimeWindow: boolean;
}) => {
  // for location based we need to make sure, monitor is down for the threshold for all locations
  const getMatchingLocationsWithDownThresholdWithXChecks = (matches: AlertStatusMetaData[]) => {
    return matches.filter((config) => (config.checks?.downWithinXChecks ?? 1) >= downThreshold);
  };
  const getMatchingLocationsWithDownThresholdWithinTimeWindow = (
    matches: AlertStatusMetaData[]
  ) => {
    return matches.filter((config) => (config.checks?.down ?? 1) >= downThreshold);
  };
  if (useTimeWindow) {
    const matchingLocationsWithDownThreshold =
      getMatchingLocationsWithDownThresholdWithinTimeWindow(matchesByLocation);
    return matchingLocationsWithDownThreshold.length >= locationsThreshold;
  } else {
    const matchingLocationsWithDownThreshold =
      getMatchingLocationsWithDownThresholdWithXChecks(matchesByLocation);
    return matchingLocationsWithDownThreshold.length >= locationsThreshold;
  }
};

export const getConfigsByIds = (
  downConfigs: AlertStatusConfigs
): Map<string, AlertStatusMetaData[]> => {
  const downConfigsById = new Map<string, AlertStatusMetaData[]>();
  Object.entries(downConfigs).forEach(([_, config]) => {
    const { configId } = config;
    if (!downConfigsById.has(configId)) {
      downConfigsById.set(configId, []);
    }
    downConfigsById.get(configId)?.push(config);
  });
  return downConfigsById;
};
