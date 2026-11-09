/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import {
  NIGHTSHIFT_API_PRIVILEGES,
  NIGHTSHIFT_MANAGE_AND_CONFIGURE_API_PRIVILEGES,
} from '@kbn/nightshift-shared';
import {
  MAX_RUN_LIMIT,
  MIN_RUN_LIMIT,
  RUN_QUOTA_GROUPS,
  type RunQuotaGroup,
  type RunQuotaSettingsPatch,
  type RunQuotasResponse,
} from '../../../../common/run_quotas';
import { createServerRoute } from '../../create_server_route';
import { assertSignificantEventsAccess } from '../../utils/assert_significant_events_access';
import {
  assertCanManageRunQuotas,
  canManageRunQuotas,
  consumeRunQuota,
  createRunQuotaInternalRepository,
  dayKey,
  patchRunQuotaSettings,
  readRunQuotaLedger,
  readRunQuotaSettings,
  resolveDailyWindow,
  type RunQuotaSavedObjectsRepository,
  type RunQuotaSettingsAttributes,
} from '../../../lib/run_quotas';

const investigationLimitUpdateSchema = lazySchema(() =>
  z
    .number()
    .int()
    .min(MIN_RUN_LIMIT + 1)
    .max(MAX_RUN_LIMIT)
    .nullable()
    .optional()
);

const investigationLimitsUpdateShape = {
  investigation: investigationLimitUpdateSchema,
  manual_investigation: investigationLimitUpdateSchema,
  total_investigation: investigationLimitUpdateSchema,
};

const limitsUpdateSchema = lazySchema(() =>
  z
    .object({
      detection: z.number().int().min(MIN_RUN_LIMIT).max(MAX_RUN_LIMIT).optional(),
      ...investigationLimitsUpdateShape,
      ki_extraction: z.number().int().min(MIN_RUN_LIMIT).max(MAX_RUN_LIMIT).optional(),
    })
    .strict()
    .refine((limits) => Object.values(limits).some((limit) => limit !== undefined), {
      message: 'At least one run limit is required',
    })
);

const activateLimitsSchema = z
  .object({
    detection: z
      .number()
      .int()
      .min(MIN_RUN_LIMIT + 1)
      .max(MAX_RUN_LIMIT)
      .optional(),
    investigation: z
      .number()
      .int()
      .min(MIN_RUN_LIMIT + 1)
      .max(MAX_RUN_LIMIT)
      .optional(),
    ki_extraction: z
      .number()
      .int()
      .min(MIN_RUN_LIMIT + 1)
      .max(MAX_RUN_LIMIT)
      .optional(),
  })
  .strict()
  .refine((limits) => Object.values(limits).some((limit) => limit !== undefined), {
    message: 'At least one run limit to activate is required',
  });

const settingsUpdateSchema = lazySchema(() =>
  z.union([
    z
      .object({
        enabled: z.boolean().optional(),
        investigationLimitsEnabled: z.boolean().optional(),
        limits: limitsUpdateSchema.optional(),
      })
      .strict()
      .refine(
        (update) =>
          update.enabled !== undefined ||
          update.investigationLimitsEnabled !== undefined ||
          update.limits !== undefined,
        { message: 'At least one run quota setting is required' }
      ),
    z
      .object({
        activateLimits: activateLimitsSchema,
        investigationLimitsEnabled: z.boolean().optional(),
        limits: z.object(investigationLimitsUpdateShape).strict().optional(),
      })
      .strict(),
  ])
);

const consumeRequestSchema = z.discriminatedUnion('group', [
  z.object({ group: z.literal('detection') }).strict(),
  z.object({ group: z.literal('ki_extraction') }).strict(),
  z.object({ group: z.literal('investigation') }).strict(),
]);

const toStoredLimits = (
  limits: Partial<Record<RunQuotaGroup, number | null>>
): Partial<Record<RunQuotaGroup, number>> =>
  Object.fromEntries(
    Object.entries(limits).flatMap(([group, limit]) =>
      limit === undefined ? [] : [[group, limit ?? MIN_RUN_LIMIT]]
    )
  );

