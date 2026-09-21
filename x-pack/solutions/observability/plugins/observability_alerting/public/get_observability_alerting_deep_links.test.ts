/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppDeepLinkLocations, Capabilities } from '@kbn/core/public';
import {
  OBSERVABILITY_ALERTING_ACTION_POLICIES_DEEP_LINK_ID,
  OBSERVABILITY_ALERTING_ALERTS_DEEP_LINK_ID,
  OBSERVABILITY_ALERTING_EXECUTION_HISTORY_DEEP_LINK_ID,
  OBSERVABILITY_ALERTING_RULE_LIBRARY_DEEP_LINK_ID,
  OBSERVABILITY_ALERTING_RULES_V1_DEEP_LINK_ID,
  OBSERVABILITY_ALERTING_RULES_V2_DEEP_LINK_ID,
} from './constants';
import { getObservabilityAlertingDeepLinks } from './get_observability_alerting_deep_links';

const SEARCHABLE: AppDeepLinkLocations[] = ['globalSearch', 'projectSideNav'];

const capabilities = (features: Record<string, Record<string, boolean>>): Capabilities =>
  ({
    navLinks: {},
    management: {},
    catalogue: {},
    ...features,
  } as Capabilities);

const visibleInById = (caps?: Capabilities): Record<string, AppDeepLinkLocations[] | undefined> =>
  Object.fromEntries(
    getObservabilityAlertingDeepLinks(caps).map((link) => [link.id, link.visibleIn])
  );

