/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { get } from 'lodash';
import { DEFAULT_FIELDS } from '../../../../common/constants/monitor_defaults';
import {
  ConfigKey,
  MonitorTypeEnum,
  FormMonitorType,
  TCPFields,
  TLSVersion,
} from '../../../../common/runtime_types/monitor_management';
import {
  NormalizedProjectProps,
  NormalizerResult,
  normalizeYamlConfig,
  getNormalizeCommonFields,
  getOptionalArrayField,
  getOptionalListField,
  getInvalidUrlsOrHostsError,
  getUnsupportedKeysError,
  getHasTLSFields,
} from './common_fields';

export const getNormalizeTCPFields = ({
  locations = [],
  privateLocations = [],
  monitor,
  projectId,
  namespace,
  version,
}: NormalizedProjectProps): NormalizerResult<TCPFields> => {
  const defaultFields = DEFAULT_FIELDS[MonitorTypeEnum.TCP];
  const errors = [];
  const { yamlConfig, unsupportedKeys } = normalizeYamlConfig(monitor);

  const { errors: commonErrors, normalizedFields: commonFields } = getNormalizeCommonFields({
    locations,
    privateLocations,
    monitor,
    projectId,
    namespace,
    version,
  });

  // Add common erros to errors arary
  errors.push(...commonErrors);

  /* Check if monitor has multiple hosts */
  const hosts = getOptionalListField(monitor.hosts);
  if (hosts.length !== 1) {
    errors.push(getInvalidUrlsOrHostsError(monitor, 'hosts', version));
  }

  if (unsupportedKeys.length) {
    errors.push(getUnsupportedKeysError(monitor, unsupportedKeys, version));
  }

  const normalizedFields = {
    ...yamlConfig,
    ...commonFields,
    [ConfigKey.MONITOR_TYPE]: MonitorTypeEnum.TCP,
    [ConfigKey.FORM_MONITOR_TYPE]: FormMonitorType.TCP,
    [ConfigKey.HOSTS]:
      getOptionalArrayField(monitor[ConfigKey.HOSTS]) || defaultFields[ConfigKey.HOSTS],
    [ConfigKey.TLS_VERSION]: get(monitor, ConfigKey.TLS_VERSION)
      ? (getOptionalListField(get(monitor, ConfigKey.TLS_VERSION)) as TLSVersion[])
      : defaultFields[ConfigKey.TLS_VERSION],
    [ConfigKey.METADATA]: {
      ...DEFAULT_FIELDS[MonitorTypeEnum.TCP][ConfigKey.METADATA],
      is_tls_enabled: getHasTLSFields(monitor),
    },
  };
  return {
    normalizedFields: {
      ...defaultFields,
      ...normalizedFields,
    },
    unsupportedKeys,
    errors,
  };
};
