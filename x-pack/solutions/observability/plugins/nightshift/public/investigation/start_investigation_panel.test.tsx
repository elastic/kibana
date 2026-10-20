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

  it('closes the panel once the investigation has started', () => {
    renderPanel();

    expect(mockUseStartInvestigation).toHaveBeenCalledWith({ onStarted: onClose });
  });

  it('disables submit until a non-blank question is entered', () => {
    renderPanel();

    expect(getSubmitButton()).toBeDisabled();

    fireEvent.change(getInput(), { target: { value: '   ' } });
    expect(getSubmitButton()).toBeDisabled();

    fireEvent.change(getInput(), { target: { value: 'Why is checkout slow?' } });
    expect(getSubmitButton()).toBeEnabled();
  });

  it('starts an investigation with the trimmed question', () => {
    renderPanel();

    fireEvent.change(getInput(), { target: { value: '  Why is checkout slow?  ' } });
    fireEvent.click(getSubmitButton());

    expect(startInvestigation).toHaveBeenCalledWith('Why is checkout slow?');
  });

  it('submits with Cmd/Ctrl + Enter but not with a plain Enter', () => {
    renderPanel();

    fireEvent.change(getInput(), { target: { value: 'Why is checkout slow?' } });
    fireEvent.keyDown(getInput(), { key: 'Enter' });
    expect(startInvestigation).not.toHaveBeenCalled();

    fireEvent.keyDown(getInput(), { key: 'Enter', metaKey: true });
    expect(startInvestigation).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(getInput(), { key: 'Enter', ctrlKey: true });
    expect(startInvestigation).toHaveBeenCalledTimes(2);
  });

  it('closes with Escape and with the cancel button', () => {
    renderPanel();

    fireEvent.keyDown(getInput(), { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByTestId('nightshiftStartInvestigationCancelButton'));
    expect(onClose).toHaveBeenCalledTimes(2);
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
