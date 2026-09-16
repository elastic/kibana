/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';
import {
  getSyntheticsDynamicSettings,
  setSyntheticsDynamicSettings,
} from '../../saved_objects/synthetics_settings';
import { MANAGE_MONITOR_TYPES_API } from '../../feature';
import { MonitorTypeEnum } from '../../../common/runtime_types';
import { SYNTHETICS_API_URLS } from '../../../common/constants';
import type { DynamicSettingsAttributes } from '../../runtime_types/settings';
import type { SyntheticsRestApiRouteFactory } from '../types';

const AllowedMonitorTypesSchema = schema.arrayOf(
  schema.oneOf([
    schema.literal(MonitorTypeEnum.HTTP),
    schema.literal(MonitorTypeEnum.TCP),
    schema.literal(MonitorTypeEnum.ICMP),
    schema.literal(MonitorTypeEnum.BROWSER),
    schema.literal(MonitorTypeEnum.API),
  ]),
  { maxSize: 10 }
);

// Editing the per-space monitor-type allow-list is gated behind the dedicated
// `manage-monitor-types` privilege so that monitor writers (base `all`) cannot
// widen the policy that constrains them.
export const editMonitorTypesPolicyRoute: SyntheticsRestApiRouteFactory<{
  allowedMonitorTypes: string[];
}> = () => ({
  method: 'PUT',
  path: SYNTHETICS_API_URLS.MONITOR_TYPES_POLICY,
  writeAccess: false,
  requiredPrivileges: [MANAGE_MONITOR_TYPES_API],
  validate: {
    body: schema.object({
      allowedMonitorTypes: AllowedMonitorTypesSchema,
    }),
  },
  handler: async ({ savedObjectsClient, request }) => {
    const { allowedMonitorTypes } = request.body;
    const prevSettings = await getSyntheticsDynamicSettings(savedObjectsClient);

    const attr = (await setSyntheticsDynamicSettings(savedObjectsClient, {
      ...prevSettings,
      allowedMonitorTypes,
    })) as DynamicSettingsAttributes;

    return { allowedMonitorTypes: attr.allowedMonitorTypes ?? [] };
  },
});
