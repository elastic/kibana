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

const getAlertsAndInsightsLinks = async (): Promise<Array<string | undefined>> => {
  const coreStart = coreMock.createStart();
  coreStart.featureFlags.getBooleanValue$ = jest.fn().mockReturnValue(of(false));
  coreStart.settings.client.get$ = jest.fn().mockReturnValue(of(AIChatExperience.Classic));
  coreStart.settings.globalClient.get.mockReturnValue(false);

  const definition = createDefinition(coreStart, {
    streams: { navigationStatus$: of({ status: 'disabled' as const }) },
    ingestHub: { navigationAvailable$: of(false) },
    cloud: { isCloudEnabled: false },
  } as unknown as ObservabilityPublicPluginsStart);

  const { footer } = (await firstValueFrom(definition.navigationTree$)) as NavigationTreeDefinition;
  const stackManagement = footer?.find((item) => item.id === STACK_MANAGEMENT_NAV_ID);
  const alertsSection = stackManagement?.children?.find(
    (item) => item.id === 'alerts_and_insights'
  ) as NodeDefinition | undefined;

  return alertsSection?.children?.map((item) => item.link) ?? [];
};

describe('Observability solution navigation tree', () => {
  it('does not include Stack Alerts in Stack Management > Alerts and Insights', async () => {
    const alertsLinks = await getAlertsAndInsightsLinks();

    expect(alertsLinks).not.toContain('management:triggersActionsAlerts');
    expect(alertsLinks).toEqual(
      expect.arrayContaining([
        'management:triggersActions',
        'management:triggersActionsConnectors',
        'management:maintenanceWindows',
      ])
    );
  });
});
