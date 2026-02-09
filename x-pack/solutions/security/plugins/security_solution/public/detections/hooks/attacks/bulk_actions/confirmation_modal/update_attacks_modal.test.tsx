/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';

import {
  UpdateAttacksModal,
  UPDATE_ATTACKS_MODAL_CANCEL_TEST_ID,
  UPDATE_ATTACKS_MODAL_UPDATE_ATTACKS_ONLY_TEST_ID,
  UPDATE_ATTACKS_MODAL_UPDATE_ATTACKS_AND_ALERTS_TEST_ID,
} from './update_attacks_modal';

// Mock EUI hooks and components
jest.mock('@elastic/eui', () => {
  const actual = jest.requireActual('@elastic/eui');
  return {
    ...actual,
    useEuiTheme: () => ({ euiTheme: { size: { m: '8px', xxxl: '32px' } } }),
    useGeneratedHtmlId: jest.fn(() => 'generated-id'),
  };
});

const defaultProps = {
  alertsCount: 5,
  attackDiscoveriesCount: 2,
  onCancel: jest.fn(),
  onClose: jest.fn(),
  onConfirm: jest.fn(),
  actionType: 'workflow_status' as const,
};

describe('UpdateAttacksModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render modal with correct title', () => {
    render(<UpdateAttacksModal {...defaultProps} />);

    expect(screen.getByText(/update alerts\?/i)).toBeInTheDocument();
  });

  it('should render modal body with alert counts', () => {
    render(<UpdateAttacksModal {...defaultProps} />);

    expect(
      screen.getByText(/update alerts associated with 2 attack discoveries\?/i)
    ).toBeInTheDocument();
  });

  it('should render cancel button', () => {
    render(<UpdateAttacksModal {...defaultProps} />);

    const cancelButton = screen.getByTestId(UPDATE_ATTACKS_MODAL_CANCEL_TEST_ID);
    expect(cancelButton).toBeInTheDocument();
    expect(cancelButton).toHaveTextContent('Cancel');
  });

  it('should call onCancel when cancel button is clicked', () => {
    const onCancel = jest.fn();
    render(<UpdateAttacksModal {...defaultProps} onCancel={onCancel} />);

    fireEvent.click(screen.getByTestId(UPDATE_ATTACKS_MODAL_CANCEL_TEST_ID));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('should render update attacks only button', () => {
    render(<UpdateAttacksModal {...defaultProps} />);

    const updateAttacksOnlyButton = screen.getByTestId(
      UPDATE_ATTACKS_MODAL_UPDATE_ATTACKS_ONLY_TEST_ID
    );
    expect(updateAttacksOnlyButton).toBeInTheDocument();
    expect(updateAttacksOnlyButton).toHaveTextContent(/mark discoveries only/i);
  });

  it('should call onConfirm with updateAlerts false when update attacks only is clicked', async () => {
    const onConfirm = jest.fn().mockResolvedValue(undefined);
    render(<UpdateAttacksModal {...defaultProps} onConfirm={onConfirm} />);

    fireEvent.click(screen.getByTestId(UPDATE_ATTACKS_MODAL_UPDATE_ATTACKS_ONLY_TEST_ID));

    expect(onConfirm).toHaveBeenCalledWith({ updateAlerts: false });
  });

  it('should render update attacks and alerts button', () => {
    render(<UpdateAttacksModal {...defaultProps} />);

    const updateAttacksAndAlertsButton = screen.getByTestId(
      UPDATE_ATTACKS_MODAL_UPDATE_ATTACKS_AND_ALERTS_TEST_ID
    );
    expect(updateAttacksAndAlertsButton).toBeInTheDocument();
    expect(updateAttacksAndAlertsButton).toHaveTextContent(/mark alerts & discoveries/i);
  });

  it('should call onConfirm with updateAlerts true when update attacks and alerts is clicked', async () => {
    const onConfirm = jest.fn().mockResolvedValue(undefined);
    render(<UpdateAttacksModal {...defaultProps} onConfirm={onConfirm} />);

    fireEvent.click(screen.getByTestId(UPDATE_ATTACKS_MODAL_UPDATE_ATTACKS_AND_ALERTS_TEST_ID));

    expect(onConfirm).toHaveBeenCalledWith({ updateAlerts: true });
  });

  it('should render correct title for assignees action type', () => {
    render(<UpdateAttacksModal {...defaultProps} />);

    expect(screen.getByText(/update alerts\?/i)).toBeInTheDocument();
  });

  it('should render correct title for tags action type', () => {
    render(<UpdateAttacksModal {...defaultProps} />);

    expect(screen.getByText(/update alerts\?/i)).toBeInTheDocument();
  });

  it('should handle singular attack discovery count', () => {
    render(<UpdateAttacksModal {...defaultProps} attackDiscoveriesCount={1} />);

    expect(
      screen.getByText(/update alerts associated with the attack discovery\?/i)
    ).toBeInTheDocument();
  });

  it('should handle singular alert count', () => {
    render(<UpdateAttacksModal {...defaultProps} alertsCount={1} />);

    const updateButton = screen.getByTestId(UPDATE_ATTACKS_MODAL_UPDATE_ATTACKS_AND_ALERTS_TEST_ID);
    expect(updateButton).toHaveTextContent(/mark alert & discoveries/i);
  });
});
