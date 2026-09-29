/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { EuiTableFieldDataColumnType } from '@elastic/eui';
import type { AttackDiscoverySchedule } from '@kbn/elastic-assistant-common';

import { createEnableColumn } from './enable';
import { TestProviders } from '../../../../../../common/mock';
import { mockAttackDiscoverySchedule } from '../../../../mock/mock_attack_discovery_schedule';
import { useKibana } from '../../../../../../common/lib/kibana';
import { ATTACK_DISCOVERY_FEATURE_ID } from '../../../../../../../common/constants';

vi.mock('../../../../../../common/lib/kibana');

const onSwitchChangeMock = vi.fn();

const renderEnabledSchedule = (enabled = true) => {
  const column = createEnableColumn({
    isDisabled: false,
    isLoading: false,
    onSwitchChange: onSwitchChangeMock,
  }) as EuiTableFieldDataColumnType<AttackDiscoverySchedule>;

  render(
    <TestProviders>
      {column.render?.('', { ...mockAttackDiscoverySchedule, enabled })}
    </TestProviders>
  );
};

describe('Enable Column', () => {
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

  it('should render enable button', () => {
    renderEnabledSchedule();
    expect(screen.getByTestId('scheduleSwitch')).toBeInTheDocument();
  });

  it('should render enable button as checked if schedule is enabled', () => {
    renderEnabledSchedule(true);
    expect(screen.getByTestId('scheduleSwitch')).toBeChecked();
  });

  it('should render enable button as not-checked if schedule is enabled', () => {
    renderEnabledSchedule(false);
    expect(screen.getByTestId('scheduleSwitch')).not.toBeChecked();
  });

  it('should invoke `onSwitchChange` with correct parameters for the enabled schedule', async () => {
    renderEnabledSchedule(true);

    const scheduleSwitch = screen.getByTestId('scheduleSwitch');
    fireEvent.click(scheduleSwitch);

    expect(onSwitchChangeMock).toHaveBeenCalledWith(mockAttackDiscoverySchedule.id, false);
  });

  it('should invoke `onSwitchChange` with correct parameters for the disabled schedule', async () => {
    renderEnabledSchedule(false);

    const deleteButton = screen.getByTestId('scheduleSwitch');
    fireEvent.click(deleteButton);

    expect(onSwitchChangeMock).toHaveBeenCalledWith(mockAttackDiscoverySchedule.id, true);
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
      renderEnabledSchedule();
      expect(screen.getByTestId('scheduleSwitch')).toBeDisabled();
    });

    it('should not invoke `deleteSchedule` when the delete button is clicked', async () => {
      renderEnabledSchedule();

      const deleteButton = screen.getByTestId('scheduleSwitch');
      fireEvent.click(deleteButton);

      expect(onSwitchChangeMock).not.toHaveBeenCalled();
    });

    it('should render missing privileges tooltip', async () => {
      renderEnabledSchedule();

      const scheduleSwitch = screen.getByTestId('scheduleSwitch');
      fireEvent.mouseOver(scheduleSwitch.parentElement as Node);

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

    it('should disable the enable switch', async () => {
      renderEnabledSchedule();

      await waitFor(() => {
        expect(screen.getByTestId('scheduleSwitch')).toBeDisabled();
      });
    });
  });
});
