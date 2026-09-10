/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useIsNavControlVisible } from './is_nav_control_visible';
import type { CoreStart } from '@kbn/core/public';
import type { ObservabilityAIAssistantAppPluginStartDependencies } from '../types';
import { of } from 'rxjs';
import { AIAssistantType, AIChatExperience } from '@kbn/ai-assistant-management-plugin/public';
import { uiSettingsServiceMock } from '@kbn/core/public/mocks';

describe('isNavControlVisible', () => {
  const settings = { client: uiSettingsServiceMock.createStartContract() };

  beforeEach(() => {
    settings.client.get$.mockReturnValue(of(AIChatExperience.Classic));
  });
  describe('with solution:es', () => {
    it('always returns true for ES solution spaces', () => {
      const coreStart = {
        application: {
          currentAppId$: of('discover'),
          applications$: of(
            new Map([['discover', { id: 'discover', category: { id: 'kibana' } }]])
          ),
        },
        settings,
      } as unknown as CoreStart;

      const pluginsStart = {
        aiAssistantManagementSelection: {
          aiAssistantType$: of(AIAssistantType.Never),
          chatExperience$: of(AIChatExperience.Classic),
        },
        spaces: {
          getActiveSpace$: () => of({ solution: 'es' }),
        },
      } as unknown as ObservabilityAIAssistantAppPluginStartDependencies;

      const { result } = renderHook(() => useIsNavControlVisible({ coreStart, pluginsStart }));

      expect(result.current.isVisible).toBe(true);
    });
  });
  describe('with solution:oblt', () => {
    it('always returns true for Observability solution spaces', () => {
      const coreStart = {
        application: {
          currentAppId$: of('discover'),
          applications$: of(
            new Map([['discover', { id: 'discover', category: { id: 'kibana' } }]])
          ),
        },
        settings,
      } as unknown as CoreStart;

      const pluginsStart = {
        aiAssistantManagementSelection: {
          aiAssistantType$: of(AIAssistantType.Never),
          chatExperience$: of(AIChatExperience.Classic),
        },
        spaces: {
          getActiveSpace$: () => of({ solution: 'oblt' }),
        },
      } as unknown as ObservabilityAIAssistantAppPluginStartDependencies;

      const { result } = renderHook(() => useIsNavControlVisible({ coreStart, pluginsStart }));

      expect(result.current.isVisible).toBe(true);
    });
  });
  describe('with serverless', () => {
    it('always returns true when isServerless is true', () => {
      const coreStart = {
        application: {
          currentAppId$: of('discover'),
          applications$: of(
            new Map([['discover', { id: 'discover', category: { id: 'kibana' } }]])
          ),
        },
        settings,
      } as unknown as CoreStart;

      const pluginsStart = {
        aiAssistantManagementSelection: {
          aiAssistantType$: of(AIAssistantType.Never),
          chatExperience$: of(AIChatExperience.Classic),
        },
        spaces: {
          getActiveSpace$: () => of({ solution: 'classic' }),
        },
      } as unknown as ObservabilityAIAssistantAppPluginStartDependencies;

      const { result } = renderHook(() =>
        useIsNavControlVisible({ coreStart, pluginsStart, isServerless: true })
      );

      expect(result.current.isVisible).toBe(true);
    });
  });
  describe('with classic', () => {
    it('returns false when the ai assistant type is never', () => {
      const coreStart = {
        application: {
          currentAppId$: of('observability'),
          applications$: of(
            new Map([['observability', { id: 'observability', category: { id: 'observability' } }]])
          ),
        },
        settings,
      } as unknown as CoreStart;

      const pluginsStart = {
        aiAssistantManagementSelection: {
          aiAssistantType$: of(AIAssistantType.Never),
          chatExperience$: of(AIChatExperience.Classic),
        },
        spaces: {
          getActiveSpace$: () => of({ solution: 'classic' }),
        },
      } as unknown as ObservabilityAIAssistantAppPluginStartDependencies;

      const { result } = renderHook(() => useIsNavControlVisible({ coreStart, pluginsStart }));

      expect(result.current.isVisible).toBe(false);
    });

    it('returns false when the current app is security and the ai assistant type is observability', () => {
      const coreStart = {
        application: {
          currentAppId$: of('security'),
          applications$: of(
            new Map([['security', { id: 'security', category: { id: 'securitySolution' } }]])
          ),
        },
        settings,
      } as unknown as CoreStart;

      const pluginsStart = {
        aiAssistantManagementSelection: {
          aiAssistantType$: of(AIAssistantType.Observability),
          chatExperience$: of(AIChatExperience.Classic),
        },
        spaces: {
          getActiveSpace$: () => of({ solution: 'classic' }),
        },
      } as unknown as ObservabilityAIAssistantAppPluginStartDependencies;

      const { result } = renderHook(() => useIsNavControlVisible({ coreStart, pluginsStart }));

      expect(result.current.isVisible).toBe(false);
    });

    it('returns true when the current app is search and the ai assistant type is default', () => {
      const coreStart = {
        application: {
          currentAppId$: of('search'),
          applications$: of(
            new Map([['search', { id: 'search', category: { id: 'enterpriseSearch' } }]])
          ),
        },
        settings,
      } as unknown as CoreStart;

      const pluginsStart = {
        aiAssistantManagementSelection: {
          aiAssistantType$: of(AIAssistantType.Default),
          chatExperience$: of(AIChatExperience.Classic),
        },
        spaces: {
          getActiveSpace$: () => of({ solution: 'classic' }),
        },
      } as unknown as ObservabilityAIAssistantAppPluginStartDependencies;

      const { result } = renderHook(() => useIsNavControlVisible({ coreStart, pluginsStart }));

      expect(result.current.isVisible).toBe(true);
    });

    it('returns true when the current app is observability and the ai assistant type is default', () => {
      const coreStart = {
        application: {
          currentAppId$: of('observability'),
          applications$: of(
            new Map([['observability', { id: 'observability', category: { id: 'observability' } }]])
          ),
        },
        settings,
      } as unknown as CoreStart;

      const pluginsStart = {
        aiAssistantManagementSelection: {
          aiAssistantType$: of(AIAssistantType.Default),
          chatExperience$: of(AIChatExperience.Classic),
        },
        spaces: {
          getActiveSpace$: () => of({ solution: 'classic' }),
        },
      } as unknown as ObservabilityAIAssistantAppPluginStartDependencies;

      const { result } = renderHook(() => useIsNavControlVisible({ coreStart, pluginsStart }));

      expect(result.current.isVisible).toBe(true);
    });

    it('returns false when the current app is discover and the ai assistant type is default', () => {
      const coreStart = {
        application: {
          currentAppId$: of('discover'),
          applications$: of(
            new Map([['discover', { id: 'discover', category: { id: 'kibana' } }]])
          ),
        },
        settings,
      } as unknown as CoreStart;

      const pluginsStart = {
        aiAssistantManagementSelection: {
          aiAssistantType$: of(AIAssistantType.Default),
          chatExperience$: of(AIChatExperience.Classic),
        },
        spaces: {
          getActiveSpace$: () => of({ solution: 'classic' }),
        },
      } as unknown as ObservabilityAIAssistantAppPluginStartDependencies;

      const { result } = renderHook(() => useIsNavControlVisible({ coreStart, pluginsStart }));

      expect(result.current.isVisible).toBe(false);
    });

    it('returns true when the current app is discover and the ai assistant type is observability', () => {
      const coreStart = {
        application: {
          currentAppId$: of('discover'),
          applications$: of(
            new Map([['discover', { id: 'discover', category: { id: 'kibana' } }]])
          ),
        },
        settings,
      } as unknown as CoreStart;

      const pluginsStart = {
        aiAssistantManagementSelection: {
          aiAssistantType$: of(AIAssistantType.Observability),
          chatExperience$: of(AIChatExperience.Classic),
        },
        spaces: {
          getActiveSpace$: () => of({ solution: 'classic' }),
        },
      } as unknown as ObservabilityAIAssistantAppPluginStartDependencies;

      const { result } = renderHook(() => useIsNavControlVisible({ coreStart, pluginsStart }));

      expect(result.current.isVisible).toBe(true);
    });

    it('returns false when the ai assistant type is default', () => {
      const coreStart = {
        application: {
          currentAppId$: of('discover'),
          applications$: of(
            new Map([['discover', { id: 'discover', category: { id: 'kibana' } }]])
          ),
        },
        settings,
      } as unknown as CoreStart;

      const pluginsStart = {
        aiAssistantManagementSelection: {
          aiAssistantType$: of(AIAssistantType.Default),
          chatExperience$: of(AIChatExperience.Classic),
        },
        spaces: {
          getActiveSpace$: () => of({ solution: 'classic' }),
        },
      } as unknown as ObservabilityAIAssistantAppPluginStartDependencies;

      const { result } = renderHook(() => useIsNavControlVisible({ coreStart, pluginsStart }));

      expect(result.current.isVisible).toBe(false);
    });

    it('returns false when chatExperience is Agent regardless of other settings', () => {
      settings.client.get$.mockReturnValue(of(AIChatExperience.Agent));

      const coreStart = {
        application: {
          currentAppId$: of('observability'),
          applications$: of(
            new Map([['observability', { id: 'observability', category: { id: 'observability' } }]])
          ),
        },
        settings,
      } as unknown as CoreStart;

      const pluginsStart = {
        aiAssistantManagementSelection: {
          aiAssistantType$: of(AIAssistantType.Observability),
          chatExperience$: of(AIChatExperience.Agent),
        },
        spaces: {
          getActiveSpace$: () => of({ solution: 'oblt' }),
        },
      } as unknown as ObservabilityAIAssistantAppPluginStartDependencies;

      const { result } = renderHook(() => useIsNavControlVisible({ coreStart, pluginsStart }));

      expect(result.current.isVisible).toBe(false);
    });
  });
});
