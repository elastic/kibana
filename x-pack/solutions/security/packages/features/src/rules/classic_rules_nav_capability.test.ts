/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Capabilities } from '@kbn/core-capabilities-common';
import {
  hasClassicAlertsReadCapability,
  hasClassicRulesReadCapability,
} from '@kbn/rule-data-utils';
import * as featureConstants from '../constants';

const SECURITY_RULES_FEATURE_IDS = Object.entries(featureConstants)
  .filter(([name]) => /^RULES_FEATURE_ID_V\d+$/.test(name))
  .map(([, featureId]) => featureId as string);

const capabilitiesFor = (featureId: string): Capabilities =>
  ({
    navLinks: {},
    [featureId]: { [featureConstants.RULES_UI_READ]: true },
  } as unknown as Capabilities);

describe('security rules features covered by the Observability rules and alerts gates', () => {
  it('discovers every registered rules feature id, including the latest', () => {
    expect(SECURITY_RULES_FEATURE_IDS.length).toBeGreaterThan(0);
    expect(SECURITY_RULES_FEATURE_IDS).toContain(featureConstants.RULES_FEATURE_LATEST);
  });

  it.each(SECURITY_RULES_FEATURE_IDS)(
    'treats %s read_rules as classic rule and alert read',
    (featureId) => {
      const capabilities = capabilitiesFor(featureId);

      expect(hasClassicRulesReadCapability(capabilities)).toBe(true);
      expect(hasClassicAlertsReadCapability(capabilities)).toBe(true);
    }
  );
});
