/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { EditRuleFormButtons } from './edit_rule_form_buttons';

const clickResults: Array<Promise<void> | void> = [];

interface MockButtonProps {
  'data-test-subj'?: string;
  onClick: (ev: React.MouseEvent) => Promise<void> | void;
  isLoading?: boolean;
  isDisabled?: boolean;
  children: React.ReactNode;
}

jest.mock('@elastic/eui', () => ({
  ...jest.requireActual('@elastic/eui'),
  EuiButton: ({
    'data-test-subj': dataTestSubj,
    onClick,
    isLoading,
    isDisabled,
    children,
  }: MockButtonProps) => (
    <button
      type="button"
      data-test-subj={dataTestSubj}
      disabled={isLoading || isDisabled}
      onClick={(ev) => {
        clickResults.push(onClick(ev));
      }}
    >
      {children}
    </button>
  ),
}));

describe('EditRuleFormButtons', () => {
  const renderButtons = (onSubmit: () => Promise<void>) =>
    render(
      <EditRuleFormButtons
        onCancel={jest.fn()}
        onSubmit={onSubmit}
        isLoading={false}
        isDisabled={false}
      />
    );

  beforeEach(() => {
    clickResults.length = 0;
    jest.useFakeTimers();
    jest
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation((callback: FrameRequestCallback) => {
        callback(0);
        return 0;
      });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('shows loading state before running onSubmit', () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    renderButtons(onSubmit);

    fireEvent.click(screen.getByTestId('ruleEditSubmitButton'));

    expect(screen.getByTestId('ruleEditSubmitButton')).toHaveAttribute('disabled');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('runs onSubmit after the next paint and clears loading state on success', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    renderButtons(onSubmit);

    fireEvent.click(screen.getByTestId('ruleEditSubmitButton'));
    await act(async () => {
      await jest.runAllTimersAsync();
    });

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('ruleEditSubmitButton')).not.toHaveAttribute('disabled');
  });

  it('clears loading state when onSubmit rejects', async () => {
    const onSubmit = jest.fn().mockRejectedValue(new Error('failed'));
    renderButtons(onSubmit);

    fireEvent.click(screen.getByTestId('ruleEditSubmitButton'));
    // the click handler returns the submit promise, which the mocked button exposes for assertions
    const assertion = expect(clickResults[0]).rejects.toThrow('failed');
    await act(async () => {
      await jest.runAllTimersAsync();
    });
    await assertion;

    expect(screen.getByTestId('ruleEditSubmitButton')).not.toHaveAttribute('disabled');
  });
});
