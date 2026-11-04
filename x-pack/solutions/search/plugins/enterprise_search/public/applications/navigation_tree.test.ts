/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createLocation } from 'history';
import { firstValueFrom, of } from 'rxjs';

import { coreMock } from '@kbn/core/public/mocks';
import type { NavigationTreeDefinition, NodeDefinition } from '@kbn/core-chrome-browser';
import { STACK_MANAGEMENT_NAV_ID } from '@kbn/deeplinks-management';

import { getNavigationTreeDefinition } from '../navigation_tree';

const getStackManagement = async (canSave = false): Promise<NodeDefinition | undefined> => {
  const core = coreMock.createStart();
  core.settings.globalClient.get.mockReturnValue(false);
  core.application.capabilities = { ...core.application.capabilities, actions: { save: canSave } };
  core.application.getUrlForApp.mockReturnValue(
    'http://localhost:5601/app/management/insightsAndAlerting/triggersActionsConnectors/connectors/build'
  );

  const definition = getNavigationTreeDefinition({
    core,
    dynamicItems$: of({}),
    isCloudEnabled: false,
  });
  const { footer } = (await firstValueFrom(definition.navigationTree$)) as NavigationTreeDefinition;

  if (canSave) {
    expect(core.application.getUrlForApp).toHaveBeenCalledWith('management', {
      path: 'insightsAndAlerting/triggersActionsConnectors/connectors/build',
      absolute: true,
    });
  }

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

  it('includes Stack Rules in Stack Management > Alerts and Insights', async () => {
    const stackManagement = await getStackManagement();
    const alertsSection = stackManagement?.children?.find(
      (item) => item.id === 'alerts_and_insights'
    ) as NodeDefinition | undefined;
    const alertsLinks = alertsSection?.children?.map((item) => item.link) ?? [];

    expect(alertsLinks).toContain('management:triggersActions');
  });

  it('links to the connector type builder directly after Connectors when saving is allowed', async () => {
    const stackManagement = await getStackManagement(true);
    const alertsSection = stackManagement?.children?.find(
      (item) => item.id === 'alerts_and_insights'
    );
    const children = alertsSection?.children ?? [];
    const connectorsIndex = children.findIndex(
      (item) => item.link === 'management:triggersActionsConnectors'
    );

    expect(children[connectorsIndex + 1]).toEqual(
      expect.objectContaining({
        id: 'connector_type_builder',
        title: 'Connector type builder',
        href: 'http://localhost:5601/app/management/insightsAndAlerting/triggersActionsConnectors/connectors/build',
      })
    );
    const builderPath =
      '/app/management/insightsAndAlerting/triggersActionsConnectors/connectors/build';
    const activeParams = {
      pathNameSerialized: builderPath,
      location: createLocation(builderPath),
      prepend: (path: string) => path,
    };
    expect(children[connectorsIndex].getIsActive?.(activeParams)).toBe(false);
    expect(children[connectorsIndex + 1].getIsActive?.(activeParams)).toBe(true);
  });

  it('hides the connector type builder when saving is not allowed', async () => {
    const stackManagement = await getStackManagement();
    const alertsSection = stackManagement?.children?.find(
      (item) => item.id === 'alerts_and_insights'
    );

    expect(alertsSection?.children).not.toContainEqual(
      expect.objectContaining({ id: 'connector_type_builder' })
    );
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
