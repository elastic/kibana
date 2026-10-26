/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core/public';
import { ALERTING_V2_RULE_API_PATH } from '@kbn/alerting-v2-constants';
import type { FindRulesResponse } from '@kbn/alerting-v2-schemas';

export async function hasUniversalAlertingRules({ http }: { http: HttpSetup }) {
  const { total } = await http.get<FindRulesResponse>(ALERTING_V2_RULE_API_PATH, {
    query: { page: 1, per_page: 1 },
  });

  return total > 0;
}
