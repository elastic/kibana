/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { of } from 'rxjs';
import { AIChatExperience } from '@kbn/ai-assistant-common';
import type { NavigationTreeDefinition, NodeDefinition } from '@kbn/core-chrome-browser';
import { STACK_MANAGEMENT_NAV_ID } from '@kbn/deeplinks-management';
import { AGENT_BUILDER_NAV_AT_TOP_FLAG } from '@kbn/navigation-plugin/public';
import { mockServices } from '../common/__mocks__/services.mock';
import type { Services } from '../common/services';
import { SecurityPageName } from '@kbn/deeplinks-security';
import { alertZeroLink } from '@kbn/security-solution-navigation/links';
import { createNavigationTree } from './navigation_tree';

describe('createNavigationTree', () => {
  const createServices = (options?: { agentBuilderNavAtTop?: boolean }): Services => {
    const services = {
      ...mockServices,
      featureFlags: {
        ...mockServices.featureFlags,
        getBooleanValue$: jest.fn((flag: string, defaultValue?: boolean) => {
          if (flag === AGENT_BUILDER_NAV_AT_TOP_FLAG) {
            return of(options?.agentBuilderNavAtTop ?? defaultValue ?? false);
          }

          return of(defaultValue ?? false);
        }),
      },
      uiSettings: {
        ...mockServices.uiSettings,
        get: jest.fn(<T>(_key: string, defaultValue?: T) => defaultValue as T),
      },
    };

    return services;
  };

  it('places Escalations right under AlertZero, with Watches after them', () => {
    const { body } = createNavigationTree(
      createServices(),
      AIChatExperience.Agent
    ) as NavigationTreeDefinition;

    const links = body.map((item) => item.link);
    const alertZeroIndex = links.indexOf(alertZeroLink());
    const escalationsIndex = links.indexOf(alertZeroLink(SecurityPageName.alertZeroEscalations));
    const watchesIndex = links.indexOf(alertZeroLink(SecurityPageName.alertZeroWatches));

    expect(alertZeroIndex).toBeGreaterThanOrEqual(0);
    expect(escalationsIndex).toBe(alertZeroIndex + 1);
    expect(watchesIndex).toBeGreaterThan(escalationsIndex);
  });

  it('includes context engine first in classic chat experience, with no agent builder link', () => {
    const { body } = createNavigationTree(
      createServices(),
      AIChatExperience.Classic
    ) as NavigationTreeDefinition;

    const contextEngineIndex = body.findIndex((item) => item.link === 'context_engine');
    const agentBuilderNode = body.find((item) => item.link === 'agent_builder');

    expect(body[contextEngineIndex]).toMatchObject({
      icon: 'tableSparkles',
      link: 'context_engine',
    });
    expect(contextEngineIndex).toBe(0);
    expect(agentBuilderNode).toBeUndefined();
  });

  it('keeps agent builder in its lower position and places context engine right after it when the nav-at-top flag is off', () => {
    const { body } = createNavigationTree(
      createServices({ agentBuilderNavAtTop: false }),
      AIChatExperience.Agent
    ) as NavigationTreeDefinition;

    const agentBuilderIndex = body.findIndex((item) => item.link === 'agent_builder');
    const contextEngineIndex = body.findIndex((item) => item.link === 'context_engine');

    // Agent Builder stays in its existing (non-top) spot; it must not move to index 0.
    expect(agentBuilderIndex).toBeGreaterThan(0);
    expect(contextEngineIndex).toBe(agentBuilderIndex + 1);
  });

  it('places agent builder and context engine together at the top when the nav-at-top flag is on', () => {
    const { body } = createNavigationTree(
      createServices({ agentBuilderNavAtTop: true }),
      AIChatExperience.Agent
    ) as NavigationTreeDefinition;

    const agentBuilderIndex = body.findIndex((item) => item.link === 'agent_builder');
    const contextEngineIndex = body.findIndex((item) => item.link === 'context_engine');

    expect(agentBuilderIndex).toBe(0);
    expect(contextEngineIndex).toBe(1);
    expect(body[contextEngineIndex]).toMatchObject({
      icon: 'tableSparkles',
      link: 'context_engine',
    });
  });

  it('includes Stack Rules in Stack Management > Alerts and Insights', () => {
    const { footer } = createNavigationTree(
      createServices(),
      AIChatExperience.Classic
    ) as NavigationTreeDefinition;
    const stackManagement = footer?.find((item) => item.id === STACK_MANAGEMENT_NAV_ID);
    const alertsSection = stackManagement?.children?.find((item) =>
      item.children?.some((child) => child.link === 'management:triggersActions')
    );

    expect(alertsSection?.children).toContainEqual(
      expect.objectContaining({ id: 'stackRules', link: 'management:triggersActions' })
    );
  });

  it('includes service accounts in Stack Management > Security', () => {
    const { footer = [] } = createNavigationTree(
      createServices(),
      AIChatExperience.Classic
    ) as NavigationTreeDefinition;

    const findSecuritySection = (nodes: NodeDefinition[]): NodeDefinition | undefined =>
      nodes
        .map((node) =>
          node.children?.some(({ link }) => link === 'management:role_mappings')
            ? node
            : findSecuritySection(node.children ?? [])
        )
        .find(Boolean);

    expect(findSecuritySection(footer)?.children).toContainEqual(
      expect.objectContaining({ link: 'management:service_accounts' })
    );
  });
});