describe('getObservabilityAlertingDeepLinks', () => {
  it('marks every surface searchable when capabilities are omitted', () => {
    expect(visibleInById()).toEqual({
      [OBSERVABILITY_ALERTING_ALERTS_DEEP_LINK_ID]: SEARCHABLE,
      [OBSERVABILITY_ALERTING_RULES_V1_DEEP_LINK_ID]: SEARCHABLE,
      [OBSERVABILITY_ALERTING_RULES_V2_DEEP_LINK_ID]: SEARCHABLE,
      [OBSERVABILITY_ALERTING_RULE_LIBRARY_DEEP_LINK_ID]: SEARCHABLE,
      [OBSERVABILITY_ALERTING_ACTION_POLICIES_DEEP_LINK_ID]: SEARCHABLE,
      [OBSERVABILITY_ALERTING_EXECUTION_HISTORY_DEEP_LINK_ID]: SEARCHABLE,
    });
  });

  it('hides every surface from search when the user has no alerting privileges', () => {
    expect(visibleInById(capabilities({}))).toEqual({
      [OBSERVABILITY_ALERTING_ALERTS_DEEP_LINK_ID]: [],
      [OBSERVABILITY_ALERTING_RULES_V1_DEEP_LINK_ID]: [],
      [OBSERVABILITY_ALERTING_RULES_V2_DEEP_LINK_ID]: [],
      [OBSERVABILITY_ALERTING_RULE_LIBRARY_DEEP_LINK_ID]: [],
      [OBSERVABILITY_ALERTING_ACTION_POLICIES_DEEP_LINK_ID]: [],
      [OBSERVABILITY_ALERTING_EXECUTION_HISTORY_DEEP_LINK_ID]: [],
    });
  });

  describe('v2-only users', () => {
    it('offers only Alerts to a v2 alerts-read user', () => {
      expect(visibleInById(capabilities({ alerting_v2_alerts: { read: true } }))).toEqual({
        [OBSERVABILITY_ALERTING_ALERTS_DEEP_LINK_ID]: SEARCHABLE,
        [OBSERVABILITY_ALERTING_RULES_V1_DEEP_LINK_ID]: [],
        [OBSERVABILITY_ALERTING_RULES_V2_DEEP_LINK_ID]: [],
        [OBSERVABILITY_ALERTING_RULE_LIBRARY_DEEP_LINK_ID]: [],
        [OBSERVABILITY_ALERTING_ACTION_POLICIES_DEEP_LINK_ID]: [],
        [OBSERVABILITY_ALERTING_EXECUTION_HISTORY_DEEP_LINK_ID]: [],
      });
    });

    it('offers Rules V2 but not Rules V1 to a v2 rules-read user', () => {
      expect(visibleInById(capabilities({ alerting_v2_rules: { read: true } }))).toEqual({
        [OBSERVABILITY_ALERTING_ALERTS_DEEP_LINK_ID]: [],
        [OBSERVABILITY_ALERTING_RULES_V1_DEEP_LINK_ID]: [],
        [OBSERVABILITY_ALERTING_RULES_V2_DEEP_LINK_ID]: SEARCHABLE,
        [OBSERVABILITY_ALERTING_RULE_LIBRARY_DEEP_LINK_ID]: SEARCHABLE,
        [OBSERVABILITY_ALERTING_ACTION_POLICIES_DEEP_LINK_ID]: [],
        [OBSERVABILITY_ALERTING_EXECUTION_HISTORY_DEEP_LINK_ID]: [],
      });
    });

    it('offers Rules V2 and Rule Library when the user has v2 rules write', () => {
      expect(
        visibleInById(capabilities({ alerting_v2_rules: { all: true, read: true } }))
      ).toEqual({
        [OBSERVABILITY_ALERTING_ALERTS_DEEP_LINK_ID]: [],
        [OBSERVABILITY_ALERTING_RULES_V1_DEEP_LINK_ID]: [],
        [OBSERVABILITY_ALERTING_RULES_V2_DEEP_LINK_ID]: SEARCHABLE,
        [OBSERVABILITY_ALERTING_RULE_LIBRARY_DEEP_LINK_ID]: SEARCHABLE,
        [OBSERVABILITY_ALERTING_ACTION_POLICIES_DEEP_LINK_ID]: [],
        [OBSERVABILITY_ALERTING_EXECUTION_HISTORY_DEEP_LINK_ID]: [],
      });
    });

    it('offers Action Policies and Execution History on their own v2 read flags', () => {
      expect(
        visibleInById(capabilities({ alerting_v2_action_policies: { read: true } }))[
          OBSERVABILITY_ALERTING_ACTION_POLICIES_DEEP_LINK_ID
        ]
      ).toEqual(SEARCHABLE);
      expect(
        visibleInById(capabilities({ alerting_v2_execution_history: { read: true } }))[
          OBSERVABILITY_ALERTING_EXECUTION_HISTORY_DEEP_LINK_ID
        ]
      ).toEqual(SEARCHABLE);
    });
  });

  describe('v1-only users', () => {
    it('offers Alerts and Rules V1 to a v1 logs user', () => {
      expect(visibleInById(capabilities({ logs: { show: true } }))).toEqual({
        [OBSERVABILITY_ALERTING_ALERTS_DEEP_LINK_ID]: SEARCHABLE,
        [OBSERVABILITY_ALERTING_RULES_V1_DEEP_LINK_ID]: SEARCHABLE,
        [OBSERVABILITY_ALERTING_RULES_V2_DEEP_LINK_ID]: [],
        [OBSERVABILITY_ALERTING_RULE_LIBRARY_DEEP_LINK_ID]: SEARCHABLE,
        [OBSERVABILITY_ALERTING_ACTION_POLICIES_DEEP_LINK_ID]: [],
        [OBSERVABILITY_ALERTING_EXECUTION_HISTORY_DEEP_LINK_ID]: [],
      });
    });

    it('offers Alerts but not Rules V1 to a v1 observabilityAlerts-only user', () => {
      expect(visibleInById(capabilities({ observabilityAlerts: { show: true } }))).toEqual({
        [OBSERVABILITY_ALERTING_ALERTS_DEEP_LINK_ID]: SEARCHABLE,
        [OBSERVABILITY_ALERTING_RULES_V1_DEEP_LINK_ID]: [],
        [OBSERVABILITY_ALERTING_RULES_V2_DEEP_LINK_ID]: [],
        [OBSERVABILITY_ALERTING_RULE_LIBRARY_DEEP_LINK_ID]: [],
        [OBSERVABILITY_ALERTING_ACTION_POLICIES_DEEP_LINK_ID]: [],
        [OBSERVABILITY_ALERTING_EXECUTION_HISTORY_DEEP_LINK_ID]: [],
      });
    });

    it('offers Alerts and Rules V1 to a v1 apm navLink user', () => {
      expect(visibleInById(capabilities({ navLinks: { apm: true } }))).toEqual({
        [OBSERVABILITY_ALERTING_ALERTS_DEEP_LINK_ID]: SEARCHABLE,
        [OBSERVABILITY_ALERTING_RULES_V1_DEEP_LINK_ID]: SEARCHABLE,
        [OBSERVABILITY_ALERTING_RULES_V2_DEEP_LINK_ID]: [],
        [OBSERVABILITY_ALERTING_RULE_LIBRARY_DEEP_LINK_ID]: SEARCHABLE,
        [OBSERVABILITY_ALERTING_ACTION_POLICIES_DEEP_LINK_ID]: [],
        [OBSERVABILITY_ALERTING_EXECUTION_HISTORY_DEEP_LINK_ID]: [],
      });
    });
  });

  describe('mixed v1 + v2 users', () => {
    it('offers both Rules V1 and V2 when the user has v1 logs and v2 rules read', () => {
      const result = visibleInById(
        capabilities({ logs: { show: true }, alerting_v2_rules: { read: true } })
      );
      expect(result[OBSERVABILITY_ALERTING_RULES_V1_DEEP_LINK_ID]).toEqual(SEARCHABLE);
      expect(result[OBSERVABILITY_ALERTING_RULES_V2_DEEP_LINK_ID]).toEqual(SEARCHABLE);
    });
  });
});
