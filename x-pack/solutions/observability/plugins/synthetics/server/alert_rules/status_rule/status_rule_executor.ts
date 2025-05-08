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
import { intersection, isEmpty } from 'lodash';
import { getAlertDetailsUrl } from '@kbn/observability-plugin/common';
import { SyntheticsMonitorStatusRuleParams as StatusRuleParams } from '@kbn/response-ops-rule-params/synthetics_monitor_status';
import { MonitorConfigRepository } from '../../services/monitor_config_repository';
import {
  AlertOverviewStatus,
  AlertPendingStatusConfigs,
  AlertPendingStatusMetaData,
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
  MissingPingMonitorInfo,
  getMonitorAlertDocument,
  getMonitorSummary,
  getUngroupedReasonMessage,
} from './message_utils';
import { queryMonitorStatusAlert } from './queries/query_monitor_status_alert';
import { parseArrayFilters, parseLocationFilter } from '../../routes/common';
import { SyntheticsServerSetup } from '../../types';
import { SyntheticsEsClient } from '../../lib';
import { processMonitors } from '../../saved_objects/synthetics_monitor/get_all_monitors';
import { getConditionType } from '../../../common/rules/status_rule';
import {
  ConfigKey,
  EncryptedSyntheticsMonitorAttributes,
  OverviewPing,
} from '../../../common/runtime_types';
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
  monitorConfigRepository: MonitorConfigRepository;

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
    this.monitorConfigRepository = new MonitorConfigRepository(
      savedObjectsClient,
      server.encryptedSavedObjects.getClient()
    );
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

    const locationIds = await parseLocationFilter(
      {
        savedObjectsClient: this.soClient,
        server: this.server,
        syntheticsMonitorClient: this.syntheticsMonitorClient,
      },
      this.params.locations
    );

    const { filtersStr } = parseArrayFilters({
      configIds,
      filter: baseFilter,
      tags: this.params.tags,
      locations: locationIds,
      monitorTypes: this.params.monitorTypes,
      monitorQueryIds: this.params.monitorIds,
      projects: this.params.projects,
    });

    this.monitors = await this.monitorConfigRepository.getAll({
      filter: filtersStr,
    });

    this.debug(
      `Found ${this.monitors.length} monitors for params ${JSON.stringify(
        this.params
      )} | parsed location filter is ${JSON.stringify(locationIds)} `
    );
    return processMonitors(this.monitors);
  }

  async getConfigs(prevDownConfigs: AlertStatusConfigs = {}): Promise<AlertOverviewStatus> {
    const { enabledMonitorQueryIds, maxPeriod, monitorLocationIds, monitorsData } =
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
    const listOfLocationAfterFilter =
      queryLocations && queryLocations.length
        ? intersection(monitorLocationIds, queryLocations)
        : monitorLocationIds;

    const currentStatus = await queryMonitorStatusAlert({
      esClient: this.esClient,
      monitorLocationIds: listOfLocationAfterFilter,
      range,
      monitorQueryIds: enabledMonitorQueryIds,
      numberOfChecks,
      includeRetests: this.params.condition?.includeRetests,
      monitorsData,
    });

    const { downConfigs, upConfigs, pendingConfigs, configStats } = currentStatus;

    this.debug(
      `Found ${Object.keys(downConfigs).length} down configs, ${
        Object.keys(upConfigs).length
      } up configs and ${Object.keys(pendingConfigs).length} pending configs`
    );

    Object.entries(configStats).forEach(([configId, configStat]) => {
      const name = this.monitors.find((m) => m.id === configId)?.attributes.name ?? configId;
      this.debug(
        `Monitor: ${name} with id ${configId} has ${configStat.down} down check, ${configStat.up} up check and ${configStat.pending} pending check`
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

  schedulePendingAlertPerConfigIdPerLocation({
    pendingConfigs,
    pendingThreshold,
  }: {
    pendingConfigs: AlertPendingStatusConfigs;
    pendingThreshold: number;
  }) {
    Object.entries(pendingConfigs).forEach(([idWithLocation, statusConfig]) => {
      const alertId = idWithLocation;
      const monitorSummary = this.getMonitorPendingSummary({
        statusConfig,
      });

      if (!monitorSummary) {
        this.logger.error(`Monitor summary is not available for pending monitor alert`);
        return;
      }

      this.scheduleAlert({
        idWithLocation,
        alertId,
        monitorSummary,
        statusConfig,
        locationNames: [monitorSummary.locationName],
        locationIds: [statusConfig.locationId],
        pendingThreshold,
      });
    });
  }

  schedulePendingAlertPerConfigId({
    pendingConfigs,
    pendingThreshold,
  }: {
    pendingConfigs: AlertPendingStatusConfigs;
    pendingThreshold: number;
  }) {
    const pendingConfigsById = getConfigsByIds(pendingConfigs);

    for (const [configId, configs] of pendingConfigsById) {
      const alertId = configId;
      const monitorSummary = this.getUngroupedPendingSummary({
        statusConfigs: configs,
      });
      if (!monitorSummary) {
        this.logger.error(`Monitor summary is not available for pending monitor alert`);
        return;
      }
      this.scheduleAlert({
        idWithLocation: configId,
        alertId,
        monitorSummary,
        statusConfig: configs[0],
        locationNames: configs.map(({ locationId, ping }) => ping?.observer.geo.name || locationId),
        locationIds: configs.map(({ locationId }) => locationId),
        pendingThreshold,
      });
    }
  }

  handlePendingMonitorAlert = ({
    pendingConfigs,
  }: {
    pendingConfigs: AlertPendingStatusConfigs;
  }) => {
    if (this.params.condition?.alertOnNoData) {
      if (this.params.condition?.groupBy && this.params.condition.groupBy !== 'locationId') {
        this.schedulePendingAlertPerConfigId({
          pendingConfigs,
          pendingThreshold: this.params.condition.alertOnNoData.noOfMissingPings,
        });
      } else {
        this.schedulePendingAlertPerConfigIdPerLocation({
          pendingConfigs,
          pendingThreshold: this.params.condition.alertOnNoData.noOfMissingPings,
        });
      }
    }
  };

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

          this.scheduleAlert({
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
          this.scheduleAlert({
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
      reason: 'down',
      locationId: [locationId],
      configId,
      dateFormat: this.dateFormat ?? 'Y-MM-DD HH:mm:ss',
      tz: this.tz ?? 'UTC',
      checks,
      params: this.params,
    });
  }

  getMissingPingMonitorInfo({
    configId,
    locationId,
  }: {
    configId: string;
    locationId: string;
  }): MissingPingMonitorInfo | undefined {
    const monitor = this.monitors.find((m) => m.id === configId);
    if (!monitor) {
      this.logger.error(`Monitor with id ${configId} not found`);
      return;
    }

    // For some reason 'urls' is not considered a valid attribute in the monitor attributes, there's probably a problem with the EncryptedSyntheticsMonitorAttributes type
    const fullUrl =
      'urls' in monitor.attributes && typeof monitor.attributes.urls === 'string'
        ? monitor.attributes.urls
        : '';

    return {
      monitor: {
        name: monitor.attributes.name,
        id: configId,
        type: monitor.attributes.type,
      },
      observer: {
        geo: {
          name: monitor.attributes.locations.find((l) => l.id === locationId)?.label || '',
        },
      },
      labels: monitor.attributes.labels,
      tags: monitor.attributes.tags,
      url: { full: fullUrl },
    };
  }

  getMonitorPendingSummary({ statusConfig }: { statusConfig: AlertPendingStatusMetaData }) {
    const { ping, configId, locationId } = statusConfig;
    const monitorInfo: OverviewPing | MissingPingMonitorInfo | undefined =
      ping || this.getMissingPingMonitorInfo({ configId, locationId });

    if (!monitorInfo) {
      this.logger.error(`Monitor info for monitor with id ${configId} not found`);
      return;
    }

    return getMonitorSummary({
      monitorInfo,
      reason: 'pending',
      locationId: [statusConfig.locationId],
      configId: statusConfig.configId,
      dateFormat: this.dateFormat ?? 'Y-MM-DD HH:mm:ss',
      tz: this.tz ?? 'UTC',
      params: this.params,
    });
  }

  getUngroupedDownSummary({ statusConfigs }: { statusConfigs: AlertStatusMetaData[] }) {
    const sampleConfig = statusConfigs[0];
    const { ping, configId, checks } = sampleConfig;
    const baseSummary = getMonitorSummary({
      monitorInfo: ping,
      reason: 'down',
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
      reason: 'down',
    });
    if (statusConfigs.length > 1) {
      baseSummary.locationNames = statusConfigs
        .map((c) => c.ping.observer.geo?.name!)
        .join(` ${AND_LABEL} `);
    }

    return baseSummary;
  }

  getUngroupedPendingSummary({ statusConfigs }: { statusConfigs: AlertPendingStatusMetaData[] }) {
    const sampleConfig = statusConfigs[0];
    const { ping, configId } = sampleConfig;
    const monitorInfo: OverviewPing | MissingPingMonitorInfo | undefined =
      ping || this.getMissingPingMonitorInfo({ configId, locationId: sampleConfig.locationId });
    if (!monitorInfo) {
      this.logger.error(`Monitor info for monitor with id ${configId} not found`);
      return;
    }
    const baseSummary = getMonitorSummary({
      monitorInfo,
      reason: 'pending',
      locationId: statusConfigs.map(({ locationId }) => locationId),
      configId,
      dateFormat: this.dateFormat!,
      tz: this.tz!,
      params: this.params,
    });
    baseSummary.reason = getUngroupedReasonMessage({
      statusConfigs,
      monitorName: baseSummary.monitorName,
      params: this.params,
      reason: 'pending',
    });

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
    pendingThreshold,
  }: {
    idWithLocation: string;
    alertId: string;
    monitorSummary: MonitorSummaryStatusRule;
    useLatestChecks?: boolean;
    locationNames: string[];
    locationIds: string[];
  } & (
    | { statusConfig: AlertStatusMetaData; downThreshold: number; pendingThreshold?: undefined }
    | {
        statusConfig: AlertPendingStatusMetaData;
        downThreshold?: undefined;
        pendingThreshold: number;
      }
  )) {
    const { configId, locationId } = statusConfig;
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
      errorStartedAt,
      linkMessage: monitorSummary.stateId
        ? getFullViewInAppMessage(basePath, spaceId, relativeViewInAppUrl)
        : '',
      [VIEW_IN_APP_URL]: getViewInAppUrl(basePath, spaceId, relativeViewInAppUrl),
      [ALERT_DETAILS_URL]: getAlertDetailsUrl(basePath, spaceId, alertUuid),
    };

    // downThreshold and checks are only available for down alerts
    if (downThreshold) {
      context.downThreshold = downThreshold;
    }

    if ('checks' in statusConfig) {
      context.checks = statusConfig.checks;
    }

    const alertDocument = getMonitorAlertDocument(
      monitorSummary,
      locationNames,
      locationIds,
      useLatestChecks,
      pendingThreshold === undefined ? downThreshold : pendingThreshold
    );

    alertsClient.setAlertData({
      id: alertId,
      payload: alertDocument,
      context,
    });
  }

  getRuleThresholdOverview = async (): Promise<StatusRuleInspect> => {
    const data = await this.getConfigs({});
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

export function getConfigsByIds(configs: AlertStatusConfigs): Map<string, AlertStatusMetaData[]>;
export function getConfigsByIds(
  configs: AlertPendingStatusConfigs
): Map<string, AlertPendingStatusMetaData[]>;
export function getConfigsByIds(
  configs: AlertStatusConfigs | AlertPendingStatusConfigs
): Map<string, Array<AlertStatusMetaData | AlertPendingStatusMetaData>> {
  const configsById = new Map<string, Array<AlertStatusMetaData | AlertPendingStatusMetaData>>();
  Object.entries(configs).forEach(([_, config]) => {
    const { configId } = config;
    if (!configsById.has(configId)) {
      configsById.set(configId, []);
    }
    configsById.get(configId)?.push(config);
  });
  return configsById;
}
