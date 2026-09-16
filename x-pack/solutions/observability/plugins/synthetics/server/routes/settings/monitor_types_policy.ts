/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';
import { MANAGE_MONITOR_POLICY_API } from '../../feature';
import { MonitorTypeEnum } from '../../../common/runtime_types';
import { SYNTHETICS_API_URLS } from '../../../common/constants';
import { buildMultiSpaceSettingsRepository } from '../../services/allowed_monitor_types';
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

const MAX_SHARED_SPACES = 500;

export interface MonitorTypesPolicy {
  allowedMonitorTypes: string[];
  spaces: string[];
}

// Read-only view of the current policy + the spaces it applies to. Available to any
// Synthetics reader so the settings UI can render current state.
export const getMonitorTypesPolicyRoute: SyntheticsRestApiRouteFactory<
  MonitorTypesPolicy
> = () => ({
  method: 'GET',
  path: SYNTHETICS_API_URLS.MONITOR_TYPES_POLICY,
  validate: false,
  handler: async ({ server, request }) => {
    const settings = await buildMultiSpaceSettingsRepository(server, request).get();
    return { allowedMonitorTypes: settings.allowedMonitorTypes ?? [], spaces: settings.spaces };
  },
});

// Editing the per-space monitor-type allow-list is gated behind the dedicated
// `manage-monitor-policy` privilege so monitor writers (base `all`) cannot widen the policy
// that constrains them. The policy is stored on the shared multi-space settings object and
// can be applied across multiple spaces, like the remote clusters settings.
export const editMonitorTypesPolicyRoute: SyntheticsRestApiRouteFactory<
  MonitorTypesPolicy
> = () => ({
  method: 'PUT',
  path: SYNTHETICS_API_URLS.MONITOR_TYPES_POLICY,
  writeAccess: false,
  requiredPrivileges: [MANAGE_MONITOR_POLICY_API],
  validate: {
    body: schema.object({
      allowedMonitorTypes: AllowedMonitorTypesSchema,
      // Spaces the policy should apply to. `*` means all spaces. Omitted keeps the current set.
      spaces: schema.maybe(
        schema.arrayOf(schema.string({ minLength: 1 }), { minSize: 1, maxSize: MAX_SHARED_SPACES })
      ),
    }),
  },
  handler: async ({ server, request }) => {
    const { allowedMonitorTypes, spaces } = request.body;
    const repository = buildMultiSpaceSettingsRepository(server, request);

    // Send only the field we're changing; the repository merges over the stored object,
    // preserving co-located settings (e.g. CCS remote clusters). Reading first would be
    // wrong here — a space-scoped read can miss the globally-shared object and return
    // defaults that would then overwrite the real stored values.
    const saved = await repository.save({ allowedMonitorTypes }, spaces);

    return { allowedMonitorTypes: saved.allowedMonitorTypes ?? [], spaces: saved.spaces };
  },
});
