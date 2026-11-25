/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApiClientFixture } from '@kbn/scout-security';

// Inlined: Playwright's esbuild cannot load the managed YAML behind @kbn/workflows/managed.
export const RULE_TUNING_REVIEW_WORKFLOW_ID = 'system-security-rule-tuning-review';
export const APPLIED_TAG = 'detection-watch:tuning-applied';
export const DISMISSED_TAG = 'detection-watch:tuning-dismissed';

export const INTERNAL_V1_HEADERS = {
  'kbn-xsrf': 'true',
  'x-elastic-internal-origin': 'kibana',
  'elastic-api-version': '1',
};

export const expectStatus = (
  what: string,
  { statusCode, body }: { statusCode: number; body: unknown },
  accepted: number[] = [200]
): void => {
  if (!accepted.includes(statusCode)) {
    throw new Error(`${what}: status ${statusCode} ${JSON.stringify(body)}`);
  }
};

export interface RuleTuningSpaceArgs {
  apiClient: ApiClientFixture;
  headers: Record<string, string>;
  spaceId: string;
}
