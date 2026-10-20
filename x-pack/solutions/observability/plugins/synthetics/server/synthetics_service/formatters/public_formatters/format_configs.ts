/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty, isNil, omitBy } from 'lodash';
import type { SavedObject } from '@kbn/core/server';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import { ALL_SPACES_ID } from '@kbn/spaces-plugin/common/constants';
import type { Logger } from '@kbn/logging';
import type { MaintenanceWindow } from '@kbn/maintenance-windows-plugin/common';
import { periodToSeconds } from '../../../routes/overview_status/utils';
import { normalizeSecrets } from '../../utils/secrets';

import { formatMWs, replaceStringWithParams, resolveHttpAuthParams } from '../formatting_utils';
import { PARAMS_KEYS_TO_SKIP } from '../common';
import type {
  BrowserFields,
  HeartbeatConfig,
  MonitorFields,
  SyntheticsMonitor,
  SyntheticsMonitorWithSecretsAttributes,
  TLSFields,
} from '../../../../common/runtime_types';
import { ConfigKey, MonitorTypeEnum } from '../../../../common/runtime_types';
import { publicFormatters } from '.';

const UI_KEYS_TO_SKIP = [
  ConfigKey.JOURNEY_ID,
  ConfigKey.PROJECT_ID,
  ConfigKey.METADATA,
  ConfigKey.REVISION,
  ConfigKey.CUSTOM_HEARTBEAT_ID,
  ConfigKey.FORM_MONITOR_TYPE,
  ConfigKey.TEXT_ASSERTION,
  ConfigKey.CONFIG_HASH,
  ConfigKey.ALERT_CONFIG,
  ConfigKey.LABELS,
  'secrets',
];

export const formatMonitorConfigFields = (
  configKeys: ConfigKey[],
  config: Partial<MonitorFields>,
  logger: Logger,
  params: Record<string, string>,
  mws: MaintenanceWindow[]
) => {
  // Kerberos/NTLM are in PARAMS_KEYS_TO_SKIP; resolve nested string fields here
  // so public Heartbeat configs get the same per-field substitution as private.
  const resolvedConfig = resolveHttpAuthParams(config, params, logger);
  const formattedMonitor = {} as Record<ConfigKey, any>;

  configKeys.forEach((key) => {
    if (!UI_KEYS_TO_SKIP.includes(key)) {
      const value = resolvedConfig[key] ?? null;

      if (value === null || value === '') {
        return;
      }

      if (resolvedConfig.type !== 'browser' && key === ConfigKey.PARAMS) {
        return;
      }

      if (!!publicFormatters[key]) {
        const formatter = publicFormatters[key];
        if (typeof formatter === 'function') {
          formattedMonitor[key] = formatter(resolvedConfig, key);
        } else {
          formattedMonitor[key] = formatter;
        }
      } else {
        formattedMonitor[key] = value;
      }
    }
    if (!PARAMS_KEYS_TO_SKIP.includes(key)) {
      formattedMonitor[key] = replaceStringWithParams(formattedMonitor[key], params, logger);
    }
  });

  if (!resolvedConfig[ConfigKey.METADATA]?.is_tls_enabled) {
    const sslKeys = Object.keys(formattedMonitor).filter((key) =>
      key.includes('ssl')
    ) as unknown as Array<keyof TLSFields>;
    sslKeys.forEach((key) => (formattedMonitor[key] = null));
  }

  if (resolvedConfig[ConfigKey.MAINTENANCE_WINDOWS]) {
    const maintenanceWindows = resolvedConfig[ConfigKey.MAINTENANCE_WINDOWS];
    formattedMonitor[ConfigKey.MAINTENANCE_WINDOWS] = formatMWs(
      maintenanceWindows.map((window) => {
        if (typeof window === 'string') {
          return mws.find((m) => m.id === window);
        }
        return window;
      }) as MaintenanceWindow[],
      false
    );
  }

  return omitBy(formattedMonitor, isNil) as Partial<MonitorFields>;
};

export interface ConfigData {
  monitor: SyntheticsMonitor;
  configId: string;
  heartbeatId?: string;
  runOnce?: boolean;
  testRunId?: string;
  params: Record<string, string>;
  spaceId: string;
  kibanaUrl?: string;
}

export const formatHeartbeatRequest = (
  {
    monitor,
    configId,
    heartbeatId,
    runOnce,
    testRunId,
    spaceId,
    kibanaUrl,
  }: Omit<ConfigData, 'params'>,
  params?: string
): HeartbeatConfig => {
  const projectId = (monitor as BrowserFields)[ConfigKey.PROJECT_ID];

  const heartbeatIdT = heartbeatId ?? monitor[ConfigKey.MONITOR_QUERY_ID];

  const paramsString = params ?? (monitor as BrowserFields)[ConfigKey.PARAMS];
  const { labels, spaces } = monitor;
  const monSpaces = spaces ? Array.from(new Set([...(spaces ?? []), spaceId])) : spaceId;

  return {
    ...monitor,
    id: heartbeatIdT,
    fields: {
      config_id: configId,
      'monitor.project.name': projectId || undefined,
      'monitor.project.id': projectId || undefined,
      run_once: runOnce,
      test_run_id: testRunId,
      'monitor.interval': periodToSeconds(monitor[ConfigKey.SCHEDULE]),
      meta: {
        space_id: monSpaces,
      },
      ...(isEmpty(labels) ? {} : { labels }),
      ...(kibanaUrl ? { kibanaUrl } : {}),
    },
    fields_under_root: true,
    params: monitor.type === 'browser' ? paramsString : '',
  };
};

