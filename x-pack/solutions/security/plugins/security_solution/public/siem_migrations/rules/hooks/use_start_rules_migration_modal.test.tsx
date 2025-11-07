/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, act, fireEvent, render } from '@testing-library/react';
import { useStartRulesMigrationModal } from './use_start_rules_migration_modal';

jest.mock('../../common/components', () => ({
  StartMigrationModal: (props: {
    onStartMigrationWithSettings: (settings: { connectorId: string }) => void;
    additionalSettings: React.ReactNode;
  }) => (
    <div>
      <button
        type="button"
        onClick={() => props.onStartMigrationWithSettings({ connectorId: 'test-connector' })}
      >
        {'Start Test Migration'}
      </button>
      {props.additionalSettings}
    </div>
  ),
  DATA_TEST_SUBJ_PREFIX: 'test',
}));

describe('useStartRulesMigrationModal', () => {
  const mockOnStartMigrationWithSettings = jest.fn();

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should not render the modal initially', () => {
    const { result } = renderHook(() =>
      useStartRulesMigrationModal({
        type: 'start',
        onStartMigrationWithSettings: mockOnStartMigrationWithSettings,
      })
    );

    expect(result.current.modal).toBeNull();
  });

  it('should render the modal when showModal is called', () => {
    const { result } = renderHook(() =>
      useStartRulesMigrationModal({
        type: 'start',
        onStartMigrationWithSettings: mockOnStartMigrationWithSettings,
      })
    );

    act(() => {
      result.current.showModal();
    });

    expect(result.current.modal).toBeDefined();
  });

  it('should call onStartMigrationWithSettings with the correct settings', () => {
    let currentModal: React.ReactNode;
    const { result, rerender } = renderHook(() => {
      const hookResult = useStartRulesMigrationModal({
        type: 'start',
        onStartMigrationWithSettings: mockOnStartMigrationWithSettings,
      });
      currentModal = hookResult.modal;
      return hookResult;
    });

    act(() => {
      result.current.showModal();
    });

    rerender();

    const { getByText, getByTestId, rerender: rerenderModal } = render(currentModal);

    act(() => {
      fireEvent.click(getByText('Start Test Migration'));
    });

    expect(mockOnStartMigrationWithSettings).toHaveBeenCalledWith({
      connectorId: 'test-connector',
      skipPrebuiltRulesMatching: false,
    });

    const switchControl = getByTestId('test-PrebuiltRulesMatchingSwitch') as HTMLInputElement;
    act(() => {
      fireEvent.click(switchControl);
    });

    rerender();
    rerenderModal(result.current.modal);

    act(() => {
      fireEvent.click(getByText('Start Test Migration'));
    });

    expect(mockOnStartMigrationWithSettings).toHaveBeenCalledWith({
      connectorId: 'test-connector',
      skipPrebuiltRulesMatching: true,
    });
  });
});
