/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AIChatExperience } from '@kbn/ai-assistant-common';
import type { NavigationTreeDefinition } from '@kbn/core-chrome-browser';
import { STACK_MANAGEMENT_NAV_ID } from '@kbn/deeplinks-management';
import { mockServices } from '../common/services/__mocks__/services.mock';
import type { Services } from '../common/services';
import { SecurityPageName } from '@kbn/deeplinks-security';
import { alertZeroLink } from '@kbn/security-solution-navigation/links';
import { createNavigationTree } from './navigation_tree';

const containsLink = (nodes: NavigationTreeDefinition['body'], link: string): boolean =>
  nodes.some(
    (node) =>
      node.link === link || (node.children !== undefined && containsLink(node.children, link))
  );

describe('createNavigationTree', () => {
  const createServices = (): Services => ({
    ...mockServices,
    uiSettings: {
      ...mockServices.uiSettings,
      get: jest.fn(<T>(_key: string, defaultValue?: T) => defaultValue as T),
    },
  });

  it('places Escalations right under AlertZero, with Watches after them', async () => {
    const { body } = (await createNavigationTree(
      createServices(),
      AIChatExperience.Agent,
      true
    )) as NavigationTreeDefinition;

    const links = body.map((item) => item.link);
    const alertZeroIndex = links.indexOf(alertZeroLink());
    const escalationsIndex = links.indexOf(alertZeroLink(SecurityPageName.alertZeroEscalations));
    const watchesIndex = links.indexOf(alertZeroLink(SecurityPageName.alertZeroWatches));

    expect(alertZeroIndex).toBe(0);
    expect(escalationsIndex).toBe(alertZeroIndex + 1);
    expect(watchesIndex).toBeGreaterThan(escalationsIndex);
  });

  it('keeps context engine after Workflows when AlertZero is on in classic chat experience, with no agent builder link', async () => {
    const { body } = (await createNavigationTree(
      createServices(),
      AIChatExperience.Classic,
      true
    )) as NavigationTreeDefinition;

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

  it('places agent builder between Escalations and Watches and context engine after Workflows when the chat experience is Agent', async () => {
    const { body } = (await createNavigationTree(
      createServices(),
      AIChatExperience.Agent,
      true
    )) as NavigationTreeDefinition;

    const links = body.map((item) => item.link);
    const escalationsIndex = links.indexOf(alertZeroLink(SecurityPageName.alertZeroEscalations));

    expect(links[escalationsIndex + 1]).toBe('agent_builder');
    expect(links[escalationsIndex + 2]).toBe(alertZeroLink(SecurityPageName.alertZeroWatches));
    expect(links.indexOf('context_engine')).toBeGreaterThan(links.indexOf('discover'));
    expect(body[links.indexOf('context_engine') + 1].id).toBe(SecurityPageName.attackDiscovery);
  });

  describe('when AlertZero is disabled', () => {
    it('keeps the original order with Agents and Context Engine after Workflows in Agent chat experience', async () => {
      const { body } = (await createNavigationTree(
        createServices(),
        AIChatExperience.Agent,
        false
      )) as NavigationTreeDefinition;

      const links = body.map((item) => item.link);
      const agentBuilderIndex = links.indexOf('agent_builder');

      expect(links.indexOf('discover')).toBeLessThan(agentBuilderIndex);
      expect(links[agentBuilderIndex + 1]).toBe('context_engine');
      expect(links).not.toContain(alertZeroLink());
    });

    it('keeps Context Engine at the top in classic chat experience', async () => {
      const { body } = (await createNavigationTree(
        createServices(),
        AIChatExperience.Classic,
        false
      )) as NavigationTreeDefinition;

      expect(body[0].link).toBe('context_engine');
      expect(body.some((item) => item.link === 'agent_builder')).toBe(false);
    });
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
