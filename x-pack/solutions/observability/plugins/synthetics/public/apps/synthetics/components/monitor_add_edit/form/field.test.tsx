/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, fireEvent } from '@testing-library/react';
import { FormProvider } from 'react-hook-form';
import { render } from '../../../utils/testing/rtl_helpers';
import { useFormWrapped } from '../../../../../hooks/use_form_wrapped';
import { useMonitorName } from '../../../hooks/use_monitor_name';
import type { FormConfig } from '../types';
import { ConfigKey } from '../types';
import { FIELD } from './field_config';
import { Field } from './field';

jest.mock('../../../hooks/use_monitor_name', () => ({
  useMonitorName: jest.fn().mockReturnValue({ nameAlreadyExists: false }),
}));

jest.mock('../../../../../hooks/use_kibana_space', () => ({
  useKibanaSpace: jest.fn().mockReturnValue({ space: { id: 'default' } }),
}));

const MonitorNameField = () => {
  const methods = useFormWrapped<FormConfig>({
    mode: 'onSubmit',
    reValidateMode: 'onSubmit',
    defaultValues: { [ConfigKey.NAME]: '' },
    shouldFocusError: false,
  });

  return (
    <FormProvider {...methods}>
      <Field {...FIELD()[ConfigKey.NAME]} />
    </FormProvider>
  );
};

describe('Field', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it.each([true, false])(
    'shows duplicate error when "nameAlreadyExists" is %s',
    async (nameAlreadyExists) => {
      (useMonitorName as jest.Mock).mockReturnValue({ nameAlreadyExists });

      const { getByTestId, getByText, queryByText } = render(<MonitorNameField />);

      const inputField = getByTestId('syntheticsMonitorConfigName');
      fireEvent.focus(inputField);
      fireEvent.change(inputField, { target: { value: 'any value' } });
      fireEvent.blur(inputField);

      await act(async () => {
        jest.advanceTimersByTime(1000);
      });

      if (nameAlreadyExists) {
        expect(getByText('Monitor name already exists')).toBeInTheDocument();
      } else {
        expect(queryByText('Monitor name already exists')).not.toBeInTheDocument();
      }
    }
  );
});
