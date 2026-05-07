/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Bulk PATCH endpoint for Synthetics monitors.
 *
 * Named `update_monitor_bulk` to mirror the URL path word `_bulk_update`,
 * matching the file→path convention used by `delete_monitor_bulk.ts` /
 * `reset_monitor_bulk.ts`. The plugin's internal vocabulary uses `edit`
 * (e.g. `editSyntheticsMonitorRoute`, `syncEditedMonitorBulk`); we keep
 * `update` here to (a) match the URL path and (b) avoid colliding with
 * `bulk_cruds/edit_monitor_bulk.ts`, which is the helper module that exports
 * `syncEditedMonitorBulk` (the orchestrator this route will reuse).
 *
 * Step 1 ships the route surface only — schema, registration, 501 placeholder.
 * Behaviour is wired in subsequent commits.
 */

import { schema } from '@kbn/config-schema';
import { SYNTHETICS_API_URLS } from '../../../../common/constants';
import type { SyntheticsRestApiRouteFactory } from '../../types';

export const updateSyntheticsMonitorBulkRoute: SyntheticsRestApiRouteFactory<
  Record<string, never>,
  Record<string, string>,
  Record<string, string>,
  { ids: string[]; attributes: Record<string, unknown> }
> = () => ({
  method: 'PATCH',
  path: SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_BULK_UPDATE,
  validate: {},
  validation: {
    request: {
      body: schema.object({
        ids: schema.arrayOf(schema.string(), { minSize: 1 }),
        attributes: schema.object({}, { unknowns: 'allow' }),
      }),
    },
  },
  handler: async ({ response }) => {
    return response.customError({
      statusCode: 501,
      body: { message: 'Bulk update endpoint not implemented yet' },
    });
  },
});
