/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useIsNavControlVisible } from './is_nav_control_visible';
import { CoreStart } from '@kbn/core/public';
import { ObservabilityAIAssistantAppPluginStartDependencies } from '../types';
import { of } from 'rxjs';
import { AIAssistantType } from '@kbn/ai-assistant-management-plugin/public';

describe('isNavControlVisible', () => {
  describe('with solution:oblt', () => {
    it('returns true when the current app is discover and the ai assistant type is observability', () => {
      const coreStart = {
        application: {
          currentAppId$: of('discover'),
          applications$: of(
            new Map([['discover', { id: 'discover', category: { id: 'kibana' } }]])
          ),
        },
      } as unknown as CoreStart;

      const pluginsStart = {
        aiAssistantManagementSelection: {
          aiAssistantType$: of(AIAssistantType.Observability),
        },
        spaces: {
          getActiveSpace$: () => of({ solution: 'oblt' }),
        },
      } as unknown as ObservabilityAIAssistantAppPluginStartDependencies;

      const { result } = renderHook(() => useIsNavControlVisible({ coreStart, pluginsStart }));

      expect(result.current.isVisible).toBe(true);
    });

    it('returns true when the current app is discover and the ai assistant type is default', () => {
      const coreStart = {
        application: {
          currentAppId$: of('discover'),
          applications$: of(
            new Map([['discover', { id: 'discover', category: { id: 'kibana' } }]])
          ),
        },
      } as unknown as CoreStart;

      const pluginsStart = {
        aiAssistantManagementSelection: {
          aiAssistantType$: of(AIAssistantType.Default),
        },
        spaces: {
          getActiveSpace$: () => of({ solution: 'oblt' }),
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
      } as unknown as CoreStart;

      const pluginsStart = {
        aiAssistantManagementSelection: {
          aiAssistantType$: of(AIAssistantType.Default),
        },
        spaces: {
          getActiveSpace$: () => of({ solution: 'oblt' }),
        },
      } as unknown as ObservabilityAIAssistantAppPluginStartDependencies;

      const { result } = renderHook(() => useIsNavControlVisible({ coreStart, pluginsStart }));

      expect(result.current.isVisible).toBe(true);
    });

    it('returns true when the current app is search and the ai assistant type is default', () => {
      const coreStart = {
        application: {
          currentAppId$: of('search'),
          applications$: of(
            new Map([['search', { id: 'search', category: { id: 'enterpriseSearch' } }]])
          ),
        },
      } as unknown as CoreStart;

      const pluginsStart = {
        aiAssistantManagementSelection: {
          aiAssistantType$: of(AIAssistantType.Default),
        },
        spaces: {
          getActiveSpace$: () => of({ solution: 'oblt' }),
        },
      } as unknown as ObservabilityAIAssistantAppPluginStartDependencies;

      const { result } = renderHook(() => useIsNavControlVisible({ coreStart, pluginsStart }));

      expect(result.current.isVisible).toBe(true);
    });

    it('returns false when the current app is security and the ai assistant type is observability', () => {
      const coreStart = {
        application: {
          currentAppId$: of('security'),
          applications$: of(
            new Map([['security', { id: 'security', category: { id: 'securitySolution' } }]])
          ),
        },
      } as unknown as CoreStart;

      const pluginsStart = {
        aiAssistantManagementSelection: {
          aiAssistantType$: of(AIAssistantType.Observability),
        },
        spaces: {
          getActiveSpace$: () => of({ solution: 'oblt' }),
        },
      } as unknown as ObservabilityAIAssistantAppPluginStartDependencies;

      const { result } = renderHook(() => useIsNavControlVisible({ coreStart, pluginsStart }));

      expect(result.current.isVisible).toBe(false);
    });

    it('returns false when the ai assistant type is never', () => {
      const coreStart = {
        application: {
          currentAppId$: of('observability'),
          applications$: of(
            new Map([['observability', { id: 'observability', category: { id: 'observability' } }]])
          ),
        },
      } as unknown as CoreStart;

      const pluginsStart = {
        aiAssistantManagementSelection: {
          aiAssistantType$: of(AIAssistantType.Never),
        },
        spaces: {
          getActiveSpace$: () => of({ solution: 'oblt' }),
        },
      } as unknown as ObservabilityAIAssistantAppPluginStartDependencies;

      const { result } = renderHook(() => useIsNavControlVisible({ coreStart, pluginsStart }));

      expect(result.current.isVisible).toBe(false);
    });
  });

  describe('with solution:es', () => {
    it('returns true when the current space is es and the ai assistant type is observability', () => {
      const coreStart = {
        application: {
          currentAppId$: of('discover'),
          applications$: of(
            new Map([['discover', { id: 'discover', category: { id: 'kibana' } }]])
          ),
        },
      } as unknown as CoreStart;

      const pluginsStart = {
        aiAssistantManagementSelection: {
          aiAssistantType$: of(AIAssistantType.Observability),
        },
        spaces: {
          getActiveSpace$: () => of({ solution: 'es' }),
        },
      } as unknown as ObservabilityAIAssistantAppPluginStartDependencies;

      const { result } = renderHook(() => useIsNavControlVisible({ coreStart, pluginsStart }));

      expect(result.current.isVisible).toBe(true);
    });

    it('returns false when the current space is es and the ai assistant type is never', () => {
      const coreStart = {
        application: {
          currentAppId$: of('discover'),
          applications$: of(
            new Map([['discover', { id: 'discover', category: { id: 'kibana' } }]])
          ),
        },
      } as unknown as CoreStart;

      const pluginsStart = {
        aiAssistantManagementSelection: {
          aiAssistantType$: of(AIAssistantType.Never),
        },
        spaces: {
          getActiveSpace$: () => of({ solution: 'es' }),
        },
      } as unknown as ObservabilityAIAssistantAppPluginStartDependencies;

      const { result } = renderHook(() => useIsNavControlVisible({ coreStart, pluginsStart }));

      expect(result.current.isVisible).toBe(false);
    });
  });

  describe('with classic', () => {
    it('returns false when the ai assistant type is default', () => {
      const coreStart = {
        application: {
          currentAppId$: of('discover'),
          applications$: of(
            new Map([['discover', { id: 'discover', category: { id: 'kibana' } }]])
          ),
        },
      } as unknown as CoreStart;

      const pluginsStart = {
        aiAssistantManagementSelection: {
          aiAssistantType$: of(AIAssistantType.Default),
        },
        spaces: {
          getActiveSpace$: () => of({ solution: 'classic' }),
        },
      } as unknown as ObservabilityAIAssistantAppPluginStartDependencies;

      const { result } = renderHook(() => useIsNavControlVisible({ coreStart, pluginsStart }));

      expect(result.current.isVisible).toBe(false);
    });
  });
});
