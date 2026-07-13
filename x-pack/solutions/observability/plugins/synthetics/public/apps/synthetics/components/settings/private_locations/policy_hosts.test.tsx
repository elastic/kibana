/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { EuiSuperSelectOption } from '@elastic/eui';
import { fireEvent, waitFor } from '@testing-library/react';
import { render } from '../../../utils/testing/rtl_helpers';
import { SuperSelect } from './policy_hosts';

// All options disabled reproduces the reported bug: focus never enters the listbox,
// so EuiSuperSelect leaves the dropdown open when the user tabs away.
const options: Array<EuiSuperSelectOption<string>> = [
  { value: 'policy-1', inputDisplay: 'Policy 1', dropdownDisplay: 'Policy 1', disabled: true },
  { value: 'policy-2', inputDisplay: 'Policy 2', dropdownDisplay: 'Policy 2', disabled: true },
];

describe('<SuperSelect /> (agent policy dropdown)', () => {
  const renderSuperSelect = () =>
    render(
      <>
        <SuperSelect
          aria-label="Select agent policy"
          options={options}
          valueOfSelected={undefined}
          onChange={jest.fn()}
        />
        <button type="button" data-test-subj="outsideElement">
          Next element
        </button>
      </>
    );

  it('closes the dropdown when focus leaves the component', async () => {
    const { getByTestId, queryByRole, getByRole } = renderSuperSelect();

    fireEvent.click(getByTestId('syntheticsAgentPolicySelect'));
    expect(getByRole('listbox')).toBeInTheDocument();

    fireEvent.blur(getByTestId('syntheticsAgentPolicySelect'), {
      relatedTarget: getByTestId('outsideElement'),
    });

    await waitFor(() => expect(queryByRole('listbox')).not.toBeInTheDocument());
  });

  it('keeps the dropdown open when focus stays within the listbox', () => {
    const { getByTestId, getByRole } = renderSuperSelect();

    fireEvent.click(getByTestId('syntheticsAgentPolicySelect'));
    const listbox = getByRole('listbox');
    expect(listbox).toBeInTheDocument();

    fireEvent.blur(getByTestId('syntheticsAgentPolicySelect'), {
      relatedTarget: listbox,
    });

    expect(getByRole('listbox')).toBeInTheDocument();
  });
});
