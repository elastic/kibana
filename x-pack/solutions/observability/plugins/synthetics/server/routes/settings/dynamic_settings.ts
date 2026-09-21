/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';

import { z } from '@kbn/zod';
import type { IntervalSchedule } from '@kbn/task-manager-plugin/server';
import { MAX_ROUTE_STRING_LENGTH } from '../zod_query';
import {
  getSyntheticsDynamicSettings,
  setSyntheticsDynamicSettings,
} from '../../saved_objects/synthetics_settings';
import type { SyntheticsRestApiRouteFactory } from '../types';
import type { DynamicSettings } from '../../../common/runtime_types';
import type { DynamicSettingsAttributes } from '../../runtime_types/settings';
import {
  SYNTHETICS_API_URLS,
  MIN_PRIVATE_LOCATIONS_SYNC_INTERVAL,
  MAX_PRIVATE_LOCATIONS_SYNC_INTERVAL,
} from '../../../common/constants';
import {
  DEFAULT_TASK_SCHEDULE,
  PRIVATE_LOCATIONS_SYNC_TASK_ID,
  runSynPrivateLocationMonitorsTaskSoon,
} from '../../tasks/sync_private_locations_monitors_task';
import { runRebalanceShardsTaskSoon } from '../../tasks/rebalance_private_location_shards_task';
import {
  getRebalancePrivateLocationShardsEnabled,
  setRebalancePrivateLocationShardsEnabled,
} from '../../tasks/rebalance_shards_enabled';

const parseIntervalMinutes = (interval: string): number =>
  parseInt(interval, 10) || MIN_PRIVATE_LOCATIONS_SYNC_INTERVAL;

export const createGetDynamicSettingsRoute: SyntheticsRestApiRouteFactory<
  DynamicSettings
> = () => ({
  method: 'GET',
  path: SYNTHETICS_API_URLS.DYNAMIC_SETTINGS,
  validate: false,
  handler: async ({ savedObjectsClient, server }) => {
    const dynamicSettingsAttributes: DynamicSettingsAttributes =
      await getSyntheticsDynamicSettings(savedObjectsClient);

    let privateLocationsSyncInterval = MIN_PRIVATE_LOCATIONS_SYNC_INTERVAL;
    try {
      const task = await server.pluginsStart.taskManager.get(PRIVATE_LOCATIONS_SYNC_TASK_ID);
      const taskInterval = (task.schedule as IntervalSchedule | undefined)?.interval;
      if (taskInterval) {
        privateLocationsSyncInterval = parseIntervalMinutes(taskInterval);
      }
    } catch (_err) {
      // not yet created
    }

    const rebalancePrivateLocationShardsEnabled = await getRebalancePrivateLocationShardsEnabled(
      server.pluginsStart.taskManager
    );

    return {
      ...fromSettingsAttribute(dynamicSettingsAttributes),
      privateLocationsSyncInterval,
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
      privateLocationsSyncInterval,
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

    if (privateLocationsSyncInterval != null) {
      await server.pluginsStart.taskManager.bulkUpdateSchedules([PRIVATE_LOCATIONS_SYNC_TASK_ID], {
        interval: `${privateLocationsSyncInterval}m`,
      });
      // Fire-and-forget: the new interval is already persisted, so a failure to
      // kick the task early only means it starts on its next cycle. Swallow it
      // here (it is already logged) rather than failing the settings write.
      void runSynPrivateLocationMonitorsTaskSoon({ server }).catch(() => {});
    }

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

    let persistedInterval = MIN_PRIVATE_LOCATIONS_SYNC_INTERVAL;
    try {
      const task = await server.pluginsStart.taskManager.get(PRIVATE_LOCATIONS_SYNC_TASK_ID);
      const taskInterval = (task.schedule as IntervalSchedule | undefined)?.interval;
      if (taskInterval) {
        persistedInterval = parseIntervalMinutes(taskInterval);
      }
    } catch (_err) {
      persistedInterval = parseIntervalMinutes(DEFAULT_TASK_SCHEDULE);
    }

    if (
      privateLocationsSyncInterval != null &&
      persistedInterval !== privateLocationsSyncInterval
    ) {
      return response.conflict({
        body: {
          message: i18n.translate('xpack.synthetics.settings.syncInterval.taskRunning', {
            defaultMessage:
              'The sync task is currently running. Please try saving the interval again in a moment.',
          }),
        },
      }) as never;
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
      privateLocationsSyncInterval: persistedInterval,
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
  privateLocationsSyncInterval: z
    .number()
    .int()
    .min(MIN_PRIVATE_LOCATIONS_SYNC_INTERVAL)
    .max(MAX_PRIVATE_LOCATIONS_SYNC_INTERVAL)
    .optional(),
});
