/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import type { EuiTableFieldDataColumnType } from '@elastic/eui';
import type { AttackDiscoverySchedule } from '@kbn/elastic-assistant-common';

import { createActionsColumn } from './actions';
import { TestProviders } from '../../../../../../common/mock';
import { mockAttackDiscoverySchedule } from '../../../../mock/mock_attack_discovery_schedule';
import { useKibana } from '../../../../../../common/lib/kibana';
import { ATTACK_DISCOVERY_FEATURE_ID } from '../../../../../../../common/constants';
import { waitForEuiToolTipVisible } from '@elastic/eui/lib/test/rtl';

jest.mock('../../../../../../common/lib/kibana');

const deleteScheduleMock = jest.fn();

const renderComponent = () => {
  const column = createActionsColumn({
    isDisabled: false,
    deleteSchedule: deleteScheduleMock,
  }) as EuiTableFieldDataColumnType<AttackDiscoverySchedule>;

  render(<TestProviders>{column.render?.('', mockAttackDiscoverySchedule)}</TestProviders>);
};

describe('Actions Column', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    (useKibana as jest.Mock).mockReturnValue({
      services: {
        application: {
          capabilities: {
            [ATTACK_DISCOVERY_FEATURE_ID]: {
              updateAttackDiscoverySchedule: true,
            },
          },
        },
      },
    });
  });

  it('should render delete button', () => {
    renderComponent();
    expect(screen.getByTestId('deleteButton')).toBeInTheDocument();
  });

  it('should invoke `deleteSchedule` when the delete button is clicked', async () => {
    renderComponent();

    const deleteButton = screen.getByTestId('deleteButton');
    fireEvent.click(deleteButton);

    expect(deleteScheduleMock).toHaveBeenCalledWith(mockAttackDiscoverySchedule.id);
  });

  describe('when disabled update capability', () => {
    beforeEach(() => {
      (useKibana as jest.Mock).mockReturnValue({
        services: {
          application: {
            capabilities: {
              [ATTACK_DISCOVERY_FEATURE_ID]: {
                updateAttackDiscoverySchedule: false,
              },
            },
          },
        },
      });
    });

    it('should render disabled delete button', () => {
      renderComponent();
      expect(screen.getByTestId('deleteButton')).toBeDisabled();
    });

    it('should not invoke `deleteSchedule` when the delete button is clicked', async () => {
      renderComponent();

      const deleteButton = screen.getByTestId('deleteButton');
      fireEvent.click(deleteButton);

      expect(deleteScheduleMock).not.toHaveBeenCalled();
    });

    it('should render missing privileges tooltip', async () => {
      renderComponent();

      const deleteButton = screen.getByTestId('deleteButton');
      fireEvent.mouseOver(deleteButton.parentElement as Node);
      await waitForEuiToolTipVisible();

      const tooltip = screen.getByRole('tooltip');
      expect(tooltip).toHaveTextContent('Missing privileges');
    });
  });
});
