/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SecurityPageName } from '@kbn/deeplinks-security';
import { getAlertZeroDeepLinks } from './deep_links';

describe('getAlertZeroDeepLinks', () => {
  it('registers the AlertZero pages without Discover or Dashboards stubs', () => {
    const ids = getAlertZeroDeepLinks().map((link) => link.id);

    expect(ids).toEqual([
      SecurityPageName.alerts,
      SecurityPageName.attacks,
      SecurityPageName.alertZeroThreatHunt,
      SecurityPageName.alertZeroStreams,
      SecurityPageName.alertZeroWatches,
    ]);
    expect(ids).not.toContain('discover');
    expect(ids).not.toContain('dashboards');
    expect(ids).not.toContain('more');
  });

  it('registers no link for a page the app does not route', () => {
    // Chats and Records were placeholder routes; a deep link outliving its route is a dead
    // sidebar entry and a dead global-search hit.
    const paths = getAlertZeroDeepLinks().map((link) => link.path);

    expect(paths).not.toContain('/chats');
    expect(paths).not.toContain('/records');
  });
});
