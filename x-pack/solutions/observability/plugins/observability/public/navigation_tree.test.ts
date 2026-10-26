/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { firstValueFrom, of } from 'rxjs';
import { AIChatExperience } from '@kbn/ai-assistant-common';
import type { NavigationTreeDefinition, NodeDefinition } from '@kbn/core-chrome-browser';
import { coreMock } from '@kbn/core/public/mocks';
import { STACK_MANAGEMENT_NAV_ID } from '@kbn/deeplinks-management';
import { createDefinition } from './navigation_tree';
import type { ObservabilityPublicPluginsStart } from './plugin';

const buildPluginsStart = (
  entityInventoryApp?: ObservabilityPublicPluginsStart['entityInventoryApp']
) =>
  ({
    streams: { navigationStatus$: of({ status: 'disabled' as const }) },
    ingestHub: { navigationAvailable$: of(false) },
    cloud: { isCloudEnabled: false },
    entityInventoryApp,
  } as unknown as ObservabilityPublicPluginsStart);

const getInfrastructureSectionChildren = async (
  entityInventoryApp?: ObservabilityPublicPluginsStart['entityInventoryApp']
): Promise<NodeDefinition[]> => {
  const coreStart = coreMock.createStart();
  coreStart.featureFlags.getBooleanValue$ = jest.fn().mockReturnValue(of(false));
  coreStart.settings.client.get$ = jest.fn().mockReturnValue(of(AIChatExperience.Classic));
  coreStart.settings.globalClient.get.mockReturnValue(false);
  coreStart.settings.globalClient.isDeclared.mockReturnValue(true);

  const definition = createDefinition(coreStart, buildPluginsStart(entityInventoryApp));

  const { body } = (await firstValueFrom(definition.navigationTree$)) as NavigationTreeDefinition;
  const metricsSection = body?.find((item) => item.id === 'metrics') as NodeDefinition | undefined;
  return (metricsSection?.children as NodeDefinition[]) ?? [];
};

const getStackManagementSectionLinks = async (
  sectionId: string,
  alertingV2Enabled = false
): Promise<Array<string | undefined>> => {
  const coreStart = coreMock.createStart();
  coreStart.featureFlags.getBooleanValue$ = jest.fn().mockReturnValue(of(false));
  coreStart.settings.client.get$ = jest.fn().mockReturnValue(of(AIChatExperience.Classic));
  coreStart.settings.globalClient.get.mockReturnValue(alertingV2Enabled);
  coreStart.settings.globalClient.isDeclared.mockReturnValue(true);

  const definition = createDefinition(coreStart, {
    streams: { navigationStatus$: of({ status: 'disabled' as const }) },
    ingestHub: { navigationAvailable$: of(false) },
    cloud: { isCloudEnabled: false },
  } as unknown as ObservabilityPublicPluginsStart);

  const { footer } = (await firstValueFrom(definition.navigationTree$)) as NavigationTreeDefinition;
  const stackManagement = footer?.find((item) => item.id === STACK_MANAGEMENT_NAV_ID);
  const section = stackManagement?.children?.find((item) => item.id === sectionId) as
    | NodeDefinition
    | undefined;

  return section?.children?.map((item) => item.link) ?? [];
};

describe('Observability solution navigation tree', () => {
  it('keeps Stack Rules and hides Stack Alerts while alerting v2 is disabled', async () => {
    const alertsLinks = await getStackManagementSectionLinks('alerts_and_insights', false);

    expect(alertsLinks).not.toContain('management:triggersActionsAlerts');
    expect(alertsLinks).toEqual(
      expect.arrayContaining([
        'management:triggersActions',
        'management:triggersActionsConnectors',
        'management:maintenanceWindows',
      ])
    );
  });

  it('hides Stack Alerts and Stack Rules when alerting v2 is enabled', async () => {
    const alertsLinks = await getStackManagementSectionLinks('alerts_and_insights', true);

    expect(alertsLinks).not.toContain('management:triggersActionsAlerts');
    expect(alertsLinks).not.toContain('management:triggersActions');
    expect(alertsLinks).toEqual(
      expect.arrayContaining([
        'management:triggersActionsConnectors',
        'management:maintenanceWindows',
      ])
    );
  });

  it('includes service accounts in Stack Management > Security', async () => {
    const securityLinks = await getStackManagementSectionLinks('security');

    expect(securityLinks).toContain('management:service_accounts');
  });

  describe('Entity Inventory navigation group', () => {
    it('does not include the Entity Inventory group when the plugin is absent', async () => {
      const children = await getInfrastructureSectionChildren(undefined);

      const entityGroup = children.find((item) => item.title === 'Entity Inventory');
      expect(entityGroup).toBeUndefined();
    });

    it('includes the Entity Inventory group with its three links when the plugin is present', async () => {
      const navTreeChildren: NodeDefinition[] = [
        { link: 'entityInventoryApp:allResources' as const },
        { link: 'entityInventoryApp:hosts' as const },
        { link: 'entityInventoryApp:kubernetes' as const },
      ];

      const children = await getInfrastructureSectionChildren({
        navTreeChildren,
      } as unknown as ObservabilityPublicPluginsStart['entityInventoryApp']);

      const entityGroup = children.find((item) => item.title === 'Entity Inventory');
      expect(entityGroup).toBeDefined();
      expect(entityGroup?.children).toEqual(navTreeChildren);
    });

    it('keeps the original Infrastructure links regardless of entity inventory plugin state', async () => {
      const children = await getInfrastructureSectionChildren(undefined);

      const infraGroup = children[0] as NodeDefinition;
      const infraLinks = (infraGroup?.children as NodeDefinition[])?.map((item) => item.link);
      expect(infraLinks).toContain('metrics:inventory');
      expect(infraLinks).toContain('metrics:hosts');
      expect(infraLinks).toContain('metrics:metrics-explorer');
    });
  });
});
