/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { CreateAutomationFlyout } from './create_automation_flyout';
import { useCreateAutomation } from '../../hooks/use_automations';

jest.mock('../../hooks/use_automations', () => ({ useCreateAutomation: jest.fn() }));
jest.mock('../../../hooks/use_rule_catalog', () => ({ useRuleCatalog: () => ({ data: [] }) }));
const mockUseCreateAutomation = useCreateAutomation as jest.Mock;

const onClose = jest.fn();
const onCreated = jest.fn();

const renderFlyout = (props: Partial<React.ComponentProps<typeof CreateAutomationFlyout>> = {}) =>
  render(
    <I18nProvider>
      <CreateAutomationFlyout onClose={onClose} onCreated={onCreated} {...props} />
    </I18nProvider>
  );

const addTrigger = async (label: string) => {
  fireEvent.click(screen.getByTestId('automationAddTrigger'));
  fireEvent.click(await screen.findByText(label));
};

const rename = (name: string) => {
  fireEvent.change(screen.getByTestId('automationName'), { target: { value: name } });
};

describe('CreateAutomationFlyout', () => {
  const mutate = jest.fn();

  beforeEach(() => {
    mutate.mockClear();
    onClose.mockClear();
    mockUseCreateAutomation.mockReturnValue({ mutate, isLoading: false });
  });

  it('asks for a name instead of saving an untitled automation', async () => {
    renderFlyout();
    await addTrigger('Alert triggered');

    fireEvent.click(screen.getByTestId('submitAutomation'));

    expect(mutate).not.toHaveBeenCalled();
    expect(screen.getByTestId('automationName')).toBeInvalid();
  });

  it('confirms before discarding unsaved changes', () => {
    renderFlyout();
    rename('Alert triage');

    fireEvent.click(screen.getByTestId('euiFlyoutCloseButton'));

    expect(onClose).not.toHaveBeenCalled();
    expect(
      screen.getByText(
        'Alert triage has not been saved. If you leave now, this draft will be discarded.'
      )
    ).toBeInTheDocument();
    fireEvent.click(screen.getByText('Keep editing'));
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId('euiFlyoutCloseButton'));
    fireEvent.click(screen.getByText('Discard'));
    expect(onClose).toHaveBeenCalled();
  });

  it('enables the automation with Save and enable', async () => {
    renderFlyout();
    rename('Alert triage');
    await addTrigger('Alert triggered');

    fireEvent.click(screen.getByTestId('submitAndEnableAutomation'));

    expect(mutate).toHaveBeenCalledWith(
      expect.objectContaining({ isEnabled: true }),
      expect.anything()
    );
  });
});
