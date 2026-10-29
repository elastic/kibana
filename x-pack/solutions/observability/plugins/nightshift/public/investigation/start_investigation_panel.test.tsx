/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { useStartInvestigation } from '../hooks/use_start_investigation';
import { StartInvestigationPanel } from './start_investigation_panel';

jest.mock('../hooks/use_start_investigation');

const mockUseStartInvestigation = useStartInvestigation as jest.Mock;
const startInvestigation = jest.fn();
const onClose = jest.fn();

const renderPanel = () =>
  render(
    <I18nProvider>
      <StartInvestigationPanel onClose={onClose} />
    </I18nProvider>
  );

const getInput = () => screen.getByTestId('nightshiftStartInvestigationInput');
const getSubmitButton = () => screen.getByTestId('nightshiftStartInvestigationSubmitButton');

describe('StartInvestigationPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseStartInvestigation.mockReturnValue({ startInvestigation, isStarting: false });
  });

  it('starts an investigation with the trimmed question', () => {
    renderPanel();

    fireEvent.change(getInput(), { target: { value: '  Why is checkout slow?  ' } });
    fireEvent.click(getSubmitButton());

    expect(startInvestigation).toHaveBeenCalledWith('Why is checkout slow?');
  });

  it('does not submit again while an investigation is starting', () => {
    mockUseStartInvestigation.mockReturnValue({ startInvestigation, isStarting: true });
    renderPanel();

    fireEvent.change(getInput(), { target: { value: 'Why is checkout slow?' } });
    fireEvent.keyDown(getInput(), { key: 'Enter', metaKey: true });

    expect(startInvestigation).not.toHaveBeenCalled();
    expect(getInput()).toBeDisabled();
  });
});