const toStoredPatch = (body: z.infer<typeof settingsUpdateSchema>): RunQuotaSettingsPatch => {
  if ('activateLimits' in body) {
    const { limits: investigationLimits, ...activation } = body;
    return {
      ...activation,
      ...(investigationLimits ? { limits: toStoredLimits(investigationLimits) } : {}),
    };
  }
  const { limits, ...rest } = body;
  return { ...rest, ...(limits ? { limits: toStoredLimits(limits) } : {}) };
};

const readRunQuotaSnapshot = async ({
  internalRepository,
  settings,
  now,
  canManage,
}: {
  internalRepository: RunQuotaSavedObjectsRepository;
  settings: RunQuotaSettingsAttributes;
  now: Date;
  canManage: boolean;
}): Promise<RunQuotasResponse> => {
  const window = resolveDailyWindow(now);
  const date = dayKey(window);
  const ledgers = await Promise.all(
    RUN_QUOTA_GROUPS.map((group) => readRunQuotaLedger(internalRepository, date, group))
  );

  return {
    enabled: settings.enabled,
    investigationLimitsEnabled: settings.investigationLimitsEnabled,
    limits: Object.fromEntries(
      RUN_QUOTA_GROUPS.map((group) => [group, settings.limits[group]])
    ) as Record<RunQuotaGroup, number>,
    counts: Object.fromEntries(
      RUN_QUOTA_GROUPS.map((group, index) => [group, ledgers[index].count])
    ) as Record<RunQuotaGroup, number>,
    window,
    canManage,
  };
};

const getRunQuotasRoute = createServerRoute({
  endpoint: 'GET /internal/significant_events/run_quotas',
  options: {
    access: 'internal',
    summary: 'Get Significant Events daily run limits and usage',
  },
  security: {
    authz: {
      requiredPrivileges: [NIGHTSHIFT_API_PRIVILEGES.read],
    },
  },
  params: z.object({}),
  handler: async ({ request, server, getScopedClients }) => {
    const { licensing } = await getScopedClients({ request });
    await assertSignificantEventsAccess({ server, licensing });
    const now = new Date();
    const internalRepository = createRunQuotaInternalRepository(server);
    const [settings, canManage] = await Promise.all([
      readRunQuotaSettings(internalRepository),
      canManageRunQuotas({ request, server }),
    ]);

    return readRunQuotaSnapshot({ internalRepository, settings, now, canManage });
  },
});

const putRunQuotasRoute = createServerRoute({
  endpoint: 'PUT /internal/significant_events/run_quotas',
  options: {
    access: 'internal',
    summary: 'Update Significant Events daily run limits',
  },
  security: {
    authz: {
      requiredPrivileges: NIGHTSHIFT_MANAGE_AND_CONFIGURE_API_PRIVILEGES,
    },
  },
  params: z.object({
    body: settingsUpdateSchema,
  }),
  handler: async ({ params, request, server, getScopedClients }) => {
    const { licensing } = await getScopedClients({ request });
    await assertSignificantEventsAccess({ server, licensing });
    await assertCanManageRunQuotas({ request, server });
    const now = new Date();
    const internalRepository = createRunQuotaInternalRepository(server);
    const { body } = params;
    const patch = toStoredPatch(body);
    const settings = await patchRunQuotaSettings(internalRepository, patch);

    return readRunQuotaSnapshot({
      internalRepository,
      settings,
      now,
      canManage: true,
    });
  },
});

const consumeRoute = createServerRoute({
  endpoint: 'POST /internal/significant_events/run_quotas/_consume',
  options: {
    access: 'internal',
    summary: 'Consume one Significant Events scheduled run quota',
  },
  security: {
    authz: {
      requiredPrivileges: [NIGHTSHIFT_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    body: consumeRequestSchema,
  }),
  handler: async ({ params, request, server, getScopedClients }) => {
    const { licensing } = await getScopedClients({ request });
    await assertSignificantEventsAccess({ server, licensing });
    return consumeRunQuota({
      internalRepository: createRunQuotaInternalRepository(server),
      group: params.body.group,
    });
  },
});

export const internalRunQuotaRoutes = {
  ...getRunQuotasRoute,
  ...putRunQuotasRoute,
  ...consumeRoute,
};
