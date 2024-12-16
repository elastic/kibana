/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  BrowserFields,
  ConfigKey,
  MonitorTypeEnum,
  FormMonitorType,
  ProjectMonitor,
  ThrottlingConfig,
} from '../../../../common/runtime_types';
import {
  PROFILE_VALUES_ENUM,
  DEFAULT_FIELDS,
  PROFILES_MAP,
  PROFILE_VALUES,
  CUSTOM_LABEL,
} from '../../../../common/constants/monitor_defaults';
import {
  NormalizedProjectProps,
  NormalizerResult,
  getNormalizeCommonFields,
  getValueInSeconds,
} from './common_fields';

export const getNormalizeBrowserFields = ({
  locations = [],
  privateLocations = [],
  monitor,
  projectId,
  namespace,
  version,
}: NormalizedProjectProps): NormalizerResult<BrowserFields> => {
  const defaultFields = DEFAULT_FIELDS[MonitorTypeEnum.BROWSER];

  const { errors, normalizedFields: commonFields } = getNormalizeCommonFields({
    locations,
    privateLocations,
    monitor,
    projectId,
    namespace,
    version,
  });

  const throttling = normalizeThrottling(monitor.throttling);

  const normalizedFields = {
    ...commonFields,
    [ConfigKey.MONITOR_TYPE]: MonitorTypeEnum.BROWSER,
    [ConfigKey.FORM_MONITOR_TYPE]: FormMonitorType.MULTISTEP,
    [ConfigKey.SOURCE_PROJECT_CONTENT]:
      monitor.content || defaultFields[ConfigKey.SOURCE_PROJECT_CONTENT],
    [ConfigKey.THROTTLING_CONFIG]: throttling,
    [ConfigKey.IGNORE_HTTPS_ERRORS]:
      monitor.ignoreHTTPSErrors || defaultFields[ConfigKey.IGNORE_HTTPS_ERRORS],
    [ConfigKey.SCREENSHOTS]: monitor.screenshot || defaultFields[ConfigKey.SCREENSHOTS],
    [ConfigKey.PLAYWRIGHT_OPTIONS]: Object.keys(monitor.playwrightOptions || {}).length
      ? JSON.stringify(monitor.playwrightOptions)
      : defaultFields[ConfigKey.PLAYWRIGHT_OPTIONS],
    [ConfigKey.JOURNEY_FILTERS_MATCH]:
      monitor.filter?.match || defaultFields[ConfigKey.JOURNEY_FILTERS_MATCH],
    [ConfigKey.TIMEOUT]: monitor.timeout
      ? getValueInSeconds(monitor.timeout)
      : defaultFields[ConfigKey.TIMEOUT],
  };
  return {
    normalizedFields: {
      ...defaultFields,
      ...normalizedFields,
    },
    unsupportedKeys: [],
    errors,
  };
};

export const normalizeThrottling = (
  monitorThrottling: ProjectMonitor['throttling']
): ThrottlingConfig => {
  const defaultFields = DEFAULT_FIELDS[MonitorTypeEnum.BROWSER];

  let throttling = defaultFields[ConfigKey.THROTTLING_CONFIG];
  if (typeof monitorThrottling === 'boolean' && !monitorThrottling) {
    throttling = PROFILES_MAP[PROFILE_VALUES_ENUM.NO_THROTTLING];
  }
  if (typeof monitorThrottling === 'object') {
    const { download, upload, latency } = monitorThrottling;
    const matchedProfile = PROFILE_VALUES.find(({ value }) => {
      return (
        Number(value?.download) === download &&
        Number(value?.upload) === upload &&
        Number(value?.latency) === latency
      );
    });

    if (matchedProfile) {
      return matchedProfile;
    } else {
      return {
        id: PROFILE_VALUES_ENUM.CUSTOM,
        label: CUSTOM_LABEL,
        value: {
          download: String(download),
          upload: String(upload),
          latency: String(latency),
        },
      };
    }
  }

  return throttling;
};
