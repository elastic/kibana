/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreSetup } from 'src/core/server';
import { FixtureStartDeps, FixtureSetupDeps } from './plugin';
import { AlertType, AlertExecutorOptions } from '../../../../../../../plugins/alerts/server';

export function defineAlertTypes(
  core: CoreSetup<FixtureStartDeps>,
  { alerts }: Pick<FixtureSetupDeps, 'alerts'>
) {
  const noopRestrictedAlertType: AlertType = {
    id: 'test.restricted-noop',
    name: 'Test: Restricted Noop',
    actionGroups: [{ id: 'default', name: 'Default' }],
    producer: 'alertsRestrictedFixture',
    defaultActionGroupId: 'default',
    async executor({ services, params, state }: AlertExecutorOptions) {},
  };
  const noopUnrestrictedAlertType: AlertType = {
    id: 'test.unrestricted-noop',
    name: 'Test: Unrestricted Noop',
    actionGroups: [{ id: 'default', name: 'Default' }],
    producer: 'alertsRestrictedFixture',
    defaultActionGroupId: 'default',
    async executor({ services, params, state }: AlertExecutorOptions) {},
  };
  alerts.registerType(noopRestrictedAlertType);
  alerts.registerType(noopUnrestrictedAlertType);
}
