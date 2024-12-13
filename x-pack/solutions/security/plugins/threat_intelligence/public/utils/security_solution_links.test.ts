/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { threatIntelligencePages } from '../constants/navigation';
import { getSecuritySolutionLink } from './security_solution_links';

describe('getSecuritySolutionLink', () => {
  it('gets the correct link properties', () => {
    const threatIntelligencePage = 'indicators';

    const link = getSecuritySolutionLink(threatIntelligencePage);

    expect(link.description).toEqual(threatIntelligencePages[threatIntelligencePage].description);
    expect(link.globalSearchKeywords).toEqual(
      threatIntelligencePages[threatIntelligencePage].globalSearchKeywords
    );
    expect(link.id).toEqual(threatIntelligencePages[threatIntelligencePage].id);
    expect(link.path).toEqual(threatIntelligencePages[threatIntelligencePage].path);
    expect(link.title).toEqual(threatIntelligencePages[threatIntelligencePage].newNavigationName);
  });
});
