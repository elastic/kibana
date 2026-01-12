/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { buildSlo } from '../../../data/slo/slo';
import { DEFAULT_STALE_SLO_THRESHOLD_HOURS } from '../../../../common/constants';
import { usePurgeInstances } from '../../../pages/slo_management/hooks/use_purge_instances';
import { useGetSettings } from '../../../pages/slo_settings/hooks/use_get_settings';
import { render } from '../../../utils/test_helper';
import { PurgeInstancesConfirmationModal } from './purge_instances_confirmation_modal';

jest.mock('../../../pages/slo_management/hooks/use_purge_instances');
jest.mock('../../../pages/slo_settings/hooks/use_get_settings');

const usePurgeInstancesMock = usePurgeInstances as jest.Mock;
const useGetSettingsMock = useGetSettings as jest.Mock;

describe('PurgeInstancesConfirmationModal', () => {
  const mockPurgeInstances = jest.fn();
  const mockOnCancel = jest.fn();
  const mockOnConfirm = jest.fn();

  const defaultProps = {
    items: [buildSlo({ id: 'slo-1' }), buildSlo({ id: 'slo-2' })],
    onCancel: mockOnCancel,
    onConfirm: mockOnConfirm,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    usePurgeInstancesMock.mockReturnValue({ mutate: mockPurgeInstances });
    useGetSettingsMock.mockReturnValue({
      data: { staleThresholdInHours: 72 },
      isLoading: false,
    });
  });

  describe('Rendering Tests', () => {
    it('should render with default stale duration from settings', async () => {
      useGetSettingsMock.mockReturnValue({
        data: { staleThresholdInHours: 72 },
        isLoading: false,
      });

      render(<PurgeInstancesConfirmationModal {...defaultProps} />);

      await waitFor(() => {
        const input = screen.getByTestId(
          'sloPurgeInstancesConfirmationModalFieldNumber'
        ) as HTMLInputElement;
        expect(input.value).toBe('72');
      });
    });

    it('should render with default constant when settings are loading', () => {
      useGetSettingsMock.mockReturnValue({
        data: undefined,
        isLoading: true,
      });

      render(<PurgeInstancesConfirmationModal {...defaultProps} />);

      const input = screen.getByTestId(
        'sloPurgeInstancesConfirmationModalFieldNumber'
      ) as HTMLInputElement;
      expect(input.value).toBe(String(DEFAULT_STALE_SLO_THRESHOLD_HOURS));
    });
  });

  describe('Form Validation Tests', () => {
    it('should disable confirm button when staleDuration is zero', async () => {
      render(<PurgeInstancesConfirmationModal {...defaultProps} />);

      const input = screen.getByTestId('sloPurgeInstancesConfirmationModalFieldNumber');
      await userEvent.clear(input);
      await userEvent.type(input, '0');

      const confirmButton = screen.getByRole('button', { name: /Purge/i });
      expect(confirmButton).toBeDisabled();
    });

    it('should disable confirm button when staleDuration is negative', async () => {
      render(<PurgeInstancesConfirmationModal {...defaultProps} />);

      const input = screen.getByTestId('sloPurgeInstancesConfirmationModalFieldNumber');
      await userEvent.clear(input);
      await userEvent.type(input, '-5');

      const confirmButton = screen.getByRole('button', { name: /Purge/i });
      expect(confirmButton).toBeDisabled();
    });

    it('should enable confirm button when form is valid', async () => {
      render(<PurgeInstancesConfirmationModal {...defaultProps} />);

      const input = screen.getByTestId('sloPurgeInstancesConfirmationModalFieldNumber');
      await userEvent.clear(input);
      await userEvent.type(input, '100');

      await waitFor(() => {
        const confirmButton = screen.getByRole('button', { name: /Purge/i });
        expect(confirmButton).not.toBeDisabled();
      });
    });

    it('should require override checkbox when staleDuration is less than settings', async () => {
      useGetSettingsMock.mockReturnValue({
        data: { staleThresholdInHours: 72 },
        isLoading: false,
      });

      render(<PurgeInstancesConfirmationModal {...defaultProps} />);

      // Change staleDuration to less than settings
      const input = screen.getByTestId('sloPurgeInstancesConfirmationModalFieldNumber');
      await userEvent.clear(input);
      await userEvent.type(input, '48');

      await waitFor(() => {
        const confirmButton = screen.getByRole('button', { name: /Purge/i });
        expect(confirmButton).toBeDisabled();
      });

      // Verify override checkbox is enabled
      const checkbox = screen.getByTestId('sloPurgeInstancesConfirmationModalOverrideCheckbox');
      expect(checkbox).not.toBeDisabled();

      // Check the override checkbox
      await userEvent.click(checkbox);

      await waitFor(() => {
        const confirmButton = screen.getByRole('button', { name: /Purge/i });
        expect(confirmButton).not.toBeDisabled();
      });
    });

    it('should not require override checkbox when staleDuration is greater than or equal to settings', async () => {
      useGetSettingsMock.mockReturnValue({
        data: { staleThresholdInHours: 72 },
        isLoading: false,
      });

      render(<PurgeInstancesConfirmationModal {...defaultProps} />);

      // staleDuration equals settings initially (72)
      await waitFor(() => {
        const checkbox = screen.getByTestId('sloPurgeInstancesConfirmationModalOverrideCheckbox');
        expect(checkbox).toBeDisabled();
      });

      const confirmButton = screen.getByRole('button', { name: /Purge/i });
      expect(confirmButton).not.toBeDisabled();
    });
  });

  describe('Hook Integration Tests', () => {
    it('should call purgeInstances with correct parameters on confirm', async () => {
      useGetSettingsMock.mockReturnValue({
        data: { staleThresholdInHours: 72 },
        isLoading: false,
      });

      const testItems = [buildSlo({ id: 'test-slo-1' }), buildSlo({ id: 'test-slo-2' })];

      render(
        <PurgeInstancesConfirmationModal
          items={testItems}
          onCancel={mockOnCancel}
          onConfirm={mockOnConfirm}
        />
      );

      // Set staleDuration to 48
      const input = screen.getByTestId('sloPurgeInstancesConfirmationModalFieldNumber');
      await userEvent.clear(input);
      await userEvent.type(input, '48');

      // Enable override
      const checkbox = screen.getByTestId('sloPurgeInstancesConfirmationModalOverrideCheckbox');
      await userEvent.click(checkbox);

      // Click confirm
      const confirmButton = screen.getByRole('button', { name: /Purge/i });
      await userEvent.click(confirmButton);

      expect(mockPurgeInstances).toHaveBeenCalledWith({
        list: ['test-slo-1', 'test-slo-2'],
        staleDuration: '48h',
        force: true,
      });
    });

    it('should call purgeInstances with force:false when override is not required', async () => {
      useGetSettingsMock.mockReturnValue({
        data: { staleThresholdInHours: 72 },
        isLoading: false,
      });

      render(<PurgeInstancesConfirmationModal {...defaultProps} />);

      // Set staleDuration to 100 (greater than settings)
      const input = screen.getByTestId('sloPurgeInstancesConfirmationModalFieldNumber');
      await userEvent.clear(input);
      await userEvent.type(input, '100');

      // Click confirm
      const confirmButton = screen.getByRole('button', { name: /Purge/i });
      await userEvent.click(confirmButton);

      expect(mockPurgeInstances).toHaveBeenCalledWith({
        list: expect.any(Array),
        staleDuration: '100h',
        force: false,
      });
    });

    it('should call onCancel when cancel button is clicked', async () => {
      render(<PurgeInstancesConfirmationModal {...defaultProps} />);

      const cancelButton = screen.getByRole('button', { name: /Cancel/i });
      await userEvent.click(cancelButton);

      expect(mockOnCancel).toHaveBeenCalledTimes(1);
    });

    it('should pass onConfirm to usePurgeInstances hook', () => {
      render(<PurgeInstancesConfirmationModal {...defaultProps} />);

      expect(usePurgeInstancesMock).toHaveBeenCalledWith({ onConfirm: mockOnConfirm });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty items array', async () => {
      render(
        <PurgeInstancesConfirmationModal
          items={[]}
          onCancel={mockOnCancel}
          onConfirm={mockOnConfirm}
        />
      );

      const confirmButton = screen.getByRole('button', { name: /Purge/i });
      await userEvent.click(confirmButton);

      expect(mockPurgeInstances).toHaveBeenCalledWith({
        list: [],
        staleDuration: expect.any(String),
        force: false,
      });
    });

    it('should handle undefined items', async () => {
      render(
        <PurgeInstancesConfirmationModal
          items={undefined}
          onCancel={mockOnCancel}
          onConfirm={mockOnConfirm}
        />
      );

      const confirmButton = screen.getByRole('button', { name: /Purge/i });
      await userEvent.click(confirmButton);

      expect(mockPurgeInstances).toHaveBeenCalledWith({
        list: [],
        staleDuration: expect.any(String),
        force: false,
      });
    });

    it('should handle undefined settings data', () => {
      useGetSettingsMock.mockReturnValue({
        data: undefined,
        isLoading: false,
      });

      render(<PurgeInstancesConfirmationModal {...defaultProps} />);

      const input = screen.getByTestId(
        'sloPurgeInstancesConfirmationModalFieldNumber'
      ) as HTMLInputElement;
      expect(input.value).toBe(String(DEFAULT_STALE_SLO_THRESHOLD_HOURS));
    });
  });
});