export const mixParamsWithGlobalParams = (
  globalParams: Record<string, string>,
  monitor: SyntheticsMonitor
) => {
  let params: Record<string, string> = { ...(globalParams ?? {}) };

  const paramsString = '';

  try {
    const monParamsStr = (monitor as BrowserFields)[ConfigKey.PARAMS];

    if (monParamsStr) {
      const monitorParams = JSON.parse(monParamsStr);
      params = { ...params, ...monitorParams };
    }

    if (!isEmpty(params)) {
      return { str: JSON.stringify(params), params };
    } else {
      return { str: '', params };
    }
  } catch (e) {
    // ignore
  }

  return { str: paramsString, params };
};

/** Formats monitors the way their configuration is sent to the service. */
export const formatMonitorConfigs = ({
  configs,
  maintenanceWindows,
  logger,
}: {
  configs: ConfigData[] | ConfigData;
  maintenanceWindows: MaintenanceWindow[];
  logger: Logger;
}) => {
  const configList = Array.isArray(configs) ? configs : [configs];

  return configList.map((config) => {
    const { str: paramsString, params } = mixParamsWithGlobalParams(config.params, config.monitor);

    const asHeartbeatConfig = formatHeartbeatRequest(config, paramsString);

    return formatMonitorConfigFields(
      Object.keys(asHeartbeatConfig) as ConfigKey[],
      asHeartbeatConfig as Partial<MonitorFields>,
      logger,
      params ?? {},
      maintenanceWindows
    );
  });
};

/**
 * Formats saved monitors for the service, resolving the params that apply to each one: those of
 * its own space, overridden by those shared across all spaces.
 */
export const formatSavedMonitors = ({
  monitors,
  paramsBySpace,
  maintenanceWindows,
  kibanaUrl,
  logger,
}: {
  monitors: Array<SavedObject<SyntheticsMonitorWithSecretsAttributes>>;
  paramsBySpace: Record<string, Record<string, string>>;
  maintenanceWindows: MaintenanceWindow[];
  kibanaUrl?: string;
  logger: Logger;
}) => {
  const configs = (monitors ?? []).map((monitor) => {
    const attributes = monitor.attributes as unknown as MonitorFields;
    const monitorSpace = monitor.namespaces?.[0] ?? DEFAULT_SPACE_ID;

    const params = paramsBySpace[monitorSpace] ?? {};

    return {
      params: { ...params, ...(paramsBySpace?.[ALL_SPACES_ID] ?? {}) },
      monitor: normalizeSecrets(monitor).attributes,
      configId: monitor.id,
      heartbeatId: attributes[ConfigKey.MONITOR_QUERY_ID],
      spaceId: monitorSpace,
      kibanaUrl,
    };
  });

  return formatMonitorConfigs({ configs, maintenanceWindows, logger }) as MonitorFields[];
};

type MonitorToDelete = Pick<
  MonitorFields,
  | ConfigKey.MONITOR_QUERY_ID
  | ConfigKey.MONITOR_TYPE
  | ConfigKey.LOCATIONS
  | ConfigKey.SCHEDULE
  | ConfigKey.NAMESPACE
>;

/**
 * The service finds the monitors to delete by id and type alone, so unlike the other pushes the
 * body is never formatted: it carries no config, params or secrets. `locations` only routes the
 * request and is dropped before it is sent. The namespace is kept so the body never claims the
 * default one for a monitor that has its own. Browser monitors keep their schedule because services
 * older than synthetics-service#2049 (v1.13.14) take it from the request to unschedule the monitor.
 */
export const formatMonitorsToDelete = ({
  configs,
  logger,
}: {
  configs: Array<{ monitor: MonitorToDelete; heartbeatId?: string }>;
  logger: Logger;
}): Array<Partial<MonitorFields>> =>
  configs.map(({ monitor, heartbeatId }) => {
    const type = monitor[ConfigKey.MONITOR_TYPE];
    const schedule = monitor[ConfigKey.SCHEDULE];

    return {
      [ConfigKey.MONITOR_QUERY_ID]: heartbeatId ?? monitor[ConfigKey.MONITOR_QUERY_ID],
      [ConfigKey.MONITOR_TYPE]: type,
      [ConfigKey.NAMESPACE]: monitor[ConfigKey.NAMESPACE],
      [ConfigKey.LOCATIONS]: monitor[ConfigKey.LOCATIONS],
      ...(type === MonitorTypeEnum.BROWSER && schedule
        ? formatMonitorConfigFields(
            [ConfigKey.SCHEDULE],
            { [ConfigKey.SCHEDULE]: schedule },
            logger,
            {},
            []
          )
        : {}),
    };
  });
