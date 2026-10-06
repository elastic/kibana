/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { of } from 'rxjs';
import { AIChatExperience } from '@kbn/ai-assistant-common';
import type { NavigationTreeDefinition } from '@kbn/core-chrome-browser';
import { STACK_MANAGEMENT_NAV_ID } from '@kbn/deeplinks-management';
import { AGENT_BUILDER_NAV_AT_TOP_FLAG } from '@kbn/navigation-plugin/public';
import { mockServices } from '../common/services/__mocks__/services.mock';
import type { Services } from '../common/services';
import { createNavigationTree } from './navigation_tree';

const containsLink = (nodes: NavigationTreeDefinition['body'], link: string): boolean =>
  nodes.some(
    (node) =>
      node.link === link || (node.children !== undefined && containsLink(node.children, link))
  );

describe('createNavigationTree', () => {
  const createServices = (options?: { agentBuilderNavAtTop?: boolean }): Services => ({
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
  });

  it('always includes context engine first in classic chat experience', async () => {
    const { body } = (await createNavigationTree(
      createServices(),
      AIChatExperience.Classic
    )) as NavigationTreeDefinition;

    const contextEngineIndex = body.findIndex((item) => item.link === 'context_engine');
    const agentBuilderNode = body.find((item) => item.link === 'agent_builder');

    expect(body[contextEngineIndex]).toMatchObject({
      icon: 'tableSparkles',
      link: 'context_engine',
    });
    expect(contextEngineIndex).toBe(0);
    expect(agentBuilderNode).toBeUndefined();
  });

  it('keeps context engine first when agent builder nav is in the middle', async () => {
    const { body } = (await createNavigationTree(
      createServices({ agentBuilderNavAtTop: false }),
      AIChatExperience.Agent
    )) as NavigationTreeDefinition;

    const contextEngineIndex = body.findIndex((item) => item.link === 'context_engine');
    const agentBuilderIndex = body.findIndex((item) => item.link === 'agent_builder');

    expect(contextEngineIndex).toBe(0);
    expect(agentBuilderIndex).toBeGreaterThan(contextEngineIndex);
  });

  it('keeps context engine below agent builder when agent builder nav is at the top', async () => {
    const { body } = (await createNavigationTree(
      createServices({ agentBuilderNavAtTop: true }),
      AIChatExperience.Agent
    )) as NavigationTreeDefinition;

    const agentBuilderIndex = body.findIndex((item) => item.link === 'agent_builder');
    const contextEngineIndex = body.findIndex((item) => item.link === 'context_engine');

    expect(agentBuilderIndex).toBe(0);
    expect(contextEngineIndex).toBe(1);
  });

  it('includes Stack Rules in project settings > Alerts and Insights', async () => {
    const { footer } = (await createNavigationTree(
      createServices(),
      AIChatExperience.Classic
    )) as NavigationTreeDefinition;
    const managementCategory = footer?.find((item) => item.id === 'category-management');
    const stackManagement = managementCategory?.children?.find(
      (item) => item.id === STACK_MANAGEMENT_NAV_ID
    );
    const alertsSection = stackManagement?.children?.find((item) =>
      item.children?.some((child) => child.link === 'management:triggersActions')
    );

    expect(alertsSection?.children).toContainEqual(
      expect.objectContaining({ id: 'stackRules', link: 'management:triggersActions' })
    );
  });

  it('includes service accounts in Admin and Settings', async () => {
    const { footer = [] } = (await createNavigationTree(
      createServices(),
      AIChatExperience.Classic
    )) as NavigationTreeDefinition;

    expect(containsLink(footer, 'management:service_accounts')).toBe(true);
  });
});
