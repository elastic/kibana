/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FixtureSetupDeps } from './plugin';
import { AlertType, AlertExecutorOptions } from '../../../../../../../plugins/alerts/server';
import { AlertsFeatureId } from '../../../../../../../plugins/alerts/common';

export function defineFakeBuiltinAlertTypes({ alerts }: Pick<FixtureSetupDeps, 'alerts'>) {
  const noopBuiltinAlertType: AlertType = {
    id: 'test.fake-built-in',
    name: 'Test: Fake Built-in Noop',
    actionGroups: [{ id: 'default', name: 'Default' }],
    // this is a fake built in!
    // privileges are special cased for built-in alerts
    producer: AlertsFeatureId,
    defaultActionGroupId: 'default',
    async executor({ services, params, state }: AlertExecutorOptions) {},
  };
  alerts.registerType(noopBuiltinAlertType);
}
