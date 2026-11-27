/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path from 'path';
import { z } from '@kbn/zod';
import { MAX_PARAM_BULK_SIZE, routeId } from '../../zod_query';
import { deleteParams } from './delete_param';
import type { SyntheticsRestApiRouteFactory } from '../../types';
import { SYNTHETICS_API_URLS } from '../../../../common/constants';
import type { DeleteParamsResponse } from '../../../../common/runtime_types';

export const deleteSyntheticsParamsBulkRoute: SyntheticsRestApiRouteFactory<
  DeleteParamsResponse[],
  unknown,
  unknown,
  { ids: string[] }
> = () => ({
  method: 'POST',
  path: SYNTHETICS_API_URLS.PARAMS + '/_bulk_delete',
  options: {
    summary: 'Delete parameters',
    description:
      'Delete parameters from the Synthetics app.\n\nYou must have `all` privileges for the Synthetics feature in the Observability section of the Kibana feature privileges.',
    operationId: 'delete-parameters',
    oasOperationObject: () => path.join(__dirname, 'examples/delete_parameters.yaml'),
  },
  validate: {},
  validation: {
    request: {
      body: z.strictObject({
        ids: z
          .array(routeId)
          .max(MAX_PARAM_BULK_SIZE)
          .describe('An array of parameter IDs to delete.'),
      }),
    },
  },
  handler: async (routeContext) => deleteParams(routeContext, routeContext.request.body.ids),
});
