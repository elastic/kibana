/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { SecurityPageName } from '@kbn/security-solution-navigation';
import { allowedExperimentalValues } from '../../../common/experimental_features';
import { appLinks, getAppLinks } from './app_links';
import type { LinkItem, AppLinkItems } from '../../common/links/types';

const traverse = (linksItems: AppLinkItems, fn: (link: LinkItem) => void) => {
  linksItems.forEach((link) => {
    fn(link);
    if (link.links) {
      traverse(link.links, fn);
    }
  });
};

describe('Security app links', () => {
  it('should only contain static paths', () => {
    traverse(appLinks, (link) => {
      expect(link.path).not.toContain('/:');
    });
  });

  describe('getAppLinks', () => {
    it('returns the Detections link and hides Attack Discovery from navigation when `enableAlertsAndAttacksAlignment` is enabled', () => {
      const result = getAppLinks({
        ...allowedExperimentalValues,
        enableAlertsAndAttacksAlignment: true,
      });

      const resultIds = result.map(({ id }) => id);
      expect(resultIds).toContain(SecurityPageName.alertDetections);
      expect(resultIds).not.toContain(SecurityPageName.alerts);
      const attackDiscoveryLink = result.find(({ id }) => id === SecurityPageName.attackDiscovery);
      expect(attackDiscoveryLink?.sideNavDisabled).toBe(true);
      expect(attackDiscoveryLink?.globalSearchDisabled).toBe(true);
      expect(attackDiscoveryLink?.globalNavPosition).toBeUndefined();
    });

    it('returns the legacy Alerts and Attack Discovery links when `enableAlertsAndAttacksAlignment` is disabled', () => {
      const result = getAppLinks({
        ...allowedExperimentalValues,
        enableAlertsAndAttacksAlignment: false,
      });

      expect(result).toEqual(appLinks);
    });

    it('returns a frozen array', () => {
      expect(Object.isFrozen(getAppLinks(allowedExperimentalValues))).toBe(true);
    });
  });
});
