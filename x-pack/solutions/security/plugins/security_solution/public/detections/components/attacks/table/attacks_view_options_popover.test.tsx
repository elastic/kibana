/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { AttacksViewOptionsPopover } from './attacks_view_options_popover';
import { TABLE_SECTION_TEST_ID } from './table_section';
import { useKibana } from '../../../../common/lib/kibana';
import { AttacksEventTypes } from '../../../../common/lib/telemetry';

jest.mock('../../../../common/lib/kibana');

jest.mock(
  '@kbn/elastic-assistant/impl/data_anonymization/settings/anonymization_settings_management',
  () => ({
    AnonymizationSettingsManagement: ({ onClose }: { onClose: () => void }) => (
      <div data-test-subj="anonymizationSettingsModal">
        <button type="button" data-test-subj="closeAnonymizationSettingsModal" onClick={onClose}>
          {'Close'}
        </button>
      </div>
    ),
  })
);

describe('AttacksViewOptionsPopover', () => {
  const defaultProps = {
    showAnonymized: false,
    onToggleShowAnonymized: jest.fn(),
    showAttacksOnly: true,
    onToggleShowAttacksOnly: jest.fn(),
  };

  const reportEvent = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        telemetry: {
          reportEvent,
        },
      },
    });
  });

  it('renders the view options button', () => {
    const { getByTestId } = render(<AttacksViewOptionsPopover {...defaultProps} />);
    expect(getByTestId(`${TABLE_SECTION_TEST_ID}-view-options-button`)).toBeInTheDocument();
  });

  it('opens the popover when the button is clicked', async () => {
    const { getByTestId } = render(<AttacksViewOptionsPopover {...defaultProps} />);

    fireEvent.click(getByTestId(`${TABLE_SECTION_TEST_ID}-view-options-button`));

    await waitFor(() => {
      expect(getByTestId(`${TABLE_SECTION_TEST_ID}-show-anonymized-switch`)).toBeInTheDocument();
      expect(getByTestId(`${TABLE_SECTION_TEST_ID}-show-attacks-only-switch`)).toBeInTheDocument();
    });
  });

  it('calls onToggleShowAnonymized when the anonymized switch is toggled', async () => {
    const { getByTestId } = render(<AttacksViewOptionsPopover {...defaultProps} />);

    fireEvent.click(getByTestId(`${TABLE_SECTION_TEST_ID}-view-options-button`));

    await waitFor(() => {
      expect(getByTestId(`${TABLE_SECTION_TEST_ID}-show-anonymized-switch`)).toBeInTheDocument();
    });

    fireEvent.click(getByTestId(`${TABLE_SECTION_TEST_ID}-show-anonymized-switch`));
    expect(defaultProps.onToggleShowAnonymized).toHaveBeenCalled();
    expect(reportEvent).toHaveBeenCalledWith(AttacksEventTypes.ViewOptionChanged, {
      option: 'showAnonymized',
      enabled: true,
    });
  });

  it('calls onToggleShowAttacksOnly when the attacks only switch is toggled', async () => {
    const { getByTestId } = render(<AttacksViewOptionsPopover {...defaultProps} />);

    fireEvent.click(getByTestId(`${TABLE_SECTION_TEST_ID}-view-options-button`));

    await waitFor(() => {
      expect(getByTestId(`${TABLE_SECTION_TEST_ID}-show-attacks-only-switch`)).toBeInTheDocument();
    });

    fireEvent.click(getByTestId(`${TABLE_SECTION_TEST_ID}-show-attacks-only-switch`));
    expect(defaultProps.onToggleShowAttacksOnly).toHaveBeenCalled();
    expect(reportEvent).toHaveBeenCalledWith(AttacksEventTypes.ViewOptionChanged, {
      option: 'showAttacksOnly',
      enabled: false,
    });
  });

  it('renders switches with correct checked state', async () => {
    const props = {
      ...defaultProps,
      showAnonymized: true,
      showAttacksOnly: false,
    };
    const { getByTestId } = render(<AttacksViewOptionsPopover {...props} />);

    fireEvent.click(getByTestId(`${TABLE_SECTION_TEST_ID}-view-options-button`));

    await waitFor(() => {
      const anonymizedSwitch = getByTestId(`${TABLE_SECTION_TEST_ID}-show-anonymized-switch`);
      const attacksOnlySwitch = getByTestId(`${TABLE_SECTION_TEST_ID}-show-attacks-only-switch`);

      expect(anonymizedSwitch).toHaveAttribute('aria-checked', 'true');
      expect(attacksOnlySwitch).toHaveAttribute('aria-checked', 'false');
    });
  });

  it('renders the anonymization settings button inside the popover', async () => {
    const { getByTestId } = render(<AttacksViewOptionsPopover {...defaultProps} />);

    fireEvent.click(getByTestId(`${TABLE_SECTION_TEST_ID}-view-options-button`));

    await waitFor(() => {
      expect(
        getByTestId(`${TABLE_SECTION_TEST_ID}-anonymization-settings-button`)
      ).toBeInTheDocument();
    });
  });

  it('opens the anonymization settings modal when the settings button is clicked', async () => {
    const { getByTestId } = render(<AttacksViewOptionsPopover {...defaultProps} />);

    fireEvent.click(getByTestId(`${TABLE_SECTION_TEST_ID}-view-options-button`));

    await waitFor(() => {
      expect(
        getByTestId(`${TABLE_SECTION_TEST_ID}-anonymization-settings-button`)
      ).toBeInTheDocument();
    });

    fireEvent.click(getByTestId(`${TABLE_SECTION_TEST_ID}-anonymization-settings-button`));

    await waitFor(() => {
      expect(getByTestId('anonymizationSettingsModal')).toBeInTheDocument();
    });
  });

  it('closes the anonymization settings modal when onClose is triggered', async () => {
    const { getByTestId, queryByTestId } = render(<AttacksViewOptionsPopover {...defaultProps} />);

    fireEvent.click(getByTestId(`${TABLE_SECTION_TEST_ID}-view-options-button`));

    await waitFor(() => {
      expect(
        getByTestId(`${TABLE_SECTION_TEST_ID}-anonymization-settings-button`)
      ).toBeInTheDocument();
    });

    fireEvent.click(getByTestId(`${TABLE_SECTION_TEST_ID}-anonymization-settings-button`));

    await waitFor(() => {
      expect(getByTestId('anonymizationSettingsModal')).toBeInTheDocument();
    });

    fireEvent.click(getByTestId('closeAnonymizationSettingsModal'));

    await waitFor(() => {
      expect(queryByTestId('anonymizationSettingsModal')).not.toBeInTheDocument();
    });
  });
});
