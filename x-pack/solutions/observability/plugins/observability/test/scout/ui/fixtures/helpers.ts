/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApiServicesFixture } from '@kbn/scout-oblt';

/**
 * Get rule ID by name
 * Helper function to find a rule ID by its name
 */
export async function getRuleIdByName(
  apiServices: ApiServicesFixture,
  ruleName: string
): Promise<string | undefined> {
  const rules = await apiServices.alerting.rules.find({ search: ruleName });
  const rule = rules?.data?.data?.find((r: { name: string }) => r.name === ruleName);
  return rule?.id;
}
