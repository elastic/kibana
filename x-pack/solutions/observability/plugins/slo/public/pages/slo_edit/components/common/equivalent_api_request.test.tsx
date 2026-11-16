/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { FormProvider, useForm } from 'react-hook-form';
import { render } from '../../../../utils/test_helper';
import { SLO_EDIT_FORM_DEFAULT_VALUES } from '../../constants';
import type { CreateSLOForm } from '../../types';
import { EquivalentApiRequest } from './equivalent_api_request';

function Wrapper() {
  const methods = useForm<CreateSLOForm>({
    defaultValues: { ...SLO_EDIT_FORM_DEFAULT_VALUES, name: 'My SLO' },
    mode: 'all',
  });

  return (
    <FormProvider {...methods}>
      <input data-test-subj="nameInput" {...methods.register('name', { required: true })} />
      <EquivalentApiRequest isEditMode={false} disabled={false} />
    </FormProvider>
  );
}

const findRequestBody = () =>
  screen.findByText(
    (_, element) =>
      element?.tagName === 'CODE' && (element.textContent ?? '').includes('"name": "My SLO"')
  );

const openFlyout = () => fireEvent.click(screen.getByTestId('sloFormCopyJsonButton'));

const setName = (value: string) =>
  fireEvent.change(screen.getByTestId('nameInput'), { target: { value } });

describe('<EquivalentApiRequest />', () => {
  it('shows that the form is not valid when validation fails', async () => {
    render(<Wrapper />);

    setName('');
    openFlyout();

    expect(await screen.findByText('Form is not valid')).toBeInTheDocument();
  });

  it('shows the request body when the form is valid', async () => {
    render(<Wrapper />);

    openFlyout();

    expect(await findRequestBody()).toBeInTheDocument();
    expect(screen.getByText('POST /api/observability/slos')).toBeInTheDocument();
  });

  it('does not show a previous request body once the form becomes invalid', async () => {
    render(<Wrapper />);

    openFlyout();
    expect(await findRequestBody()).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('o11yEquivalentApiRequestCloseButton'));
    await waitFor(() =>
      expect(screen.queryByTestId('o11yEquivalentApiRequestCloseButton')).not.toBeInTheDocument()
    );

    setName('');
    openFlyout();

    expect(await screen.findByText('Form is not valid')).toBeInTheDocument();
    expect(screen.queryByText('"name": "My SLO"', { exact: false })).not.toBeInTheDocument();
  });
});
