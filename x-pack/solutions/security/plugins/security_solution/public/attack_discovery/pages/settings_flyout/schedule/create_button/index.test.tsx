/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { CreateButton } from '.';
import { TestProviders } from '../../../../../common/mock';
import { waitForEuiToolTipVisible } from '@elastic/eui/lib/test/rtl';
import { useKibana } from '../../../../../common/lib/kibana';
import { ATTACK_DISCOVERY_FEATURE_ID } from '../../../../../../common/constants';

jest.mock('../../../../../common/lib/kibana');

const renderCreateButton = (onClick?: () => void) => {
  render(
    <TestProviders>
      <CreateButton onClick={onClick} />
    </TestProviders>
  );
};

describe('CreateButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when enabled update capability', () => {
    beforeEach(() => {
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

    it('should render create schedule button', async () => {
      renderCreateButton();
      await waitFor(() => {
        expect(screen.getByTestId('createSchedule')).toBeInTheDocument();
      });
    });

    it('should call create schedule button handler', async () => {
      const onClickMock = jest.fn();
      renderCreateButton(onClickMock);

      const createButton = screen.getByTestId('createSchedule');
      act(() => {
        fireEvent.click(createButton);
      });

      await waitFor(() => {
        expect(onClickMock).toHaveBeenCalled();
      });
    });

    it('should not render missing privileges tooltip', async () => {
      renderCreateButton();

      expect(screen.queryByTestId('missingPrivilegesTooltip')).not.toBeInTheDocument();
    });
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

    it('should render create schedule button', async () => {
      renderCreateButton();
      await waitFor(() => {
        expect(screen.getByTestId('createSchedule')).toBeInTheDocument();
      });
    });

    it('should not call create schedule button handler', async () => {
      const onClickMock = jest.fn();
      renderCreateButton(onClickMock);

      const createButton = screen.getByTestId('createSchedule');
      act(() => {
        fireEvent.click(createButton);
      });

      await waitFor(() => {
        expect(onClickMock).not.toHaveBeenCalled();
      });
    });

    it('should render missing privileges tooltip', async () => {
      renderCreateButton();

      const createButton = screen.getByTestId('createSchedule');
      fireEvent.mouseOver(createButton.parentElement as Node);
      await waitForEuiToolTipVisible();

      const tooltip = screen.getByRole('tooltip');
      expect(tooltip).toHaveTextContent('Missing privileges');
    });
  });
});
