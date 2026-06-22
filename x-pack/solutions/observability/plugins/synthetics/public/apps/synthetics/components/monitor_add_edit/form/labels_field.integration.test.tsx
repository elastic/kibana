/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react';
import { FormProvider, useForm } from 'react-hook-form';
import { render } from '../../../utils/testing/rtl_helpers';
import { Field } from './field';
import { FIELD } from './field_config';
import { ConfigKey, FormMonitorType } from '../types';

const LabelsHarness = ({ initialLabels }: { initialLabels: Record<string, string> }) => {
  const methods = useForm({
    mode: 'onChange',
    defaultValues: {
      [ConfigKey.FORM_MONITOR_TYPE]: FormMonitorType.MULTISTEP,
      [ConfigKey.LABELS]: initialLabels,
    } as any,
  });

  const labels = methods.watch(ConfigKey.LABELS as any);

  return (
    <FormProvider {...methods}>
      <Field {...(FIELD(false)[ConfigKey.LABELS] as any)} />
      <div data-test-subj="labels-json">{JSON.stringify(labels)}</div>
    </FormProvider>
  );
};

describe('Labels field (multistep) integration', () => {
  it('deletes a label and removes it from form state', async () => {
    const { getByTestId, getAllByTestId } = render(
      <LabelsHarness initialLabels={{ env: 'prod' }} />
    );

    expect((getByTestId('keyValuePairsKey0') as HTMLInputElement).value).toEqual('env');
    expect((getByTestId('keyValuePairsValue0') as HTMLInputElement).value).toEqual('prod');
    expect(getByTestId('labels-json').textContent).toEqual(JSON.stringify({ env: 'prod' }));

    const deleteBtn = getAllByTestId('syntheticsKeyValuePairsFieldButton')[0];
    fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(getByTestId('labels-json').textContent).toEqual(JSON.stringify({}));
    });
  });

  it('deletes one of two labels and keeps the other in form state', async () => {
    const { getByTestId, getAllByTestId } = render(
      <LabelsHarness initialLabels={{ env: 'prod', team: 'obs' }} />
    );

    expect(getByTestId('labels-json').textContent).toEqual(
      JSON.stringify({ env: 'prod', team: 'obs' })
    );

    const deleteBtns = getAllByTestId('syntheticsKeyValuePairsFieldButton');
    expect(deleteBtns.length).toEqual(2);
    fireEvent.click(deleteBtns[0]);

    await waitFor(() => {
      expect(getByTestId('labels-json').textContent).toEqual(JSON.stringify({ team: 'obs' }));
    });
  });
});
