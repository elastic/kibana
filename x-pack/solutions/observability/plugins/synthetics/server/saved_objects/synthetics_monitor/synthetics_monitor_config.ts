/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SavedObjectsType } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';
import { monitorConfigMappings } from './monitor_mappings';
import { syntheticsMonitorSavedObjectType } from '../../../common/types/saved_objects';
import { ConfigKey, secretKeys } from '../../../common/constants/monitor_management';

export const getSyntheticsMonitorConfigSavedObjectType = (): SavedObjectsType => {
  return {
    name: syntheticsMonitorSavedObjectType,
    hidden: false,
    hiddenFromHttpApis: true,
    namespaceType: 'multiple',
    mappings: monitorConfigMappings,
    management: {
      importableAndExportable: false,
      icon: 'uptimeApp',
      getTitle: (savedObject) =>
        i18n.translate('xpack.synthetics.syntheticsMonitors.multiple.label', {
          defaultMessage: '{name} - (Synthetics Monitor)',
          values: { name: savedObject.attributes.name },
        }),
    },
    modelVersions: {},
  };
};

export const attributesToIncludeInAAD = new Set([
  ConfigKey.APM_SERVICE_NAME,
  ConfigKey.CUSTOM_HEARTBEAT_ID,
  ConfigKey.CONFIG_ID,
  ConfigKey.CONFIG_HASH,
  ConfigKey.ENABLED,
  ConfigKey.FORM_MONITOR_TYPE,
  ConfigKey.HOSTS,
  ConfigKey.IGNORE_HTTPS_ERRORS,
  ConfigKey.MONITOR_SOURCE_TYPE,
  ConfigKey.JOURNEY_FILTERS_MATCH,
  ConfigKey.JOURNEY_FILTERS_TAGS,
  ConfigKey.JOURNEY_ID,
  ConfigKey.MAX_REDIRECTS,
  ConfigKey.MODE,
  ConfigKey.MONITOR_TYPE,
  ConfigKey.NAME,
  ConfigKey.NAMESPACE,
  ConfigKey.LOCATIONS,
  ConfigKey.PLAYWRIGHT_OPTIONS,
  ConfigKey.ORIGINAL_SPACE,
  ConfigKey.PORT,
  ConfigKey.PROXY_URL,
  ConfigKey.PROXY_USE_LOCAL_RESOLVER,
  ConfigKey.RESPONSE_BODY_INDEX,
  ConfigKey.RESPONSE_HEADERS_INDEX,
  ConfigKey.RESPONSE_BODY_MAX_BYTES,
  ConfigKey.RESPONSE_STATUS_CHECK,
  ConfigKey.REQUEST_METHOD_CHECK,
  ConfigKey.REVISION,
  ConfigKey.SCHEDULE,
  ConfigKey.SCREENSHOTS,
  ConfigKey.IPV4,
  ConfigKey.IPV6,
  ConfigKey.PROJECT_ID,
  ConfigKey.TEXT_ASSERTION,
  ConfigKey.TLS_CERTIFICATE_AUTHORITIES,
  ConfigKey.TLS_CERTIFICATE,
  ConfigKey.TLS_VERIFICATION_MODE,
  ConfigKey.TLS_VERSION,
  ConfigKey.TAGS,
  ConfigKey.TIMEOUT,
  ConfigKey.THROTTLING_CONFIG,
  ConfigKey.URLS,
  ConfigKey.WAIT,
  ConfigKey.MONITOR_QUERY_ID,
]);

export const SYNTHETICS_MONITOR_ENCRYPTED_TYPE = {
  type: syntheticsMonitorSavedObjectType,
  attributesToEncrypt: new Set([
    'secrets',
    /* adding secretKeys to the list of attributes to encrypt ensures
     * that secrets are never stored on the resulting saved object,
     * even in the presence of developer error.
     *
     * In practice, all secrets should be stored as a single JSON
     * payload on the `secrets` key. This ensures performant decryption. */
    ...secretKeys,
  ]),
  attributesToIncludeInAAD,
};
