/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useIsNavControlVisible } from './use_is_nav_control_visible';
import { of } from 'rxjs';
import { AIAssistantType, AIChatExperience } from '@kbn/ai-assistant-management-plugin/public';
import type { Space } from '@kbn/spaces-plugin/common';
import { useKibana } from '../../context/typed_kibana_context/typed_kibana_context';
import { uiSettingsServiceMock } from '@kbn/core/public/mocks';

jest.mock('../../context/typed_kibana_context/typed_kibana_context', () => {
  return {
    useKibana: jest.fn(),
  };
});

describe('isNavControlVisible', () => {
  const settings = { client: uiSettingsServiceMock.createStartContract() };

  beforeEach(() => {
    settings.client.get$.mockReturnValue(of(AIChatExperience.Classic));
  });
  it('returns true when the current app is security and the ai assistant type is default', () => {
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        application: {
          currentAppId$: of('security'),
          applications$: of(
            new Map([
              ['security', { id: 'security', category: { id: 'securitySolution' } }],
              ['observability', { id: 'observability', category: { id: 'observability' } }],
            ])
          ),
        },
        aiAssistantManagementSelection: {
          aiAssistantType$: of(AIAssistantType.Default),
          chatExperience$: of('classic'),
        },
        settings,
        spaces: {
          getActiveSpace$: () => of({} as unknown as Space),
        },
      },
    });

    const { result } = renderHook(() => useIsNavControlVisible());
    expect(result.current.isVisible).toEqual(true);
  });

  it('returns false when the current app is observability and the ai assistant type is default', () => {
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        application: {
          currentAppId$: of('observability'),
          applications$: of(
            new Map([['observability', { id: 'observability', category: { id: 'observability' } }]])
          ),
        },
        aiAssistantManagementSelection: {
          aiAssistantType$: of(AIAssistantType.Default),
          chatExperience$: of('classic'),
        },
        settings,
        spaces: {
          getActiveSpace$: () => of({} as unknown as Space),
        },
      },
    });

    const { result } = renderHook(() => useIsNavControlVisible());
    expect(result.current.isVisible).toEqual(false);
  });

  it('returns false when the current app is search and the ai assistant type is default', () => {
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        application: {
          currentAppId$: of('search'),
          applications$: of(
            new Map([['search', { id: 'search', category: { id: 'enterpriseSearch' } }]])
          ),
        },
        aiAssistantManagementSelection: {
          aiAssistantType$: of(AIAssistantType.Security),
          chatExperience$: of('classic'),
        },
        settings,
        spaces: {
          getActiveSpace$: () => of({} as unknown as Space),
        },
      },
    });

    const { result } = renderHook(() => useIsNavControlVisible());
    expect(result.current.isVisible).toEqual(false);
  });

  it('returns false when the current app is discover and the ai assistant type is security', () => {
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        application: {
          currentAppId$: of('discover'),
          applications$: of(
            new Map([['discover', { id: 'discover', category: { id: 'kibana' } }]])
          ),
        },
        aiAssistantManagementSelection: {
          aiAssistantType$: of(AIAssistantType.Security),
          chatExperience$: of('classic'),
        },
        settings,
        spaces: {
          getActiveSpace$: () => of({} as unknown as Space),
        },
      },
    });

    const { result } = renderHook(() => useIsNavControlVisible());
    expect(result.current.isVisible).toEqual(true);
  });

  it('returns false when the current app is discover and the ai assistant type is observability', () => {
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        application: {
          currentAppId$: of('discover'),
          applications$: of(
            new Map([['discover', { id: 'discover', category: { id: 'kibana' } }]])
          ),
        },
        aiAssistantManagementSelection: {
          aiAssistantType$: of(AIAssistantType.Observability),
          chatExperience$: of('classic'),
        },
        settings,
        spaces: {
          getActiveSpace$: () => of({} as unknown as Space),
        },
      },
    });

    const { result } = renderHook(() => useIsNavControlVisible());
    expect(result.current.isVisible).toEqual(false);
  });

  it('returns true when isServerless is true regardless of app and preference', () => {
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        application: {
          currentAppId$: of('observability'),
          applications$: of(
            new Map([['observability', { id: 'observability', category: { id: 'observability' } }]])
          ),
        },
        aiAssistantManagementSelection: {
          aiAssistantType$: of(AIAssistantType.Never),
          chatExperience$: of('classic'),
        },
        settings,
        spaces: {
          getActiveSpace$: () => of({} as unknown as Space),
        },
      },
    });

    const { result } = renderHook(() => useIsNavControlVisible(true));
    expect(result.current.isVisible).toEqual(true);
  });

  it("returns true when space.solution is 'security' regardless of app and preference", () => {
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        application: {
          currentAppId$: of('observability'),
          applications$: of(
            new Map([['observability', { id: 'observability', category: { id: 'observability' } }]])
          ),
        },
        aiAssistantManagementSelection: {
          aiAssistantType$: of(AIAssistantType.Never),
          chatExperience$: of('classic'),
        },
        settings,
        spaces: {
          getActiveSpace$: () => of({ solution: 'security' } as unknown as Space),
        },
      },
    });

    const { result } = renderHook(() => useIsNavControlVisible(false));
    expect(result.current.isVisible).toEqual(true);
  });

  it('returns false when chat experience is set to Agent (AgentBuilderNavControl will be used instead)', () => {
    settings.client.get$.mockReturnValue(of(AIChatExperience.Agent));

    (useKibana as jest.Mock).mockReturnValue({
      services: {
        application: {
          currentAppId$: of('security'),
          applications$: of(
            new Map([['security', { id: 'security', category: { id: 'securitySolution' } }]])
          ),
        },
        aiAssistantManagementSelection: {
          aiAssistantType$: of(AIAssistantType.Default),
          chatExperience$: of('agents'),
        },
        settings,
        spaces: {
          getActiveSpace$: () => of({} as unknown as Space),
        },
      },
    });

    const { result } = renderHook(() => useIsNavControlVisible());
    expect(result.current.isVisible).toEqual(false);
  });
});
