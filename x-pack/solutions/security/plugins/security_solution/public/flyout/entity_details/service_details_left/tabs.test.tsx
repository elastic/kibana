/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import { renderHook } from '@testing-library/react';
import { TestProviders } from '../../../common/mock';
import { RESOLUTION_GROUP_TAB_TEST_ID } from '../../../entity_analytics/components/entity_resolution/test_ids';
import { useHasEntityResolutionLicense } from '../../../common/hooks/use_has_entity_resolution_license';
import { EntityDetailsLeftPanelTab } from '../shared/components/left_panel/left_panel_header';
import { useTabs } from './tabs';

vi.mock('../../../common/hooks/use_has_entity_resolution_license', () => {
      const mocked = {
      useHasEntityResolutionLicense: vi.fn(() => false),
    };
      return { ...mocked, default: mocked };
    });

describe('service_details_left useTabs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useHasEntityResolutionLicense as Mock).mockReturnValue(false);
  });

  it('includes Resolution tab when entityStoreEntityId is set and Entity Resolution license is active', () => {
    (useHasEntityResolutionLicense as Mock).mockReturnValue(true);
    const { result } = renderHook(
      () => useTabs('my-service', 'scope-1', 'stored-service-entity-1'),
      { wrapper: TestProviders }
    );

    expect(result.current).toEqual([
      expect.objectContaining({ id: EntityDetailsLeftPanelTab.RISK_INPUTS }),
      expect.objectContaining({ id: EntityDetailsLeftPanelTab.GRAPH_VIEW }),
      expect.objectContaining({
        id: EntityDetailsLeftPanelTab.RESOLUTION_GROUP,
        'data-test-subj': RESOLUTION_GROUP_TAB_TEST_ID,
      }),
    ]);
  });

  it('does not include Resolution tab when entityStoreEntityId is set but license is inactive', () => {
    (useHasEntityResolutionLicense as Mock).mockReturnValue(false);
    const { result } = renderHook(
      () => useTabs('my-service', 'scope-1', 'stored-service-entity-1'),
      { wrapper: TestProviders }
    );

    expect(result.current).toEqual([
      expect.objectContaining({ id: EntityDetailsLeftPanelTab.RISK_INPUTS }),
      expect.objectContaining({ id: EntityDetailsLeftPanelTab.GRAPH_VIEW }),
    ]);
  });

  it('does not include Resolution tab when license is active but entityStoreEntityId is missing', () => {
    (useHasEntityResolutionLicense as Mock).mockReturnValue(true);
    const { result } = renderHook(() => useTabs('my-service', 'scope-1', undefined), {
      wrapper: TestProviders,
    });

    expect(result.current).toEqual([
      expect.objectContaining({ id: EntityDetailsLeftPanelTab.RISK_INPUTS }),
    ]);
  });
});
