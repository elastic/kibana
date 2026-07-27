/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';

import { schema } from '@kbn/config-schema';
import type { IntervalSchedule } from '@kbn/task-manager-plugin/server';
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

const parseIntervalMinutes = (interval: string): number =>
  parseInt(interval, 10) || MIN_PRIVATE_LOCATIONS_SYNC_INTERVAL;

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

    return { ...fromSettingsAttribute(dynamicSettingsAttributes), privateLocationsSyncInterval };
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
    const { privateLocationsSyncInterval, ...otherSettings } = request.body;
    const prevSettings = await getSyntheticsDynamicSettings(savedObjectsClient);

    const attr = await setSyntheticsDynamicSettings(savedObjectsClient, {
      ...prevSettings,
      ...otherSettings,
    } as DynamicSettingsAttributes);

    if (privateLocationsSyncInterval != null) {
      await server.pluginsStart.taskManager.bulkUpdateSchedules([PRIVATE_LOCATIONS_SYNC_TASK_ID], {
        interval: `${privateLocationsSyncInterval}m`,
      });
      void runSynPrivateLocationMonitorsTaskSoon({ server });
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

    return {
      ...fromSettingsAttribute(attr as DynamicSettingsAttributes),
      privateLocationsSyncInterval: persistedInterval,
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
  defaultEmail: schema.maybe(
    schema.object({
      to: schema.arrayOf(schema.string()),
      cc: schema.maybe(schema.arrayOf(schema.string())),
      bcc: schema.maybe(schema.arrayOf(schema.string())),
    })
  ),
  privateLocationsSyncInterval: schema.maybe(
    schema.number({
      min: MIN_PRIVATE_LOCATIONS_SYNC_INTERVAL,
      max: MAX_PRIVATE_LOCATIONS_SYNC_INTERVAL,
      validate: validateInteger,
    })
  ),
});
