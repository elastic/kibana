/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ATTACK_DISCOVERY_FEATURE_ID, SecurityPageName } from '../../common/constants';
import { ALERTS_UI_READ_PRIVILEGE } from '@kbn/security-solution-features/constants';
import { alertDetectionsLinks } from './links';
import type { LinkItem } from '../common/links/types';

describe('detections links', () => {
  describe('attacks sub-link', () => {
    const attacksSubLink = alertDetectionsLinks.links?.find(
      ({ id }) => id === SecurityPageName.attacks
    ) as LinkItem;

    it('is registered as a sub-link of the detections link', () => {
      expect(attacksSubLink).toBeDefined();
    });

    it('for self managed, it requires an enterprise license', () => {
      expect(attacksSubLink.licenseType).toEqual('enterprise');
    });

    it('for serverless, it specifies capabilities as an AND condition, via a nested array', () => {
      expect(attacksSubLink.capabilities).toEqual<string[][]>([
        [ALERTS_UI_READ_PRIVILEGE, `${ATTACK_DISCOVERY_FEATURE_ID}.attack-discovery`],
      ]);
    });
  });
});
