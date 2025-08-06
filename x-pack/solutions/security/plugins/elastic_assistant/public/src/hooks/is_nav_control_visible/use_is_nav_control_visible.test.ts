/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useIsNavControlVisible } from './use_is_nav_control_visible';
import { of } from 'rxjs';
import { AIAssistantType } from '@kbn/ai-assistant-management-plugin/public';
import { useKibana } from '../../context/typed_kibana_context/typed_kibana_context';

jest.mock('../../context/typed_kibana_context/typed_kibana_context', () => {
  return {
    useKibana: jest.fn(),
  };
});

describe('isNavControlVisible', () => {
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
        },
      },
    });

    const { result } = renderHook(() => useIsNavControlVisible());
    expect(result.current.isVisible).toEqual(false);
  });
});
