/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { EncryptedSavedObjectsPluginSetup } from '@kbn/encrypted-saved-objects-plugin/server';
import type { SavedObjectsType } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';
import { attributesToIncludeInAAD } from './synthetics_monitor_config';
import { monitorConfigMappings } from './monitor_mappings';
import { legacySyntheticsMonitorTypeSingle } from '../../../common/types/saved_objects';
import { LegacyConfigKey, secretKeys } from '../../../common/constants/monitor_management';
import { monitorMigrations } from '../migrations/monitors';

export const LEGACY_SYNTHETICS_MONITOR_ENCRYPTED_TYPE_SINGLE = {
  type: legacySyntheticsMonitorTypeSingle,
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

export const getLegacySyntheticsMonitorSavedObjectType = (
  encryptedSavedObjects: EncryptedSavedObjectsPluginSetup
): SavedObjectsType => {
  return {
    name: legacySyntheticsMonitorTypeSingle,
    hidden: false,
    namespaceType: 'single',
    hiddenFromHttpApis: true,
    migrations: {
      '8.6.0': monitorMigrations['8.6.0'](encryptedSavedObjects),
      '8.8.0': monitorMigrations['8.8.0'](encryptedSavedObjects),
      '8.9.0': monitorMigrations['8.9.0'](encryptedSavedObjects),
    },
    mappings: monitorConfigMappings,
    management: {
      importableAndExportable: false,
      icon: 'uptimeApp',
      getTitle: (savedObject) =>
        i18n.translate('xpack.synthetics.syntheticsMonitors.label.name', {
          defaultMessage: '{name} - Synthetics - Monitor',
          values: { name: savedObject.attributes.name },
        }),
    },
    modelVersions: {
      '1': {
        changes: [
          {
            type: 'mappings_addition',
            addedMappings: {
              config_id: { type: 'keyword' },
            },
          },
        ],
      },
      '2': {
        changes: [
          {
            type: 'mappings_addition',
            addedMappings: {
              maintenance_windows: { type: 'keyword' },
            },
          },
        ],
      },
    },
  };
};

export const LEGACY_SYNTHETICS_MONITOR_ENCRYPTED_TYPE = {
  type: legacySyntheticsMonitorTypeSingle,
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
  attributesToIncludeInAAD: new Set([
    LegacyConfigKey.SOURCE_ZIP_URL,
    LegacyConfigKey.SOURCE_ZIP_USERNAME,
    LegacyConfigKey.SOURCE_ZIP_PASSWORD,
    LegacyConfigKey.SOURCE_ZIP_FOLDER,
    LegacyConfigKey.SOURCE_ZIP_PROXY_URL,
    LegacyConfigKey.ZIP_URL_TLS_CERTIFICATE_AUTHORITIES,
    LegacyConfigKey.ZIP_URL_TLS_CERTIFICATE,
    LegacyConfigKey.ZIP_URL_TLS_KEY,
    LegacyConfigKey.ZIP_URL_TLS_KEY_PASSPHRASE,
    LegacyConfigKey.ZIP_URL_TLS_VERIFICATION_MODE,
    LegacyConfigKey.ZIP_URL_TLS_VERSION,
    LegacyConfigKey.THROTTLING_CONFIG,
    LegacyConfigKey.IS_THROTTLING_ENABLED,
    LegacyConfigKey.DOWNLOAD_SPEED,
    LegacyConfigKey.UPLOAD_SPEED,
    LegacyConfigKey.LATENCY,
    ...attributesToIncludeInAAD,
  ]),
};
