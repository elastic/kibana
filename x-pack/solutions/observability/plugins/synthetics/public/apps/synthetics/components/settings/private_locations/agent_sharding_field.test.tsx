/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { render, screen } from '@testing-library/react';
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
    <FormProvider {...form}>
      <AgentShardingField isEditingShardedLocation={isEditingShardedLocation} />
    </FormProvider>
  );
};

describe('AgentShardingField', () => {
  it('hides the switch without an Enterprise license on a classic location', () => {
    useLicenseMock.mockReturnValue({ hasAtLeast: () => false, getLicense: () => null });
    render(<Form isEditingShardedLocation={false} />);
    expect(screen.queryByTestId('syntheticsLocationAgentShardingSwitch')).not.toBeInTheDocument();
  });

  it('shows the switch with an Enterprise license', () => {
    useLicenseMock.mockReturnValue({ hasAtLeast: () => true, getLicense: () => null });
    render(<Form isEditingShardedLocation={false} />);
    expect(screen.getByTestId('syntheticsLocationAgentShardingSwitch')).toBeInTheDocument();
  });

  it('shows the switch on an already-sharded location without Enterprise so it can be turned off', () => {
    useLicenseMock.mockReturnValue({ hasAtLeast: () => false, getLicense: () => null });
    render(<Form isEditingShardedLocation={true} defaultChecked={true} />);
    const toggle = screen.getByTestId('syntheticsLocationAgentShardingSwitch');
    expect(toggle).toBeInTheDocument();
    expect(toggle).not.toBeDisabled();
  });
});
