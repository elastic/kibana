/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AIChatExperience } from '@kbn/ai-assistant-common';
import type { NavigationTreeDefinition, NodeDefinition } from '@kbn/core-chrome-browser';
import { STACK_MANAGEMENT_NAV_ID } from '@kbn/deeplinks-management';
import { mockServices } from '../common/__mocks__/services.mock';
import type { Services } from '../common/services';
import { SecurityPageName } from '@kbn/deeplinks-security';
import { alertZeroLink } from '@kbn/security-solution-navigation/links';
import { createNavigationTree } from './navigation_tree';

describe('createNavigationTree', () => {
  const createServices = (): Services => {
    const services = {
      ...mockServices,
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
      AIChatExperience.Agent,
      true
    ) as NavigationTreeDefinition;

    const links = body.map((item) => item.link);
    const alertZeroIndex = links.indexOf(alertZeroLink());
    const escalationsIndex = links.indexOf(alertZeroLink(SecurityPageName.alertZeroEscalations));
    const watchesIndex = links.indexOf(alertZeroLink(SecurityPageName.alertZeroWatches));

    expect(alertZeroIndex).toBe(0);
    expect(escalationsIndex).toBe(alertZeroIndex + 1);
    expect(watchesIndex).toBeGreaterThan(escalationsIndex);
  });

  it('keeps context engine after Workflows when AlertZero is on in classic chat experience, with no agent builder link', () => {
    const { body } = createNavigationTree(
      createServices(),
      AIChatExperience.Classic,
      true
    ) as NavigationTreeDefinition;

    const contextEngineIndex = body.findIndex((item) => item.link === 'context_engine');
    const agentBuilderNode = body.find((item) => item.link === 'agent_builder');

    expect(body[contextEngineIndex]).toMatchObject({
      icon: 'tableSparkles',
      link: 'context_engine',
    });
    expect(body[0].link).toBe(alertZeroLink());
    expect(contextEngineIndex).toBeGreaterThan(
      body.findIndex((item) => item.link === alertZeroLink(SecurityPageName.alertZeroWatches))
    );
    expect(body[contextEngineIndex + 1].id).toBe(SecurityPageName.attackDiscovery);
    expect(agentBuilderNode).toBeUndefined();
  });

  it('places agent builder between Escalations and Watches and context engine after Workflows when the chat experience is Agent', () => {
    const { body } = createNavigationTree(
      createServices(),
      AIChatExperience.Agent,
      true
    ) as NavigationTreeDefinition;

    const links = body.map((item) => item.link);
    const escalationsIndex = links.indexOf(alertZeroLink(SecurityPageName.alertZeroEscalations));

    expect(links[escalationsIndex + 1]).toBe('agent_builder');
    expect(links[escalationsIndex + 2]).toBe(alertZeroLink(SecurityPageName.alertZeroWatches));
    expect(links.indexOf('context_engine')).toBeGreaterThan(links.indexOf('discover'));
    expect(body[links.indexOf('context_engine') + 1].id).toBe(SecurityPageName.attackDiscovery);
  });

  describe('when AlertZero is disabled', () => {
    it('keeps the original order with Agents and Context Engine after Workflows in Agent chat experience', () => {
      const { body } = createNavigationTree(
        createServices(),
        AIChatExperience.Agent,
        false
      ) as NavigationTreeDefinition;

      const links = body.map((item) => item.link);
      const agentBuilderIndex = links.indexOf('agent_builder');

      expect(links.indexOf('discover')).toBeLessThan(agentBuilderIndex);
      expect(links[agentBuilderIndex + 1]).toBe('context_engine');
      expect(links).not.toContain(alertZeroLink());
    });

    it('keeps Context Engine at the top in classic chat experience', () => {
      const { body } = createNavigationTree(
        createServices(),
        AIChatExperience.Classic,
        false
      ) as NavigationTreeDefinition;

      expect(body[0].link).toBe('context_engine');
      expect(body.some((item) => item.link === 'agent_builder')).toBe(false);
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
