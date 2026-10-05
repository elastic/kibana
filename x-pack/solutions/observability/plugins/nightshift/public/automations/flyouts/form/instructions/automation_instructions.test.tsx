/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { AutomationInstructions } from './automation_instructions';
import type { InstructionMode } from '../automation_form_values';

const onInstructionsChange = jest.fn();

const Instructions = () => {
  const [mode, setMode] = useState<InstructionMode>('ask');
  return (
    <I18nProvider>
      <AutomationInstructions
        instructions=""
        mode={mode}
        onInstructionsChange={onInstructionsChange}
        onModeChange={setMode}
      />
    </I18nProvider>
  );
};

describe('AutomationInstructions', () => {
  it('reports typed instructions', () => {
    render(<Instructions />);

    fireEvent.change(screen.getByTestId('automationInstructions'), {
      target: { value: 'Find the cause' },
    });

    expect(onInstructionsChange).toHaveBeenCalledWith('Find the cause');
  });

  it('switches between Ask and Investigate modes', async () => {
    render(<Instructions />);

    expect(screen.getByTestId('automationInstructions')).toHaveAttribute(
      'placeholder',
      'Ask a question when this automation runs…'
    );
    fireEvent.click(screen.getByTestId('automationInstructionMode'));
    fireEvent.click(await screen.findByTestId('automationInstructionMode-investigate'));

    expect(screen.getByTestId('automationInstructionMode')).toHaveTextContent('Investigate');
    expect(screen.getByTestId('automationInstructions')).toHaveAttribute(
      'placeholder',
      'Describe how Nightshift should investigate and respond when this automation runs…'
    );
  });
});
