/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { AutomationInstructions } from './automation_instructions';
import { createTriggerFormValues } from '../automation_form_values';

describe('AutomationInstructions', () => {
  it('reports typed guidance with an accessible optional Slack field', () => {
    const onInstructionsChange = jest.fn();
    render(
      <AutomationInstructions
        instructions=""
        trigger={createTriggerFormValues('slack_message')}
        onInstructionsChange={onInstructionsChange}
      />
    );
    const input = screen.getByRole('textbox', { name: 'Additional Instructions' });
    expect(input).toHaveAttribute(
      'placeholder',
      'Optionally add context or priorities to guide the investigation when a Slack message triggers this automation…'
    );
    expect(input).not.toBeRequired();
    expect(screen.getByText('Maximum 5,000 characters.')).toBeInTheDocument();
    fireEvent.change(input, { target: { value: 'Find the cause' } });
    expect(onInstructionsChange).toHaveBeenCalledWith('Find the cause');
  });

  it('shows stored oversized text and an error instead of truncating it', () => {
    const instructions = 'x'.repeat(5001);
    render(
      <AutomationInstructions
        instructions={instructions}
        trigger={createTriggerFormValues('alert')}
        onInstructionsChange={jest.fn()}
      />
    );
    expect(screen.getByRole('textbox', { name: 'Additional Instructions' })).toHaveValue(
      instructions
    );
    expect(screen.getByRole('textbox', { name: 'Additional Instructions' })).toBeInvalid();
    expect(screen.getByText('Instructions must be at most 5000 characters.')).toBeInTheDocument();
  });

  it('shows the optional empty state without a mode badge in the overview', () => {
    render(
      <AutomationInstructions
        instructions=""
        trigger={createTriggerFormValues('alert')}
        onInstructionsChange={jest.fn()}
        readOnly
      />
    );
    expect(screen.getByText('No additional instructions')).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.queryByTestId('automationInstructionMode')).not.toBeInTheDocument();
  });
});
