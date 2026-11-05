/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esqlProfileResponseSchema } from '@elastic/esql-definitions/profile-schema';
import type { EsqlProfileResponse } from '@kbn/esql-language';
import type { z } from '@kbn/zod/v4';
import { fromJSONSchema } from '@kbn/zod/v4/from_json_schema';

export const esqlProfileResponseValidator = fromJSONSchema(
  esqlProfileResponseSchema as unknown as Record<string, unknown>
) as z.ZodType<EsqlProfileResponse> | undefined;
