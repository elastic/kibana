/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DefendInsightType as ExternalDefendInsightType } from '@kbn/elastic-assistant-common';
import type { DefendInsight as ExternalDefendInsight } from '@kbn/elastic-assistant-common';
import { WORKFLOW_INSIGHT_TYPE_VALUES } from './workflow_insights';
import type { DefendInsight } from './workflow_insights';

/**
 * Drift-detection tests: validate that the local canonical types stay in sync
 * with @kbn/elastic-assistant-common during the deprecation period.
 * Remove these tests when the @kbn/elastic-assistant-common dependency is
 * fully eliminated from security_solution.
 */
describe('workflow insight type sync with @kbn/elastic-assistant-common', () => {
  it('WORKFLOW_INSIGHT_TYPE_VALUES matches DefendInsightType.options', () => {
    expect([...WORKFLOW_INSIGHT_TYPE_VALUES].sort()).toEqual(
      [...ExternalDefendInsightType.options].sort()
    );
  });

  it('local DefendInsight is structurally compatible with external DefendInsight', () => {
    // Compile-time check: a local DefendInsight must be assignable to the external type.
    // If the external schema adds a required field, this will fail to compile.
    const local: DefendInsight = { group: 'test' };
    const external: ExternalDefendInsight = local;
    expect(external).toBeDefined();
  });
});
