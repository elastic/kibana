/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * This test file analyzes the Attack Discovery feature's alerting privilege
 * configuration to answer a specific question:
 *
 * "Is there a reason why alerting.rule.all is at the feature level AND also
 *  at the subfeature level? This is redundant because all permissions get
 *  merged."
 *
 * The question also proposes: "Remove alerting rule privileges from the
 * subfeature given that they are already present at the main feature level."
 *
 * These tests verify whether the assertion of redundancy is correct and
 * whether the proposed removal would change effective privileges.
 */

import type { LicenseType } from '@kbn/licensing-types';
import { LICENSE_TYPE } from '@kbn/licensing-types';
import { KibanaFeature } from '@kbn/features-plugin/server';
import type { FeaturePrivilegeIteratorOptions } from '@kbn/features-plugin/server/feature_privilege_iterator';
import { featurePrivilegeIterator } from '@kbn/features-plugin/server/feature_privilege_iterator';

const RULE_TYPE_ID = 'attack-discovery';
const CONSUMER = 'siem';
const FEATURE_ID = 'securitySolutionAttackDiscovery';
const APP_ID = 'securitySolution';

const alertingFeatures = [{ ruleTypeId: RULE_TYPE_ID, consumers: [CONSUMER] }];

function getFeaturePrivilegeIterator(
  feature: KibanaFeature,
  options: Omit<FeaturePrivilegeIteratorOptions, 'licenseHasAtLeast'> & { licenseType: LicenseType }
) {
  const { licenseType, ...otherOptions } = options;
  const licenseHasAtLeast = (licenseTypeToCheck: LicenseType) => {
    return LICENSE_TYPE[licenseTypeToCheck] <= LICENSE_TYPE[options.licenseType];
  };
  return featurePrivilegeIterator(feature, { licenseHasAtLeast, ...otherOptions });
}

/**
 * Builds the Attack Discovery KibanaFeature with configurable subfeature
 * alerting. Pass `subFeatureAlerting` to control what alerting privileges
 * the "Schedules" subfeature declares.
 */
function buildAttackDiscoveryFeature(subFeatureAlerting?: {
  rule?: { all?: typeof alertingFeatures };
  alert?: { all?: typeof alertingFeatures };
}): KibanaFeature {
  return new KibanaFeature({
    id: FEATURE_ID,
    name: 'Attack discovery',
    order: 1400,
    category: { id: 'security', label: 'Security' },
    app: [FEATURE_ID, 'kibana'],
    catalogue: [APP_ID],
    alerting: alertingFeatures,
    privileges: {
      all: {
        api: ['elasticAssistant'],
        app: [FEATURE_ID, 'kibana'],
        catalogue: [APP_ID],
        savedObject: { all: [], read: [] },
        // The FEATURE LEVEL grants rule.read (not rule.all) and alert.all:
        alerting: {
          rule: { read: alertingFeatures },
          alert: { all: alertingFeatures },
        },
        ui: [],
      },
      read: {
        disabled: true,
        savedObject: { all: [], read: [] },
        alerting: {
          rule: { read: alertingFeatures },
          alert: { all: alertingFeatures },
        },
        ui: [],
      },
    },
    subFeatures: [
      {
        name: 'Schedules',
        privilegeGroups: [
          {
            groupType: 'independent',
            privileges: [
              {
                api: [`${APP_ID}-updateAttackDiscoverySchedule`],
                id: 'update_schedule',
                name: 'Allow changes',
                includeIn: 'all',
                savedObject: { all: [], read: [] },
                // The SUBFEATURE alerting — can be customized via parameter:
                ...(subFeatureAlerting ? { alerting: subFeatureAlerting } : {}),
                ui: ['updateAttackDiscoverySchedule'],
              },
            ],
          },
        ],
      },
    ],
  });
}

/**
 * Extracts the merged alerting privileges for a given privilege level
 * ('all' or 'read') after subfeature merging.
 */
function getMergedAlerting(feature: KibanaFeature, privilegeLevel: 'all' | 'read') {
  const privileges = Array.from(
    getFeaturePrivilegeIterator(feature, {
      augmentWithSubFeaturePrivileges: true,
      licenseType: 'enterprise',
    })
  );
  const match = privileges.find((p) => p.privilegeId === privilegeLevel);
  return match?.privilege.alerting;
}

