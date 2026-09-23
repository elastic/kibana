/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createNavigationTree } from './navigation_tree';
import type { CoreStart } from '@kbn/core/public';
import { coreMock } from '@kbn/core/public/mocks';

describe('VectorDB navigation tree', () => {
  let core: CoreStart;

  beforeEach(() => {
    core = coreMock.createStart();
    core.settings.globalClient.get = <T>(_key: string) => false as T;
  });

  it('includes service accounts in Admin and Settings', () => {
    const { footer } = createNavigationTree({
      ...core.application,
      core,
    });
    const adminAndSettingsNode = footer?.find((item) => item.id === 'admin_and_settings');
    const accessSection = adminAndSettingsNode?.children?.find(
      (item) => item.id === 'settings_access'
    );

    expect(accessSection?.children).toContainEqual(
      expect.objectContaining({ link: 'management:service_accounts' })
    );
  });

  it('includes Stack Alerts in Admin and Settings > Alerts and insights', () => {
    const { footer } = createNavigationTree({
      ...core.application,
      core,
    });
    const adminAndSettingsNode = footer?.find((item) => item.id === 'admin_and_settings');
    const alertsSection = adminAndSettingsNode?.children?.find(
      (item) => item.id === 'settings_alerts'
    );

    expect(alertsSection?.children).toContainEqual(
      expect.objectContaining({ link: 'management:triggersActionsAlerts' })
    );
  });
});
