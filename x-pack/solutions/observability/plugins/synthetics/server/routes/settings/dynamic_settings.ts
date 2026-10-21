/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';

import { z } from '@kbn/zod';
import { MAX_ROUTE_STRING_LENGTH } from '../zod_query';
import {
  fromSettingsAttribute,
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
import { canManageClusterSettings } from './cluster_settings_privileges';

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

    const rebalanceChanged =
      rebalancePrivateLocationShardsEnabled != null &&
      rebalancePrivateLocationShardsEnabled !==
        (await getRebalancePrivateLocationShardsEnabled(server.pluginsStart.taskManager));

    if (rebalanceChanged && !(await canManageClusterSettings(server, request))) {
      return response.forbidden({
        body: {
          message: i18n.translate('xpack.synthetics.settings.clusterSettings.forbidden', {
            defaultMessage:
              'Changing private location shard rebalancing requires the "Can manage private locations" privilege in all spaces.',
          }),
        },
      }) as never;
    }

    const prevSettings = await getSyntheticsDynamicSettings(savedObjectsClient);
    const { rebalancePrivateLocationShardsEnabled: _ignoredRebalance, ...prevWithoutRebalance } =
      prevSettings;

    const attr = await setSyntheticsDynamicSettings(savedObjectsClient, {
      ...prevWithoutRebalance,
      ...otherSettings,
    } as DynamicSettingsAttributes);

    let persistedRebalance = true;
    if (rebalanceChanged) {
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

const emailList = z.array(z.string().max(MAX_ROUTE_STRING_LENGTH)).max(1000);

export const DynamicSettingsSchema = z.strictObject({
  certAgeThreshold: z.number().int().min(1).optional(),
  certExpirationThreshold: z.number().int().min(1).optional(),
  defaultConnectors: z.array(z.string().max(MAX_ROUTE_STRING_LENGTH)).max(1000).optional(),
  defaultStatusRuleEnabled: z.boolean().optional(),
  defaultTLSRuleEnabled: z.boolean().optional(),
  rebalancePrivateLocationShardsEnabled: z.boolean().optional(),
  defaultEmail: z
    .strictObject({
      to: emailList,
      cc: emailList.optional(),
      bcc: emailList.optional(),
    })
    .optional(),
  // Ignored: MW changes now wake the sync task via runSoon. Kept so older clients don't 400.
  privateLocationsSyncInterval: z.number().max(1440).optional(),
});
