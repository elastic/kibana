/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RecommendedAction } from '@kbn/alertzero-common';
import { CONVERSATION_QUEUE_CATEGORIES } from '@kbn/agentic-investigations-common';

// The zod enum is generated from investigation.schema.yaml; the union it mirrors is
// hand-written in @kbn/agentic-investigations-common. Package-group boundaries
// (platform cannot import security; shared-common cannot import shared-browser)
// rule out a shared definition, so assert the two agree instead.
describe('RecommendedAction vocabulary', () => {
  it('matches the agentic-investigations queue buckets', () => {
    expect(Object.keys(RecommendedAction.enum).sort()).toEqual(
      CONVERSATION_QUEUE_CATEGORIES.map((c) => c.id).sort()
    );
  });
});
