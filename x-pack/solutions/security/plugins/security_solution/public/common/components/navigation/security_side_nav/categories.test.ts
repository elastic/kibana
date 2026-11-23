/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AIChatExperience } from '@kbn/ai-assistant-common';
import { SecurityPageName } from '../../../../../common';
import { getNavCategories } from './categories';

const getAllLinkIds = (enableAlertsAndAttacksAlignment?: boolean) =>
  getNavCategories(AIChatExperience.Classic, enableAlertsAndAttacksAlignment).flatMap(
    ({ linkIds }) => linkIds
  );

describe('getNavCategories', () => {
  describe('when alerts and attacks alignment is enabled', () => {
    it('lists Detections instead of Alerts', () => {
      const linkIds = getAllLinkIds(true);

      expect(linkIds).toContain(SecurityPageName.alertDetections);
      expect(linkIds).not.toContain(SecurityPageName.alerts);
    });

    it('does not list the legacy Attack Discovery page', () => {
      expect(getAllLinkIds(true)).not.toContain(SecurityPageName.attackDiscovery);
    });
  });

  describe('when alerts and attacks alignment is disabled', () => {
    it('lists Alerts instead of Detections', () => {
      const linkIds = getAllLinkIds(false);

      expect(linkIds).toContain(SecurityPageName.alerts);
      expect(linkIds).not.toContain(SecurityPageName.alertDetections);
    });

    it('lists the legacy Attack Discovery page', () => {
      expect(getAllLinkIds(false)).toContain(SecurityPageName.attackDiscovery);
    });
  });

  it('lists Agents after Detections for the Agent chat experience', () => {
    const linkIds = getNavCategories(AIChatExperience.Agent, true).flatMap(
      ({ linkIds: ids }) => ids
    );

    expect(linkIds.indexOf(SecurityPageName.externalLinkAgentBuilder)).toBeGreaterThan(
      linkIds.indexOf(SecurityPageName.alertDetections)
    );
  });

  it('lists the legacy Attack Discovery page when alignment is not provided', () => {
    expect(getAllLinkIds()).toContain(SecurityPageName.attackDiscovery);
  });
});
