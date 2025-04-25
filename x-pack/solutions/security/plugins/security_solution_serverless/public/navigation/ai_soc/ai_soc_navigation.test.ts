/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createAiSocNavigationTree$ } from './ai_soc_navigation';

describe('createAiSocNavigationTree$', () => {
  it('includes callout section', (done) => {
    const navigationTree$ = createAiSocNavigationTree$();

    navigationTree$.subscribe((navigationTree) => {
      expect(navigationTree.callout).toBeDefined();
      expect(navigationTree.callout?.length).toBe(1);

      // Type assertions to avoid TypeScript errors
      const calloutGroup = navigationTree.callout?.[0] as {
        id: string;
        children: Array<{ id: string }>;
      };
      expect(calloutGroup.id).toBe('calloutGroup');
      expect(calloutGroup.children[0].id).toBe('ai_soc_callout');
      done();
    });
  });

  it('includes body and footer sections', (done) => {
    const navigationTree$ = createAiSocNavigationTree$();

    navigationTree$.subscribe((navigationTree) => {
      expect(navigationTree.body).toBeDefined();
      expect(navigationTree.body.length).toBeGreaterThan(0);
      expect(navigationTree.footer).toBeDefined();
      expect(navigationTree.footer?.length).toBeGreaterThan(0);
      done();
    });
  });
});
