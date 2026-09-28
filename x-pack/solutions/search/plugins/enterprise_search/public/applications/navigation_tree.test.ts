/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { firstValueFrom, of } from 'rxjs';

import { coreMock } from '@kbn/core/public/mocks';
import type { NavigationTreeDefinition, NodeDefinition } from '@kbn/core-chrome-browser';
import { STACK_MANAGEMENT_NAV_ID } from '@kbn/deeplinks-management';

import { getNavigationTreeDefinition } from '../navigation_tree';

const getStackManagement = async (): Promise<NodeDefinition | undefined> => {
  const core = coreMock.createStart();
  core.settings.globalClient.get.mockReturnValue(false);

  const definition = getNavigationTreeDefinition({
    core,
    dynamicItems$: of({}),
    isCloudEnabled: false,
  });
  const { footer } = (await firstValueFrom(definition.navigationTree$)) as NavigationTreeDefinition;

  return footer?.find((item) => item.id === STACK_MANAGEMENT_NAV_ID);
};

describe('Elasticsearch solution navigation tree', () => {
  it('includes Stack Alerts in Stack Management > Alerts and Insights', async () => {
    const stackManagement = await getStackManagement();
    const alertsSection = stackManagement?.children?.find(
      (item) => item.id === 'alerts_and_insights'
    ) as NodeDefinition | undefined;
    const alertsLinks = alertsSection?.children?.map((item) => item.link) ?? [];

    expect(alertsLinks).toContain('management:triggersActionsAlerts');
  });

  it('includes service accounts in Stack Management > Security', async () => {
    const stackManagement = await getStackManagement();
    const securitySection = stackManagement?.children?.find(({ children }) =>
      children?.some(({ link }) => link === 'management:role_mappings')
    );

    expect(securitySection?.children).toContainEqual(
      expect.objectContaining({ link: 'management:service_accounts' })
    );
  });
});
