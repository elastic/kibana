/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AIChatExperience } from '@kbn/ai-assistant-common';
import { AI_CHAT_EXPERIENCE_TYPE } from '@kbn/management-settings-ids';
import { coreMock } from '@kbn/core/public/mocks';
import { createNavigationTree } from './navigation_tree';
import { createAiNavigationTree } from './ai_navigation/ai_navigation_tree';
import type { Services } from '../common/services';
import { mockServices } from '../common/services/__mocks__/services.mock';

describe('Navigation Tree', () => {
  let services: Services;

  beforeEach(() => {
    services = {
      ...mockServices,
      application: {
        ...mockServices.application,
        capabilities: {
          ...mockServices.application.capabilities,
          agentBuilder: { show: true },
        },
      },
    };
  });

  describe('createNavigationTree', () => {
    it('includes agent builder link when capability is enabled and chat experience is Agent', async () => {
      services.uiSettings.get = jest.fn().mockImplementation((key: string, defaultValue: unknown) => {
        if (key === AI_CHAT_EXPERIENCE_TYPE) {
          return AIChatExperience.Agent;
        }
        return defaultValue;
      });

      const tree = await createNavigationTree(services);
      const agentBuilderItem = tree.body?.find((item) => item.link === 'agent_builder');

      expect(agentBuilderItem).toBeDefined();
      expect(services.uiSettings.get).toHaveBeenCalledWith(
        AI_CHAT_EXPERIENCE_TYPE,
        AIChatExperience.Classic
      );
    });

    it('excludes agent builder link when chat experience is Classic', async () => {
      services.uiSettings.get = jest.fn().mockImplementation((key: string, defaultValue: unknown) => {
        if (key === AI_CHAT_EXPERIENCE_TYPE) {
          return AIChatExperience.Classic;
        }
        return defaultValue;
      });

      const tree = await createNavigationTree(services);
      const agentBuilderItem = tree.body?.find((item) => item.link === 'agent_builder');

      expect(agentBuilderItem).toBeUndefined();
      expect(services.uiSettings.get).toHaveBeenCalledWith(
        AI_CHAT_EXPERIENCE_TYPE,
        AIChatExperience.Classic
      );
    });

    it('excludes agent builder link when capability is not enabled', async () => {
      services.application.capabilities.agentBuilder = { show: false };
      services.uiSettings.get = jest.fn().mockImplementation((key: string, defaultValue: unknown) => {
        if (key === AI_CHAT_EXPERIENCE_TYPE) {
          return AIChatExperience.Agent;
        }
        return defaultValue;
      });

      const tree = await createNavigationTree(services);
      const agentBuilderItem = tree.body?.find((item) => item.link === 'agent_builder');

      expect(agentBuilderItem).toBeUndefined();
    });

    it('excludes agent builder link when capability is undefined', async () => {
      services.application.capabilities.agentBuilder = undefined;
      services.uiSettings.get = jest.fn().mockImplementation((key: string, defaultValue: unknown) => {
        if (key === AI_CHAT_EXPERIENCE_TYPE) {
          return AIChatExperience.Agent;
        }
        return defaultValue;
      });

      const tree = await createNavigationTree(services);
      const agentBuilderItem = tree.body?.find((item) => item.link === 'agent_builder');

      expect(agentBuilderItem).toBeUndefined();
    });
  });

  describe('createAiNavigationTree', () => {
    it('includes agent builder link when capability is enabled and chat experience is Agent', () => {
      services.uiSettings.get = jest.fn().mockImplementation((key: string, defaultValue: unknown) => {
        if (key === AI_CHAT_EXPERIENCE_TYPE) {
          return AIChatExperience.Agent;
        }
        return defaultValue;
      });

      const tree = createAiNavigationTree(services);
      // Find the section that contains discover link
      const discoverSection = tree.body?.find(
        (item) =>
          item.breadcrumbStatus === 'hidden' &&
          item.children?.some((child) => child.link === 'discover')
      );
      const agentBuilderItem = discoverSection?.children?.find((item) => item.link === 'agent_builder');

      expect(agentBuilderItem).toBeDefined();
      expect(services.uiSettings.get).toHaveBeenCalledWith(
        AI_CHAT_EXPERIENCE_TYPE,
        AIChatExperience.Classic
      );
    });

    it('excludes agent builder link when chat experience is Classic', () => {
      services.uiSettings.get = jest.fn().mockImplementation((key: string, defaultValue: unknown) => {
        if (key === AI_CHAT_EXPERIENCE_TYPE) {
          return AIChatExperience.Classic;
        }
        return defaultValue;
      });

      const tree = createAiNavigationTree(services);
      // Find the section that contains discover link
      const discoverSection = tree.body?.find(
        (item) =>
          item.breadcrumbStatus === 'hidden' &&
          item.children?.some((child) => child.link === 'discover')
      );
      const agentBuilderItem = discoverSection?.children?.find((item) => item.link === 'agent_builder');

      expect(agentBuilderItem).toBeUndefined();
      expect(services.uiSettings.get).toHaveBeenCalledWith(
        AI_CHAT_EXPERIENCE_TYPE,
        AIChatExperience.Classic
      );
    });

    it('excludes agent builder link when capability is not enabled', () => {
      services.application.capabilities.agentBuilder = { show: false };
      services.uiSettings.get = jest.fn().mockImplementation((key: string, defaultValue: unknown) => {
        if (key === AI_CHAT_EXPERIENCE_TYPE) {
          return AIChatExperience.Agent;
        }
        return defaultValue;
      });

      const tree = createAiNavigationTree(services);
      // Find the section that contains discover link
      const discoverSection = tree.body?.find(
        (item) =>
          item.breadcrumbStatus === 'hidden' &&
          item.children?.some((child) => child.link === 'discover')
      );
      const agentBuilderItem = discoverSection?.children?.find((item) => item.link === 'agent_builder');

      expect(agentBuilderItem).toBeUndefined();
    });

    it('excludes agent builder link when capability is undefined', () => {
      services.application.capabilities.agentBuilder = undefined;
      services.uiSettings.get = jest.fn().mockImplementation((key: string, defaultValue: unknown) => {
        if (key === AI_CHAT_EXPERIENCE_TYPE) {
          return AIChatExperience.Agent;
        }
        return defaultValue;
      });

      const tree = createAiNavigationTree(services);
      // Find the section that contains discover link
      const discoverSection = tree.body?.find(
        (item) =>
          item.breadcrumbStatus === 'hidden' &&
          item.children?.some((child) => child.link === 'discover')
      );
      const agentBuilderItem = discoverSection?.children?.find((item) => item.link === 'agent_builder');

      expect(agentBuilderItem).toBeUndefined();
    });
  });
});

