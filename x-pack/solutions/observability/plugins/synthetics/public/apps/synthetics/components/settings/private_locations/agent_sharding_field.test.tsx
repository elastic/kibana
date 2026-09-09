/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@kbn/i18n-react';
import { AgentShardingField } from './agent_sharding_field';
import { useLicense } from '../../../hooks/use_license';
import type { PrivateLocation } from '../../../../../../common/runtime_types';

jest.mock('../../../hooks/use_license');

const useLicenseMock = useLicense as jest.MockedFunction<typeof useLicense>;

const Form = ({
  isEditingShardedLocation,
  defaultChecked = false,
}: {
  isEditingShardedLocation: boolean;
  defaultChecked?: boolean;
}) => {
  const form = useForm<PrivateLocation>({
    defaultValues: { isAgentSharding: defaultChecked } as PrivateLocation,
  });
  return (
    <I18nProvider>
      <FormProvider {...form}>
        <AgentShardingField isEditingShardedLocation={isEditingShardedLocation} />
      </FormProvider>
    </I18nProvider>
  );
};

describe('AgentShardingField', () => {
  it('hides the switch without an Enterprise license on a classic location', () => {
    useLicenseMock.mockReturnValue({ hasAtLeast: () => false, getLicense: () => null });
    render(<Form isEditingShardedLocation={false} />);
    expect(screen.queryByTestId('syntheticsAgentShardingSwitch')).not.toBeInTheDocument();
  });

  it('shows the switch with an Enterprise license', () => {
    useLicenseMock.mockReturnValue({ hasAtLeast: () => true, getLicense: () => null });
    render(<Form isEditingShardedLocation={false} />);
    expect(screen.getByTestId('syntheticsAgentShardingSwitch')).toBeInTheDocument();
  });

  it('shows the switch on an already-sharded location without Enterprise so it can be turned off', () => {
    useLicenseMock.mockReturnValue({ hasAtLeast: () => false, getLicense: () => null });
    render(<Form isEditingShardedLocation={true} defaultChecked={true} />);
    const toggle = screen.getByTestId('syntheticsAgentShardingSwitch');
    expect(toggle).toBeInTheDocument();
    expect(toggle).not.toBeDisabled();
  });

  it('renders the toggle and hides the explainer until sharding is enabled', () => {
    useLicenseMock.mockReturnValue({ hasAtLeast: () => true, getLicense: () => null });
    render(<Form isEditingShardedLocation={false} />);

    expect(screen.getByTestId('syntheticsAgentShardingSwitch')).toBeInTheDocument();
    expect(screen.getByText('Scale with multiple agents on this policy')).toBeInTheDocument();
    expect(screen.queryByTestId('syntheticsAgentShardingCallout')).not.toBeInTheDocument();
  });

  it('shows the condition-based sharding explainer when the toggle is on', async () => {
    useLicenseMock.mockReturnValue({ hasAtLeast: () => true, getLicense: () => null });
    render(<Form isEditingShardedLocation={false} />);

    await userEvent.click(screen.getByTestId('syntheticsAgentShardingSwitch'));

    expect(screen.getByTestId('syntheticsAgentShardingCallout')).toBeInTheDocument();
    expect(screen.getByTestId('syntheticsAgentShardingCallout')).toHaveTextContent(
      'each monitor runs on exactly one agent'
    );
  });

  it('starts with the explainer visible when editing a scalable location', () => {
    useLicenseMock.mockReturnValue({ hasAtLeast: () => true, getLicense: () => null });
    render(<Form isEditingShardedLocation={true} defaultChecked={true} />);

    expect(screen.getByTestId('syntheticsAgentShardingCallout')).toBeInTheDocument();
  });

  it('toggles off without a confirm modal when creating a location', async () => {
    useLicenseMock.mockReturnValue({ hasAtLeast: () => true, getLicense: () => null });
    render(<Form isEditingShardedLocation={false} />);

    await userEvent.click(screen.getByTestId('syntheticsAgentShardingSwitch'));
    expect(screen.getByTestId('syntheticsAgentShardingCallout')).toBeInTheDocument();

    await userEvent.click(screen.getByTestId('syntheticsAgentShardingSwitch'));

    expect(
      screen.queryByTestId('syntheticsDisableAgentShardingConfirmModal')
    ).not.toBeInTheDocument();
    expect(screen.queryByTestId('syntheticsAgentShardingCallout')).not.toBeInTheDocument();
  });

  it('asks for confirmation before turning sharding off on an existing scalable location', async () => {
    useLicenseMock.mockReturnValue({ hasAtLeast: () => true, getLicense: () => null });
    render(<Form isEditingShardedLocation={true} defaultChecked={true} />);

    await userEvent.click(screen.getByTestId('syntheticsAgentShardingSwitch'));

    expect(screen.getByTestId('syntheticsDisableAgentShardingConfirmModal')).toBeInTheDocument();
    expect(screen.getByText('Turn off scalable location?')).toBeInTheDocument();
    expect(screen.getByText(/rewrite every monitor on this location/i)).toBeInTheDocument();
    expect(screen.getByTestId('syntheticsAgentShardingCallout')).toBeInTheDocument();
    expect(screen.getByTestId('syntheticsAgentShardingSwitch')).toBeChecked();
  });

  it('keeps sharding on when the disable confirmation is cancelled', async () => {
    useLicenseMock.mockReturnValue({ hasAtLeast: () => true, getLicense: () => null });
    render(<Form isEditingShardedLocation={true} defaultChecked={true} />);

    await userEvent.click(screen.getByTestId('syntheticsAgentShardingSwitch'));
    await userEvent.click(screen.getByTestId('confirmModalCancelButton'));

    expect(
      screen.queryByTestId('syntheticsDisableAgentShardingConfirmModal')
    ).not.toBeInTheDocument();
    expect(screen.getByTestId('syntheticsAgentShardingCallout')).toBeInTheDocument();
    expect(screen.getByTestId('syntheticsAgentShardingSwitch')).toBeChecked();
  });

  it('turns sharding off after the disable confirmation is accepted', async () => {
    useLicenseMock.mockReturnValue({ hasAtLeast: () => true, getLicense: () => null });
    render(<Form isEditingShardedLocation={true} defaultChecked={true} />);

    await userEvent.click(screen.getByTestId('syntheticsAgentShardingSwitch'));
    await userEvent.click(screen.getByTestId('confirmModalConfirmButton'));

    expect(
      screen.queryByTestId('syntheticsDisableAgentShardingConfirmModal')
    ).not.toBeInTheDocument();
    expect(screen.queryByTestId('syntheticsAgentShardingCallout')).not.toBeInTheDocument();
    const toggle = screen.getByTestId('syntheticsAgentShardingSwitch');
    expect(toggle).not.toBeChecked();
    expect(toggle).not.toBeDisabled();
  });

  it('lets you turn sharding back on after confirming disable, even without Enterprise', async () => {
    useLicenseMock.mockReturnValue({ hasAtLeast: () => false, getLicense: () => null });
    render(<Form isEditingShardedLocation={true} defaultChecked={true} />);

    await userEvent.click(screen.getByTestId('syntheticsAgentShardingSwitch'));
    await userEvent.click(screen.getByTestId('confirmModalConfirmButton'));

    const toggle = screen.getByTestId('syntheticsAgentShardingSwitch');
    expect(toggle).not.toBeChecked();
    expect(toggle).not.toBeDisabled();

    await userEvent.click(toggle);

    expect(toggle).toBeChecked();
    expect(screen.getByTestId('syntheticsAgentShardingCallout')).toBeInTheDocument();
  });
});
