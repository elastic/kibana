/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { renderHook } from '@testing-library/react';
import { useFooterItems } from './footer_items';
import { OnboardingFooterLinkItemId } from './constants';
import { useKibana } from '../../../common/lib/kibana';
import { BehaviorSubject } from 'rxjs';

jest.mock('../../../common/lib/kibana');

describe('useFooterItems', () => {
  const mockUseKibana = useKibana as jest.Mock;

  const createMockServices = ({
    projectUrl,
    deploymentUrl,
  }: {
    projectUrl: string | null;
    deploymentUrl: string | null;
  }) => ({
    services: {
      onboarding: {
        projectUrl$: new BehaviorSubject(projectUrl),
        deploymentUrl$: new BehaviorSubject(deploymentUrl),
      },
    },
  });

  it('returns default footer items only when neither projectUrl nor deploymentUrl are available', () => {
    mockUseKibana.mockReturnValue(createMockServices({ projectUrl: null, deploymentUrl: null }));

    const { result } = renderHook(() => useFooterItems());
    const items = result.current;

    expect(items).toHaveLength(3);
    expect(items[0].id).toBe(OnboardingFooterLinkItemId.documentation);
  });

  it('returns project item when projectUrl is available', () => {
    mockUseKibana.mockReturnValue(
      createMockServices({ projectUrl: 'https://my-project', deploymentUrl: null })
    );

    const { result } = renderHook(() => useFooterItems());
    const items = result.current;

    expect(items).toHaveLength(4);
    expect(items[0].id).toBe(OnboardingFooterLinkItemId.expand);
    expect(items[0].link.href).toBe('https://my-project');
  });

  it('returns deployment item when deploymentUrl is available but projectUrl is not', () => {
    mockUseKibana.mockReturnValue(
      createMockServices({ projectUrl: null, deploymentUrl: 'https://my-deployment' })
    );

    const { result } = renderHook(() => useFooterItems());
    const items = result.current;

    expect(items).toHaveLength(4);
    expect(items[0].id).toBe(OnboardingFooterLinkItemId.manageDeployment);
    expect(items[0].link.href).toBe('https://my-deployment');
  });
});
