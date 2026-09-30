/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Capabilities } from '@kbn/core/public';
import { SecurityPageName } from '@kbn/deeplinks-security';
import { getAlertZeroDeepLinks } from './deep_links';

const ALL_LINK_IDS = [
  SecurityPageName.alerts,
  SecurityPageName.attacks,
  SecurityPageName.alertZeroThreatHunt,
  SecurityPageName.alertZeroStreams,
  SecurityPageName.alertZeroEscalations,
  SecurityPageName.alertZeroWatches,
];

describe('getAlertZeroDeepLinks', () => {
  it('registers the AlertZero pages without Discover or Dashboards stubs when no capabilities are passed', () => {
    const ids = getAlertZeroDeepLinks().map((link) => link.id);

    expect(ids).toEqual(ALL_LINK_IDS);
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

  it('includes the escalations link when showEscalations capability is true', () => {
    const capabilities = {
      agenticInvestigations: { showEscalations: true },
    } as unknown as Capabilities;

    const ids = getAlertZeroDeepLinks(capabilities).map((link) => link.id);

    expect(ids).toEqual(ALL_LINK_IDS);
    expect(ids).toContain(SecurityPageName.alertZeroEscalations);
  });

  it('omits the escalations link when showEscalations capability is false', () => {
    const capabilities = {
      agenticInvestigations: { showEscalations: false },
    } as unknown as Capabilities;

    const ids = getAlertZeroDeepLinks(capabilities).map((link) => link.id);

    expect(ids).not.toContain(SecurityPageName.alertZeroEscalations);
    // Other links should still be present.
    expect(ids).toContain(SecurityPageName.alerts);
    expect(ids).toContain(SecurityPageName.alertZeroWatches);
  });

  it('includes the escalations link when agenticInvestigations capability namespace is absent', () => {
    // A deployment where the plugin is not installed; capabilities block is missing entirely.
    const capabilities = {} as unknown as Capabilities;

    const ids = getAlertZeroDeepLinks(capabilities).map((link) => link.id);

    expect(ids).toContain(SecurityPageName.alertZeroEscalations);
  });
});
