/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock, MockedFunction } from 'vitest';

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { EuiTableFieldDataColumnType } from '@elastic/eui';
import type { AttackDiscoverySchedule } from '@kbn/elastic-assistant-common';

import { createActionsColumn } from './actions';
import { TestProviders } from '../../../../../../common/mock';
import { mockAttackDiscoverySchedule } from '../../../../mock/mock_attack_discovery_schedule';
import { useKibana } from '../../../../../../common/lib/kibana';
import { ATTACK_DISCOVERY_FEATURE_ID } from '../../../../../../../common/constants';

vi.mock('../../../../../../common/lib/kibana');

const mockUseKibana = useKibana as MockedFunction<typeof useKibana>;

const requestDeleteScheduleMock = vi.fn();

const renderComponent = () => {
  const column = createActionsColumn({
    isDisabled: false,
    requestDeleteSchedule: requestDeleteScheduleMock,
  }) as EuiTableFieldDataColumnType<AttackDiscoverySchedule>;

  render(<TestProviders>{column.render?.('', mockAttackDiscoverySchedule)}</TestProviders>);
};

describe('Actions Column', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    (useKibana as Mock).mockReturnValue({
      services: {
        application: {
          capabilities: {
            [ATTACK_DISCOVERY_FEATURE_ID]: {
              updateAttackDiscoverySchedule: true,
            },
          },
        },
        featureFlags: {
          useBooleanValue: vi.fn().mockReturnValue(false),
        },
        uiSettings: {
          get: vi.fn().mockReturnValue(false),
        },
      },
    });
  });

  it('should render delete button', () => {
    renderComponent();
    expect(screen.getByTestId('deleteButton')).toBeInTheDocument();
  });

  it('should invoke `requestDeleteSchedule` when the delete button is clicked', async () => {
    renderComponent();

    const deleteButton = screen.getByTestId('deleteButton');
    fireEvent.click(deleteButton);

    expect(requestDeleteScheduleMock).toHaveBeenCalledWith(mockAttackDiscoverySchedule.id);
  });

  describe('when disabled update capability', () => {
    beforeEach(() => {
      (useKibana as Mock).mockReturnValue({
        services: {
          application: {
            capabilities: {
              [ATTACK_DISCOVERY_FEATURE_ID]: {
                updateAttackDiscoverySchedule: false,
              },
            },
          },
          featureFlags: {
            useBooleanValue: vi.fn().mockReturnValue(false),
          },
          uiSettings: {
            get: vi.fn().mockReturnValue(false),
          },
        },
      });
    });

    it('should render disabled delete button', () => {
      renderComponent();
      expect(screen.getByTestId('deleteButton')).toBeDisabled();
    });

    it('should not invoke `requestDeleteSchedule` when the delete button is clicked', async () => {
      renderComponent();

      const deleteButton = screen.getByTestId('deleteButton');
      fireEvent.click(deleteButton);

      expect(requestDeleteScheduleMock).not.toHaveBeenCalled();
    });

    it('should render missing privileges tooltip', async () => {
      renderComponent();

      await userEvent.hover(screen.getByTestId('missingPrivilegesTooltipAnchor'));

      const tooltip = screen.getByRole('tooltip');
      expect(tooltip).toHaveTextContent('Missing privileges');
    });
  });

  describe('when the workflows execute privilege is missing', () => {
    beforeEach(() => {
      (useKibana as Mock).mockReturnValue({
        services: {
          application: {
            capabilities: {
              [ATTACK_DISCOVERY_FEATURE_ID]: {
                updateAttackDiscoverySchedule: true,
              },
              workflowsManagement: {
                executeWorkflow: false,
              },
            },
          },
          featureFlags: {
            useBooleanValue: vi.fn().mockReturnValue(true),
          },
          uiSettings: {
            get: vi.fn().mockReturnValue(true),
          },
        },
      });
    });

    it('should NOT disable the delete button (delete is not gated on workflows execute)', async () => {
      renderComponent();

      await waitFor(() => {
        expect(mockUseKibana().services.featureFlags.useBooleanValue).toHaveBeenCalled();
      });

      expect(screen.getByTestId('deleteButton')).not.toBeDisabled();
    });
  });
});
