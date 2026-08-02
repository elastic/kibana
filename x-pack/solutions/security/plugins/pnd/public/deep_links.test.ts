/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SecurityPageName } from '@kbn/deeplinks-security';
import { getPndDeepLinks } from './deep_links';

describe('getPndDeepLinks', () => {
  it('registers Throughline deep links without Discover or Dashboards stubs', () => {
    const ids = getPndDeepLinks().map((link) => link.id);

    expect(ids).toEqual([
      SecurityPageName.pndChats,
      SecurityPageName.alerts,
      SecurityPageName.attacks,
      SecurityPageName.pndRecords,
      SecurityPageName.pndThreatHunt,
      SecurityPageName.pndStreams,
      SecurityPageName.pndWatches,
    ]);
  });

  it('does NOT register a Discover stub, because the platform owns Discover', () => {
    const ids = getPndDeepLinks().map((link) => link.id);

    expect(ids).not.toContain('discover');
  });

  it('does NOT register a Dashboards stub, because Security owns dashboards', () => {
    const ids = getPndDeepLinks().map((link) => link.id);

    expect(ids).not.toContain('dashboards');
  });

  it('does NOT register a "more" overflow entry', () => {
    const ids = getPndDeepLinks().map((link) => link.id);

    expect(ids).not.toContain('more');
  });
});
