/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  WORKFLOWS_EXECUTIVE_DEMO_EPICS,
  buildWorkflowsExecutiveDemoDocuments,
} from './workflows_executive_demo_seed';

describe('workflows_executive_demo_seed', () => {
  it('builds seven deck epics for the executive Workflows roadmap', () => {
    const documents = buildWorkflowsExecutiveDemoDocuments();

    expect(documents).toHaveLength(WORKFLOWS_EXECUTIVE_DEMO_EPICS.length);
    expect(documents[0]?.doc.roadmap).toMatchObject({
      id: 'workflows',
      title: 'Elastic Workflows & Automation',
    });
    expect(documents[0]?.doc.release).toMatchObject({
      deck_bucket: 'released_9_3',
      milestone: '9.3',
    });
    expect(documents[0]?.doc.rollup).toMatchObject({ status: 'closed', coverage_pct: 100 });
  });
});
