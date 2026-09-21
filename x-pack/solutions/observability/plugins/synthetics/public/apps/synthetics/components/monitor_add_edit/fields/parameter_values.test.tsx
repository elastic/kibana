/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react';
import { FormProvider, useForm, useFormContext } from 'react-hook-form';
import { render } from '../../../utils/testing/rtl_helpers';
import { ParameterValuesEditor } from './parameter_values';
import { ParameterValuesProvider } from '../form/parameter_values_context';
import { ConfigKey } from '../../../../../../common/runtime_types';
import { fetchSyntheticsMonitor } from '../../../state/monitor_details/api';

const mockUseKibana = jest.fn();

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  ...jest.requireActual('@kbn/kibana-react-plugin/public'),
  useKibana: () => mockUseKibana(),
}));

jest.mock('../../../state/monitor_details/api', () => ({
  fetchSyntheticsMonitor: jest.fn(),
}));

jest.mock('../../../hooks', () => ({
  useGetUrlParams: () => ({}),
}));

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => ({ monitorId: 'monitor-id' }),
}));

describe('ParameterValuesEditor', () => {
  beforeEach(() => {
    (fetchSyntheticsMonitor as jest.Mock).mockReset();
    mockUseKibana.mockReturnValue({
      services: {
        application: {
          capabilities: {
            uptime: {
              save: true,
              canReadParamValues: true,
            },
          },
        },
      },
    });
  });

  it('renders password inputs with a visibility toggle', () => {
    const { getByTestId } = render(<ParameterValuesEditorForm />);

    expect(getByTestId('keyValuePairsKey0')).toHaveValue('password');
    expect(getByTestId('keyValuePairsValue0')).toHaveAttribute('type', 'password');
    expect(getByTestId('keyValuePairsValue0')).toHaveValue('********');
    expect(getByTestId('syntheticsParamValueVisibility0')).toBeInTheDocument();
  });

  it('lets the user replace a hidden value', () => {
    const { getByTestId } = render(<ParameterValuesEditorForm />);

    fireEvent.change(getByTestId('keyValuePairsValue0'), {
      target: { value: 'replacement' },
    });

    expect(getByTestId('parameterValuesValue')).toHaveTextContent('{"password":"replacement"}');
    expect(getByTestId('keyValuePairsValue0')).toHaveAttribute('type', 'password');
  });

  it('disables the visibility toggle without canReadParamValues', () => {
    mockUseKibana.mockReturnValue({
      services: {
        application: {
          capabilities: {
            uptime: {
              save: true,
              canReadParamValues: false,
            },
          },
        },
      },
    });

    const { getByTestId } = render(<ParameterValuesEditorForm />);
    const toggle = getByTestId('syntheticsParamValueVisibility0');

    expect(toggle).toBeDisabled();
    expect(toggle).toHaveAttribute(
      'aria-label',
      'You do not have permission to read parameter values.'
    );
    fireEvent.click(toggle);
    expect(fetchSyntheticsMonitor).not.toHaveBeenCalled();
    expect(getByTestId('keyValuePairsValue0')).toHaveAttribute('type', 'password');
    expect(getByTestId('keyValuePairsValue0')).not.toHaveAttribute('readonly');
  });

  it('fetches stored values when the password visibility toggle is shown', async () => {
    (fetchSyntheticsMonitor as jest.Mock).mockResolvedValue({
      [ConfigKey.PARAMS]: '{"password":"changeme"}',
    });

    const { getByTestId } = render(<ParameterValuesEditorForm />);

    fireEvent.click(getByTestId('syntheticsParamValueVisibility0'));

    await waitFor(() => {
      expect(fetchSyntheticsMonitor).toHaveBeenCalledWith({
        monitorId: 'monitor-id',
        spaceId: undefined,
        hideParams: false,
      });
    });

    await waitFor(() => {
      expect(getByTestId('keyValuePairsValue0')).toHaveValue('changeme');
    });
  });

  it('keeps in-progress replacements when revealing stored values', async () => {
    (fetchSyntheticsMonitor as jest.Mock).mockResolvedValue({
      [ConfigKey.PARAMS]: '{"password":"changeme","token":"stored"}',
    });

    const { getByTestId } = render(
      <ParameterValuesEditorForm defaultParams={'{"password":"********","token":"********"}'} />
    );

    fireEvent.change(getByTestId('keyValuePairsValue0'), {
      target: { value: 'replacement' },
    });
    fireEvent.click(getByTestId('syntheticsParamValueVisibility0'));

    await waitFor(() => {
      expect(JSON.parse(getByTestId('parameterValuesValue').textContent ?? '')).toEqual({
        password: 'replacement',
        token: 'stored',
      });
    });
  });

  it('does not refetch after values have been revealed', async () => {
    (fetchSyntheticsMonitor as jest.Mock).mockResolvedValue({
      [ConfigKey.PARAMS]: '{"password":"changeme"}',
    });

    const { getByTestId } = render(<ParameterValuesEditorForm />);

    fireEvent.click(getByTestId('syntheticsParamValueVisibility0'));
    await waitFor(() => {
      expect(getByTestId('keyValuePairsValue0')).toHaveValue('changeme');
    });

    fireEvent.click(getByTestId('syntheticsParamValueVisibility0'));

    expect(fetchSyntheticsMonitor).toHaveBeenCalledTimes(1);
  });
});

const ParameterValuesEditorForm = ({
  defaultParams = '{"password":"********"}',
}: {
  defaultParams?: string;
}) => {
  const methods = useForm({
    defaultValues: {
      [ConfigKey.PARAMS]: defaultParams,
    },
  });
  const params = methods.watch(ConfigKey.PARAMS);

  return (
    <ParameterValuesProvider hideParameterValuesByDefault>
      <FormProvider {...methods}>
        <ParameterValuesEditor
          onChange={(next) => methods.setValue(ConfigKey.PARAMS, next)}
          value={params}
        />
        <ParameterValuesValue />
      </FormProvider>
    </ParameterValuesProvider>
  );
};

const ParameterValuesValue = () => {
  const { watch } = useFormContext();
  return <output data-test-subj="parameterValuesValue">{watch(ConfigKey.PARAMS)}</output>;
};