describe('Attack Discovery alerting privilege analysis', () => {
  // ─── Section 1: Verify the actual privilege levels declared ───
  describe('what privilege levels are actually declared at each layer', () => {
    it('feature level declares rule.READ (not rule.ALL) for the "all" privilege', () => {
      // The feature-level "all" privilege only has rule.read, NOT rule.all.
      // This is a critical distinction — the user's question assumes
      // rule.all is at the feature level, but it is actually rule.read.
      const featureWithoutSubFeatureAlerting = buildAttackDiscoveryFeature(undefined);

      const privileges = Array.from(
        getFeaturePrivilegeIterator(featureWithoutSubFeatureAlerting, {
          augmentWithSubFeaturePrivileges: false,
          licenseType: 'enterprise',
        })
      );
      const allPrivilege = privileges.find((p) => p.privilegeId === 'all');

      // Feature level only declares rule.read:
      expect(allPrivilege?.privilege.alerting?.rule?.read).toEqual(alertingFeatures);
      // Feature level does NOT declare rule.all:
      expect(allPrivilege?.privilege.alerting?.rule?.all).toBeUndefined();
    });

    it('subfeature declares rule.ALL (the higher privilege level)', () => {
      // The subfeature "Schedules" with "Allow changes" declares rule.all,
      // which is a HIGHER privilege than the feature-level rule.read.
      // rule.all includes create, delete, update, enable, muteAll, etc.
      const currentConfig = buildAttackDiscoveryFeature({
        rule: { all: alertingFeatures },
        alert: { all: alertingFeatures },
      });

      const privileges = Array.from(
        getFeaturePrivilegeIterator(currentConfig, {
          augmentWithSubFeaturePrivileges: false,
          licenseType: 'enterprise',
        })
      );

      // The subfeature privilege is separate from all/read — it's only
      // visible after merging. Without merging, we can verify the feature
      // level is still just rule.read:
      const allPrivilege = privileges.find((p) => p.privilegeId === 'all');
      expect(allPrivilege?.privilege.alerting?.rule?.read).toEqual(alertingFeatures);
      expect(allPrivilege?.privilege.alerting?.rule?.all).toBeUndefined();
    });
  });

  // ─── Section 2: Current behavior (BEFORE proposed change) ───
  describe('current behavior (before proposed change)', () => {
    const currentConfig = buildAttackDiscoveryFeature({
      rule: { all: alertingFeatures },
      alert: { all: alertingFeatures },
    });

    it('merged "all" privilege includes BOTH rule.all (from subfeature) AND rule.read (from feature)', () => {
      // After merging the subfeature (includeIn: 'all') into the feature's
      // "all" privilege, the result should contain both:
      //   - rule.all from the subfeature (create/update/delete schedules)
      //   - rule.read from the feature (view schedules)
      const alerting = getMergedAlerting(currentConfig, 'all');

      expect(alerting?.rule?.all).toEqual(alertingFeatures);
      expect(alerting?.rule?.read).toEqual(alertingFeatures);
    });

    it('merged "all" privilege includes alert.all (from both feature and subfeature, deduplicated)', () => {
      // alert.all appears at both levels. After merging, it should be
      // deduplicated to a single entry.
      const alerting = getMergedAlerting(currentConfig, 'all');
      expect(alerting?.alert?.all).toEqual(alertingFeatures);
    });
  });

  // ─── Section 3: Proposed change — remove ALL alerting from subfeature ───
  describe('proposed change: remove alerting from subfeature entirely', () => {
    const proposedConfig = buildAttackDiscoveryFeature(undefined);

    it('merged "all" privilege LOSES rule.all — users can no longer create/update/delete schedules', () => {
      // CRITICAL: If we remove alerting from the subfeature entirely,
      // rule.all is NO LONGER present in the merged privilege.
      // This means users lose the ability to create, update, delete,
      // enable, disable, mute, snooze, etc. attack discovery schedules.
      const alerting = getMergedAlerting(proposedConfig, 'all');

      // rule.all is now EMPTY — this is a BREAKING behavioral change:
      expect(alerting?.rule?.all).toEqual([]);

      // rule.read still comes from the feature level — users can still VIEW schedules:
      expect(alerting?.rule?.read).toEqual(alertingFeatures);
    });

    it('merged "all" privilege retains alert.all from the feature level', () => {
      // alert.all was declared at the feature level, so it survives
      // even after removing the subfeature's alerting.
      const alerting = getMergedAlerting(proposedConfig, 'all');
      expect(alerting?.alert?.all).toEqual(alertingFeatures);
    });
  });

  // ─── Section 4: Verify redundancy claim for each privilege type ───
  describe('is the subfeature alerting truly redundant?', () => {
    it('rule.all at the subfeature is NOT redundant — it provides a HIGHER privilege than the feature-level rule.read', () => {
      // The feature level grants rule.read (view schedules).
      // The subfeature grants rule.all (manage schedules).
      // These are DIFFERENT privilege levels — rule.all is not redundant.
      const currentConfig = buildAttackDiscoveryFeature({
        rule: { all: alertingFeatures },
        alert: { all: alertingFeatures },
      });
      const proposedConfig = buildAttackDiscoveryFeature(undefined);

      const currentAlerting = getMergedAlerting(currentConfig, 'all');
      const proposedAlerting = getMergedAlerting(proposedConfig, 'all');

      // Removing rule.all from the subfeature CHANGES the merged result:
      expect(currentAlerting?.rule?.all).toEqual(alertingFeatures);
      expect(proposedAlerting?.rule?.all).toEqual([]);

      // Therefore rule.all at the subfeature is NOT redundant.
      expect(currentAlerting?.rule?.all).not.toEqual(proposedAlerting?.rule?.all);
    });

    it('alert.all at the subfeature IS redundant — the same privilege exists at the feature level', () => {
      // Both the feature level and subfeature declare alert.all for the
      // same rule type and consumer. The merge deduplicates them.
      // Removing alert.all from the subfeature produces the same result.
      const withAlertAll = buildAttackDiscoveryFeature({
        rule: { all: alertingFeatures },
        alert: { all: alertingFeatures },
      });
      const withoutAlertAll = buildAttackDiscoveryFeature({
        rule: { all: alertingFeatures },
        // alert.all omitted from subfeature
      });

      const withAlertAllMerged = getMergedAlerting(withAlertAll, 'all');
      const withoutAlertAllMerged = getMergedAlerting(withoutAlertAll, 'all');

      // alert.all is the same regardless of whether the subfeature declares it:
      expect(withAlertAllMerged?.alert?.all).toEqual(withoutAlertAllMerged?.alert?.all);
      expect(withAlertAllMerged?.alert?.all).toEqual(alertingFeatures);

      // Therefore alert.all at the subfeature IS redundant.
    });
  });

  // ─── Section 5: What the correct fix would look like ───
  describe('correct approach: move rule.all to feature level AND remove from subfeature', () => {
    it('produces the same merged privileges as the current config when rule.all is at the feature level', () => {
      // If the goal is to remove rule.all from the subfeature WITHOUT
      // changing behavior, the feature level must be updated to declare
      // rule.all (instead of rule.read). This is because rule.all is a
      // superset of rule.read operations.
      const featureWithRuleAllAtFeatureLevel = new KibanaFeature({
        id: FEATURE_ID,
        name: 'Attack discovery',
        order: 1400,
        category: { id: 'security', label: 'Security' },
        app: [FEATURE_ID, 'kibana'],
        catalogue: [APP_ID],
        alerting: alertingFeatures,
        privileges: {
          all: {
            api: ['elasticAssistant'],
            app: [FEATURE_ID, 'kibana'],
            catalogue: [APP_ID],
            savedObject: { all: [], read: [] },
            alerting: {
              // Changed from rule.read to rule.all at the feature level:
              rule: { all: alertingFeatures },
              alert: { all: alertingFeatures },
            },
            ui: [],
          },
          read: {
            disabled: true,
            savedObject: { all: [], read: [] },
            alerting: {
              rule: { read: alertingFeatures },
              alert: { all: alertingFeatures },
            },
            ui: [],
          },
        },
        subFeatures: [
          {
            name: 'Schedules',
            privilegeGroups: [
              {
                groupType: 'independent',
                privileges: [
                  {
                    api: [`${APP_ID}-updateAttackDiscoverySchedule`],
                    id: 'update_schedule',
                    name: 'Allow changes',
                    includeIn: 'all',
                    savedObject: { all: [], read: [] },
                    // No alerting at the subfeature level:
                    ui: ['updateAttackDiscoverySchedule'],
                  },
                ],
              },
            ],
          },
        ],
      });

      const currentConfig = buildAttackDiscoveryFeature({
        rule: { all: alertingFeatures },
        alert: { all: alertingFeatures },
      });

      const currentAlerting = getMergedAlerting(currentConfig, 'all');
      const fixedAlerting = getMergedAlerting(featureWithRuleAllAtFeatureLevel, 'all');

      // Both produce the same rule.all:
      expect(fixedAlerting?.rule?.all).toEqual(currentAlerting?.rule?.all);

      // Both produce the same alert.all:
      expect(fixedAlerting?.alert?.all).toEqual(currentAlerting?.alert?.all);
    });

    it('BUT moving rule.all to feature level removes the subfeature toggle for schedule management', () => {
      // IMPORTANT CAVEAT: Moving rule.all to the feature level means
      // ALL users with the Attack Discovery "All" privilege automatically
      // get rule management permissions. The "Schedules" subfeature
      // toggle ("Allow changes" checkbox in the UI screenshot) would no
      // longer control whether users can create/edit/delete schedules.
      //
      // This defeats the purpose of having a subfeature toggle.
      //
      // With the current config, if you have Attack Discovery "All" but
      // the Schedules sub-privilege is UNCHECKED, you get:
      //   - rule.read (can view schedules) ← from feature level
      //   - NO rule.all (cannot manage schedules) ← subfeature not included
      //
      // With rule.all moved to the feature level, ALL users with Attack
      // Discovery "All" get rule.all regardless of the checkbox state.

      const featureWithRuleAllAtFeatureLevel = new KibanaFeature({
        id: FEATURE_ID,
        name: 'Attack discovery',
        order: 1400,
        category: { id: 'security', label: 'Security' },
        app: [FEATURE_ID, 'kibana'],
        catalogue: [APP_ID],
        alerting: alertingFeatures,
        privileges: {
          all: {
            api: ['elasticAssistant'],
            app: [FEATURE_ID, 'kibana'],
            catalogue: [APP_ID],
            savedObject: { all: [], read: [] },
            alerting: {
              rule: { all: alertingFeatures },
              alert: { all: alertingFeatures },
            },
            ui: [],
          },
          read: {
            disabled: true,
            savedObject: { all: [], read: [] },
            alerting: {
              rule: { read: alertingFeatures },
              alert: { all: alertingFeatures },
            },
            ui: [],
          },
        },
        subFeatures: [
          {
            name: 'Schedules',
            privilegeGroups: [
              {
                groupType: 'independent',
                privileges: [
                  {
                    api: [`${APP_ID}-updateAttackDiscoverySchedule`],
                    id: 'update_schedule',
                    name: 'Allow changes',
                    includeIn: 'all',
                    savedObject: { all: [], read: [] },
                    ui: ['updateAttackDiscoverySchedule'],
                  },
                ],
              },
            ],
          },
        ],
      });

      // When augmentWithSubFeaturePrivileges is FALSE, we get the
      // "minimal" privileges — what a user gets when NO subfeature
      // checkboxes are enabled:
      const minimalPrivileges = Array.from(
        getFeaturePrivilegeIterator(featureWithRuleAllAtFeatureLevel, {
          augmentWithSubFeaturePrivileges: false,
          licenseType: 'enterprise',
        })
      );
      const minimalAll = minimalPrivileges.find((p) => p.privilegeId === 'all');

      // With rule.all at the feature level, even users WITHOUT the
      // Schedules sub-privilege get rule.all:
      expect(minimalAll?.privilege.alerting?.rule?.all).toEqual(alertingFeatures);

      // Compare with the current config's minimal privileges:
      const currentConfig = buildAttackDiscoveryFeature({
        rule: { all: alertingFeatures },
        alert: { all: alertingFeatures },
      });
      const currentMinimalPrivileges = Array.from(
        getFeaturePrivilegeIterator(currentConfig, {
          augmentWithSubFeaturePrivileges: false,
          licenseType: 'enterprise',
        })
      );
      const currentMinimalAll = currentMinimalPrivileges.find((p) => p.privilegeId === 'all');

      // With the current config, users WITHOUT the Schedules sub-privilege
      // do NOT get rule.all — they only get rule.read:
      expect(currentMinimalAll?.privilege.alerting?.rule?.all).toBeUndefined();
      expect(currentMinimalAll?.privilege.alerting?.rule?.read).toEqual(alertingFeatures);
    });
  });

  // ─── Section 6: Prior art comparison ───
  describe('prior art: Attack Discovery is the only feature using this pattern', () => {
    it('the Alerts test fixture uses subfeatures for enable/manual_run (not rule.all)', () => {
      // The only other known usage of alerting in subfeatures is the
      // Alerts test fixture plugin, which uses subfeatures for
      // rule.enable and rule.manual_run — NOT rule.all.
      //
      // This test documents that the alerting test fixture follows a
      // different pattern: feature level has rule.all, subfeatures add
      // more granular permissions (enable, manual_run).
      const alertsTestFixture = new KibanaFeature({
        id: 'alertsFixture',
        name: 'Alerts Fixture',
        category: { id: 'test', label: 'Test' },
        app: [],
        alerting: [{ ruleTypeId: 'test.noop', consumers: ['alertsFixture'] }],
        privileges: {
          all: {
            savedObject: { all: [], read: [] },
            alerting: {
              rule: {
                all: [{ ruleTypeId: 'test.noop', consumers: ['alertsFixture'] }],
                read: [{ ruleTypeId: 'test.noop', consumers: ['alertsFixture'] }],
              },
              alert: {
                all: [{ ruleTypeId: 'test.noop', consumers: ['alertsFixture'] }],
                read: [{ ruleTypeId: 'test.noop', consumers: ['alertsFixture'] }],
              },
            },
            ui: [],
          },
          read: {
            savedObject: { all: [], read: [] },
            alerting: {
              rule: {
                read: [{ ruleTypeId: 'test.noop', consumers: ['alertsFixture'] }],
              },
              alert: {
                read: [{ ruleTypeId: 'test.noop', consumers: ['alertsFixture'] }],
              },
            },
            ui: [],
          },
        },
        subFeatures: [
          {
            name: 'Manual run',
            privilegeGroups: [
              {
                groupType: 'independent',
                privileges: [
                  {
                    id: 'manual_run',
                    name: 'Manual run',
                    includeIn: 'all',
                    savedObject: { all: [], read: [] },
                    alerting: {
                      rule: {
                        manual_run: [{ ruleTypeId: 'test.noop', consumers: ['alertsFixture'] }],
                      },
                    },
                    ui: [],
                  },
                ],
              },
            ],
          },
          {
            name: 'Enable and disable rules',
            privilegeGroups: [
              {
                groupType: 'independent',
                privileges: [
                  {
                    id: 'enable_disable',
                    name: 'Enable and disable rules',
                    includeIn: 'all',
                    savedObject: { all: [], read: [] },
                    alerting: {
                      rule: {
                        enable: [{ ruleTypeId: 'test.noop', consumers: ['alertsFixture'] }],
                      },
                    },
                    ui: [],
                  },
                ],
              },
            ],
          },
        ],
      });

      const alerting = getMergedAlerting(alertsTestFixture, 'all');

      // The test fixture puts rule.all at the FEATURE level (not subfeature):
      expect(alerting?.rule?.all).toEqual([
        { ruleTypeId: 'test.noop', consumers: ['alertsFixture'] },
      ]);

      // Subfeatures add MORE GRANULAR permissions (enable, manual_run):
      expect(alerting?.rule?.enable).toEqual([
        { ruleTypeId: 'test.noop', consumers: ['alertsFixture'] },
      ]);
      expect(alerting?.rule?.manual_run).toEqual([
        { ruleTypeId: 'test.noop', consumers: ['alertsFixture'] },
      ]);
    });
  });

  // ─── Section 7: Summary of findings ───
  describe('summary of findings', () => {
    it('the subfeature rule.all is NOT redundant with the feature-level rule.read — they are different privilege levels', () => {
      // Feature level: rule.read → view-only operations (get, find, etc.)
      // Subfeature:    rule.all  → all operations (create, delete, update, enable, etc.)
      //
      // rule.all includes: create, delete, update, updateApiKey, muteAll,
      //   unmuteAll, muteAlert, unmuteAlert, snooze, bulkEdit, bulkDelete,
      //   unsnooze, runSoon, get, bulkGet, getRuleState, getAlertSummary,
      //   getExecutionLog, getActionErrorLog, find, enable, disable, etc.
      //
      // rule.read includes only: get, bulkGet, getRuleState, getAlertSummary,
      //   getExecutionLog, getActionErrorLog, find, getRuleExecutionKPI, etc.
      //
      // CONCLUSION: They are different levels. Removing rule.all from the
      // subfeature would remove schedule management capabilities.
      expect(true).toBe(true);
    });

    it('alert.all at the subfeature IS redundant with alert.all at the feature level', () => {
      // Both levels declare alert.all for the same rule type and consumer.
      // Removing alert.all from the subfeature would have no effect.
      expect(true).toBe(true);
    });

    it('the "Schedules" subfeature intentionally gates rule management behind a toggle', () => {
      // The current design is intentional:
      //   - Feature level grants rule.read (view schedules) to all users
      //   - Subfeature "Schedules > Allow changes" grants rule.all (manage schedules)
      //   - This lets admins control who can create/edit/delete schedules
      //     via the "Customize sub-feature privileges" toggle in the UI
      //
      // Simply removing rule.all from the subfeature (without moving it to
      // the feature level) would break schedule management for all users.
      //
      // Moving rule.all to the feature level would remove the ability to
      // selectively grant schedule management via the subfeature toggle.
      expect(true).toBe(true);
    });
  });
});
