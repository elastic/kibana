/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createNavigationTree, filterForFeatureAvailability } from './navigation_tree';
import type { NodeDefinition } from '@kbn/core-chrome-browser';

describe('Navigation Tree', () => {
  it('should generate tree with overview', () => {
    const navigation = createNavigationTree({});
    const { body } = navigation;
    expect(body.length).toBeGreaterThan(0);
    const homeNode = body[0];
    expect(homeNode).toMatchObject({
      title: 'Observability',
      link: 'observability-overview',
    });
  });

  it('should not generate tree with overview', () => {
    const navigation = createNavigationTree({ overviewAvailable: false });
    expect(navigation.body).not.toEqual(
      expect.arrayContaining([
        {
          title: 'Overview',
          link: 'observability-overview',
        },
      ])
    );
  });

  it('shows AI Assistant and hides Agents when AI Assistant is enabled', () => {
    const { body } = createNavigationTree({});

    const aiAssistantNode = body.find((item) => item.link === 'observabilityAIAssistant');
    const agentsNode = body.find((item) => item.link === 'agent_builder');

    expect(aiAssistantNode).toBeDefined();
    expect(agentsNode).toBeUndefined();
  });

  it('shows Agents and hides AI Assistant when AI Assistant is disabled', () => {
    const { body } = createNavigationTree({ showAiAssistant: false });

    const aiAssistantNode = body.find((item) => item.link === 'observabilityAIAssistant');
    const agentsNode = body.find((item) => item.link === 'agent_builder');

    expect(aiAssistantNode).toBeUndefined();
    expect(agentsNode).toBeDefined();
  });

  it('uses rules link when rules app is registered', () => {
    const { footer } = createNavigationTree({ isRulesAppRegistered: true });
    const adminAndSettingsNode = footer?.find((item: any) => item.id === 'admin_and_settings');
    const alertsAndInsightsSection = adminAndSettingsNode?.children?.find(
      (item: any) => item.id === 'alerts_and_insights'
    );
    const rulesLink = alertsAndInsightsSection?.children?.find(
      (item: any) => item.link === 'rules'
    );
    expect(rulesLink).toBeDefined();
  });

  it('uses management:triggersActions link when rules app is not registered', () => {
    const { footer } = createNavigationTree({ isRulesAppRegistered: false });
    const adminAndSettingsNode = footer?.find((item: any) => item.id === 'admin_and_settings');
    const alertsAndInsightsSection = adminAndSettingsNode?.children?.find(
      (item: any) => item.id === 'alerts_and_insights'
    );
    const triggersActionsLink = alertsAndInsightsSection?.children?.find(
      (item: any) => item.link === 'management:triggersActions'
    );
    expect(triggersActionsLink).toBeDefined();
  });

  describe('filterForFeatureAvailability', () => {
    it('should return empty array if feature flag is false', () => {
      const node = {
        title: 'Test',
        link: 'test',
      };
      expect(filterForFeatureAvailability(node as NodeDefinition, false)).toEqual([]);
    });

    it('should return node in array if feature flag is true', () => {
      const node = {
        title: 'Test',
        link: 'test',
      };
      expect(filterForFeatureAvailability(node as NodeDefinition, true)).toEqual([node]);
    });
  });
});
