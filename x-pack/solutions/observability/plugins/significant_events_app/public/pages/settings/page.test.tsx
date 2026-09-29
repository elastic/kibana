/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { MockedFunction } from 'vitest';

import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { NIGHTSHIFT_APP_ID } from '@kbn/deeplinks-observability';
import { useKibana } from '../../hooks/use_kibana';
import { useSignificantEventsAvailability } from '../../hooks/use_significant_events_availability';
import { SettingsPage } from './page';

vi.mock('../../hooks/use_kibana');
vi.mock('../../hooks/use_significant_events_availability');
vi.mock('../significant_events/components/settings/tab', () => {
      const mocked = {
      SettingsTab: () => null,
    };
      return { ...mocked, default: mocked };
    });

const mockUseKibana = useKibana as MockedFunction<typeof useKibana>;
const mockUseSignificantEventsAvailability =
  useSignificantEventsAvailability as MockedFunction<typeof useSignificantEventsAvailability>;

const getUrlForApp = vi.fn().mockReturnValue('/app/nightshift');
const navigateToApp = vi.fn();
const setBreadcrumbs = vi.fn();

const setCapabilities = (canConfigure: boolean) => {
  mockUseKibana.mockReturnValue({
    core: {
      application: {
        capabilities: { nightshift: { configure: canConfigure } },
        getUrlForApp,
        navigateToApp,
      },
      chrome: { setBreadcrumbs },
    },
  } as never);
};

describe('SettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setCapabilities(true);
    mockUseSignificantEventsAvailability.mockReturnValue({
      availability: { available: true },
      isLoading: false,
      error: null,
    } as ReturnType<typeof useSignificantEventsAvailability>);
  });

  it('redirects users without configure permission to Nightshift', async () => {
    setCapabilities(false);

    render(<SettingsPage />);

    await waitFor(() => {
      expect(navigateToApp).toHaveBeenCalledWith(NIGHTSHIFT_APP_ID);
    });
  });
});
