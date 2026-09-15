/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';

import { schema } from '@kbn/config-schema';
import {
  getSyntheticsDynamicSettings,
  setSyntheticsDynamicSettings,
} from '../../saved_objects/synthetics_settings';
import type { SyntheticsRestApiRouteFactory } from '../types';
import type { DynamicSettings } from '../../../common/runtime_types';
import type { DynamicSettingsAttributes } from '../../runtime_types/settings';
import { SYNTHETICS_API_URLS } from '../../../common/constants';
import { runRebalanceShardsTaskSoon } from '../../tasks/rebalance_private_location_shards_task';
import {
  getRebalancePrivateLocationShardsEnabled,
  setRebalancePrivateLocationShardsEnabled,
} from '../../tasks/rebalance_shards_enabled';

export const createGetDynamicSettingsRoute: SyntheticsRestApiRouteFactory<
  DynamicSettings
> = () => ({
  method: 'GET',
  path: SYNTHETICS_API_URLS.DYNAMIC_SETTINGS,
  validate: false,
  handler: async ({ savedObjectsClient, server }) => {
    const dynamicSettingsAttributes: DynamicSettingsAttributes = await getSyntheticsDynamicSettings(
      savedObjectsClient
    );

    const rebalancePrivateLocationShardsEnabled = await getRebalancePrivateLocationShardsEnabled(
      server.pluginsStart.taskManager
    );

    return {
      ...fromSettingsAttribute(dynamicSettingsAttributes),
      rebalancePrivateLocationShardsEnabled,
    };
  },
});

export const createPostDynamicSettingsRoute: SyntheticsRestApiRouteFactory<
  DynamicSettings
> = () => ({
  method: 'PUT',
  path: SYNTHETICS_API_URLS.DYNAMIC_SETTINGS,
  validate: {
    body: DynamicSettingsSchema,
  },
  writeAccess: true,
  handler: async ({ savedObjectsClient, request, response, server }): Promise<DynamicSettings> => {
    const {
      privateLocationsSyncInterval: _ignoredSyncInterval,
      rebalancePrivateLocationShardsEnabled,
      ...otherSettings
    } = request.body;
    const prevSettings = await getSyntheticsDynamicSettings(savedObjectsClient);
    const { rebalancePrivateLocationShardsEnabled: _ignoredRebalance, ...prevWithoutRebalance } =
      prevSettings;

    const attr = await setSyntheticsDynamicSettings(savedObjectsClient, {
      ...prevWithoutRebalance,
      ...otherSettings,
    } as DynamicSettingsAttributes);

    let persistedRebalance = true;
    if (rebalancePrivateLocationShardsEnabled != null) {
      persistedRebalance = await setRebalancePrivateLocationShardsEnabled(
        server.pluginsStart.taskManager,
        rebalancePrivateLocationShardsEnabled
      );
      // Drain leftover pins (when off) or resume assignment (when on) on the
      // next task cycle — don't block this request on Fleet rewrites.
      void runRebalanceShardsTaskSoon({ server });
    } else {
      persistedRebalance = await getRebalancePrivateLocationShardsEnabled(
        server.pluginsStart.taskManager
      );
    }

    if (
      rebalancePrivateLocationShardsEnabled != null &&
      persistedRebalance !== rebalancePrivateLocationShardsEnabled
    ) {
      return response.conflict({
        body: {
          message: i18n.translate('xpack.synthetics.settings.rebalanceShards.taskRunning', {
            defaultMessage:
              'The rebalance task could not be updated. Please try saving this setting again in a moment.',
          }),
        },
      }) as never;
    }

    return {
      ...fromSettingsAttribute(attr as DynamicSettingsAttributes),
      rebalancePrivateLocationShardsEnabled: persistedRebalance,
    };
  },
});

export const fromSettingsAttribute = (
  attr: DynamicSettingsAttributes
): DynamicSettingsAttributes => {
  return {
    certExpirationThreshold: attr.certExpirationThreshold,
    certAgeThreshold: attr.certAgeThreshold,
    defaultConnectors: attr.defaultConnectors,
    defaultEmail: attr.defaultEmail,
    defaultStatusRuleEnabled: attr.defaultStatusRuleEnabled ?? true,
    defaultTLSRuleEnabled: attr.defaultTLSRuleEnabled ?? true,
  };
};

export const VALUE_MUST_BE_AN_INTEGER = i18n.translate(
  'xpack.synthetics.settings.invalid.nanError',
  {
    defaultMessage: 'Value must be an integer.',
  }
);

export const validateInteger = (value: number): string | undefined => {
  if (value % 1) {
    return VALUE_MUST_BE_AN_INTEGER;
  }
};

export const DynamicSettingsSchema = schema.object({
  certAgeThreshold: schema.maybe(schema.number({ min: 1, validate: validateInteger })),
  certExpirationThreshold: schema.maybe(schema.number({ min: 1, validate: validateInteger })),
  defaultConnectors: schema.maybe(schema.arrayOf(schema.string())),
  defaultStatusRuleEnabled: schema.maybe(schema.boolean()),
  defaultTLSRuleEnabled: schema.maybe(schema.boolean()),
  rebalancePrivateLocationShardsEnabled: schema.maybe(schema.boolean()),
  defaultEmail: schema.maybe(
    schema.object({
      to: schema.arrayOf(schema.string()),
      cc: schema.maybe(schema.arrayOf(schema.string())),
      bcc: schema.maybe(schema.arrayOf(schema.string())),
    })
  ),
  // Ignored: MW changes now wake the sync task via runSoon. Kept so older clients don't 400.
  privateLocationsSyncInterval: schema.maybe(schema.number({ max: 1440 })),
});
