/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup } from '@kbn/core/server';
import { RuleType } from '@kbn/alerting-plugin/server';
import { getManagementRuleDetailsFullPath } from '@kbn/rule-data-utils';
import { FixtureStartDeps, FixtureSetupDeps } from './plugin';

export function defineAlertTypes(
  core: CoreSetup<FixtureStartDeps>,
  { alerting }: Pick<FixtureSetupDeps, 'alerting'>
) {
  const noopRestrictedAlertType: RuleType<{}, {}, {}, {}, {}, 'default', 'restrictedRecovered'> = {
    id: 'test.restricted-noop',
    name: 'Test: Restricted Noop',
    actionGroups: [{ id: 'default', name: 'Default' }],
    producer: 'alertsRestrictedFixture',
    defaultActionGroupId: 'default',
    minimumLicenseRequired: 'basic',
    isExportable: true,
    recoveryActionGroup: { id: 'restrictedRecovered', name: 'Restricted Recovery' },
    async executor() {},
    getRulePagePath: getManagementRuleDetailsFullPath,
  };
  const noopUnrestrictedAlertType: RuleType<{}, {}, {}, {}, {}, 'default'> = {
    id: 'test.unrestricted-noop',
    name: 'Test: Unrestricted Noop',
    actionGroups: [{ id: 'default', name: 'Default' }],
    producer: 'alertsRestrictedFixture',
    defaultActionGroupId: 'default',
    minimumLicenseRequired: 'basic',
    isExportable: true,
    async executor() {},
    getRulePagePath: getManagementRuleDetailsFullPath,
  };
  alerting.registerType(noopRestrictedAlertType);
  alerting.registerType(noopUnrestrictedAlertType);
}
