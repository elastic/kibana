/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mocked, MockedFunction } from 'vitest';

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';

import { SchedulesFlyout } from '.';
import { useKibana } from '../../../../common/lib/kibana';
import { TestProviders } from '../../../../common/mock';
import {
  ATTACK_DISCOVERY_SCHEDULE,
  ATTACK_DISCOVERY_SETTINGS,
} from '../../../../attack_discovery/pages/settings_flyout/translations';

vi.mock('../../../../common/hooks/use_experimental_features');
vi.mock('../../../../common/lib/kibana');
vi.mock('react-router-dom', () => {
  const mocked = {
    matchPath: vi.fn(),
    useLocation: vi.fn().mockReturnValue({
      search: '',
    }),
    withRouter: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

const defaultProps = {
  onClose: vi.fn(),
};

const mockUseKibana = useKibana as MockedFunction<typeof useKibana>;

const setupMocks = () => {
  mockUseKibana.mockReturnValue({
    services: {
      featureFlags: {
        useBooleanValue: vi.fn().mockReturnValue(false),
      },
      lens: {
        EmbeddableComponent: () => <div data-test-subj="mockEmbeddableComponent" />,
      },
      telemetry: { reportEvent: vi.fn() },
      uiSettings: {
        get: vi.fn(),
      },
      unifiedSearch: {
        ui: {
          SearchBar: () => <div data-test-subj="mockSearchBar" />,
        },
      },
    },
  } as unknown as Mocked<ReturnType<typeof useKibana>>);
};

const renderComponent = (props = defaultProps) => {
  return render(
    <TestProviders>
      <SchedulesFlyout {...props} />
    </TestProviders>
  );
};

const clickButton = (testId: string) => {
  const button = screen.getByTestId(testId);
  fireEvent.click(button);
};

describe('SchedulesFlyout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMocks();
  });

  it('does not render the settings tab', () => {
    renderComponent();

    expect(
      screen.queryByRole('heading', { name: ATTACK_DISCOVERY_SETTINGS })
    ).not.toBeInTheDocument();
  });

  it('renders the schedule tab', async () => {
    renderComponent();

    expect(screen.getByRole('heading', { name: ATTACK_DISCOVERY_SCHEDULE })).toBeInTheDocument();
  });

  it('invokes onClose when the close button is clicked', () => {
    renderComponent();

    clickButton('euiFlyoutCloseButton');

    expect(defaultProps.onClose).toHaveBeenCalled();
  });
});
