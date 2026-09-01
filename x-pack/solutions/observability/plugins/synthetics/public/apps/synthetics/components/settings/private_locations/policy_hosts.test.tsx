/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { render } from '../../../utils/testing/rtl_helpers';
import type { PrivateLocation } from '../../../../../../common/runtime_types';
import { PolicyHostsField } from './policy_hosts';

jest.mock('../../../contexts', () => {
  const actual = jest.requireActual('../../../contexts');
  return {
    ...actual,
    useSyntheticsSettingsContext: () => ({ basePath: '' }),
  };
});

jest.mock('../../../hooks/use_license', () => ({
  useLicense: () => ({ hasAtLeast: () => true, getLicense: () => null }),
}));

const policy = {
  id: 'policy-1',
  name: 'Synthetics policy',
  agents: 2,
  status: 'active',
};

const Wrapper = ({ agentPolicyId = '' }: { agentPolicyId?: string }) => {
  const form = useForm<PrivateLocation>({
    defaultValues: {
      label: 'Local',
      id: 'loc-1',
      agentPolicyId,
      isAgentSharding: false,
    },
  });

  return (
    <FormProvider {...form}>
      <PolicyHostsField privateLocations={[]} />
    </FormProvider>
  );
};

describe('PolicyHostsField', () => {
  const renderField = (agentPolicyId?: string) =>
    render(<Wrapper agentPolicyId={agentPolicyId} />, {
      state: {
        agentPolicies: {
          loading: false,
          error: null,
          data: [policy],
        },
      },
    });

  it('does not show the sharding toggle until an agent policy is selected', () => {
    const { queryByTestId } = renderField();

    expect(queryByTestId('syntheticsAgentShardingSwitch')).not.toBeInTheDocument();
  });

  it('shows the sharding toggle after an agent policy is selected', () => {
    const { getByTestId } = renderField('policy-1');

    expect(getByTestId('syntheticsAgentShardingSwitch')).toBeInTheDocument();
  });
});
