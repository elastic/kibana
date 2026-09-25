/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent } from '@testing-library/react';
import { FormProvider, useForm, useFormContext } from 'react-hook-form';
import { render } from '../../../utils/testing/rtl_helpers';
import { ParameterValuesEditor } from './parameter_values';
import { ConfigKey } from '../../../../../../common/runtime_types';

const mockUseKibana = jest.fn();

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  ...jest.requireActual('@kbn/kibana-react-plugin/public'),
  useKibana: () => mockUseKibana(),
}));

jest.mock('./code_editor', () => ({
  JSONEditor: ({
    ariaLabel,
    onChange,
    value,
  }: {
    ariaLabel: string;
    onChange: (value: string) => void;
    value: string;
  }) => (
    <textarea
      aria-label={ariaLabel}
      data-test-subj="syntheticsParamsJSONEditor"
      onChange={(event) => onChange(event.target.value)}
      value={value}
    />
  ),
}));

describe('ParameterValuesEditor', () => {
  beforeEach(() => {
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
    expect(getByTestId('keyValuePairsKey0')).toHaveAccessibleName('Parameter password');
    expect(getByTestId('keyValuePairsValue0')).toHaveAttribute('type', 'password');
    expect(getByTestId('keyValuePairsValue0')).toHaveAccessibleName('Value for parameter password');
    expect(getByTestId('keyValuePairsValue0')).toHaveAttribute('readonly');
    expect(getByTestId('keyValuePairsValue0')).toHaveValue('********');
    expect(getByTestId('syntheticsParamValueVisibility0')).toBeInTheDocument();
    expect(getByTestId('syntheticsParamValueEdit0')).toBeInTheDocument();
  });

  it('lets the user replace a hidden value', () => {
    const { getByTestId } = render(<ParameterValuesEditorForm />);

    expect(getByTestId('keyValuePairsValue0')).toHaveAttribute('readonly');

    fireEvent.click(getByTestId('syntheticsParamValueEdit0'));
    fireEvent.change(getByTestId('keyValuePairsValue0'), {
      target: { value: 'replacement' },
    });

    expect(getByTestId('parameterValuesValue')).toHaveTextContent('{"password":"replacement"}');
    expect(getByTestId('keyValuePairsValue0')).not.toHaveAttribute('readonly');
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
    expect(getByTestId('keyValuePairsValue0')).toHaveAttribute('type', 'password');
    expect(getByTestId('keyValuePairsValue0')).toHaveAttribute('readonly');
  });

  it('clears a masked value when edit is clicked', () => {
    const { getByTestId } = render(<ParameterValuesEditorForm />);

    fireEvent.click(getByTestId('syntheticsParamValueEdit0'));

    expect(getByTestId('keyValuePairsValue0')).toHaveValue('');
    expect(getByTestId('keyValuePairsValue0')).not.toHaveAttribute('readonly');
    expect(getByTestId('keyValuePairsValue0')).toHaveAttribute('type', 'text');
    expect(getByTestId('parameterValuesValue')).toHaveTextContent('{"password":""}');

    fireEvent.blur(getByTestId('keyValuePairsValue0'));

    expect(getByTestId('keyValuePairsValue0')).toHaveValue('********');
    expect(getByTestId('keyValuePairsValue0')).toHaveAttribute('readonly');
    expect(getByTestId('parameterValuesValue')).toHaveTextContent('{"password":"********"}');
  });

  it('clears a masked value when its parameter is renamed', () => {
    const { getByTestId } = render(<ParameterValuesEditorForm />);

    fireEvent.change(getByTestId('keyValuePairsKey0'), { target: { value: 'token' } });

    expect(getByTestId('keyValuePairsValue0')).toHaveValue('');
    expect(getByTestId('parameterValuesValue')).toHaveTextContent('{"token":""}');
  });

  it('shows the loaded value without requesting it again', () => {
    const { getByTestId } = render(
      <ParameterValuesEditorForm defaultParams={'{"password":"changeme"}'} />
    );

    fireEvent.click(getByTestId('syntheticsParamValueVisibility0'));

    expect(getByTestId('keyValuePairsValue0')).toHaveValue('changeme');
    expect(getByTestId('keyValuePairsValue0')).toHaveAttribute('type', 'text');

    fireEvent.click(getByTestId('syntheticsParamValueVisibility0'));

    expect(getByTestId('keyValuePairsValue0')).toHaveValue('changeme');
    expect(getByTestId('keyValuePairsValue0')).toHaveAttribute('type', 'password');
  });

  it('allows clearing a revealed value', () => {
    const { getByTestId } = render(
      <ParameterValuesEditorForm defaultParams={'{"password":"changeme"}'} />
    );

    fireEvent.click(getByTestId('syntheticsParamValueEdit0'));

    expect(getByTestId('keyValuePairsValue0')).toHaveValue('changeme');
    expect(getByTestId('keyValuePairsValue0')).not.toHaveAttribute('readonly');
    expect(getByTestId('keyValuePairsValue0')).toHaveAttribute('type', 'text');

    fireEvent.change(getByTestId('keyValuePairsValue0'), { target: { value: '' } });
    fireEvent.blur(getByTestId('keyValuePairsValue0'));

    expect(getByTestId('keyValuePairsValue0')).toHaveValue('');
    expect(getByTestId('parameterValuesValue')).toHaveTextContent('{"password":""}');
  });

  it('hides the next value after deleting a visible row', () => {
    const { getAllByTestId, getByTestId } = render(
      <ParameterValuesEditorForm defaultParams={'{"first":"one","second":"two"}'} />
    );

    fireEvent.click(getByTestId('syntheticsParamValueVisibility0'));
    expect(getByTestId('keyValuePairsValue0')).toHaveAttribute('type', 'text');

    fireEvent.click(getAllByTestId('syntheticsKeyValuePairsFieldButton')[0]);

    expect(getByTestId('keyValuePairsValue0')).toHaveValue('two');
    expect(getByTestId('keyValuePairsValue0')).toHaveAttribute('type', 'password');
  });

  it('uses the JSON editor for mixed and nested parameter values', () => {
    const params = '{"retries":3,"options":{"mode":"x"},"enabled":true,"empty":null}';
    const { getByTestId, queryByTestId } = render(
      <ParameterValuesEditorForm defaultParams={params} />
    );

    expect(queryByTestId('keyValuePairsKey0')).not.toBeInTheDocument();
    expect(getByTestId('syntheticsParamsJSONEditor')).toHaveValue(params);

    const updated = '{"retries":4,"options":{"mode":"y"},"enabled":false,"empty":null}';
    fireEvent.change(getByTestId('syntheticsParamsJSONEditor'), {
      target: { value: updated },
    });
    expect(getByTestId('parameterValuesValue')).toHaveTextContent(updated);
  });

  it('uses the JSON editor for top-level arrays', () => {
    const params = '["first",{"nested":true}]';
    const { getByTestId, queryByTestId } = render(
      <ParameterValuesEditorForm defaultParams={params} />
    );

    expect(queryByTestId('keyValuePairsKey0')).not.toBeInTheDocument();
    expect(getByTestId('syntheticsParamsJSONEditor')).toHaveValue(params);
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
    <FormProvider {...methods}>
      <ParameterValuesEditor
        onChange={(next) => methods.setValue(ConfigKey.PARAMS, next)}
        value={params}
      />
      <ParameterValuesValue />
    </FormProvider>
  );
};

const ParameterValuesValue = () => {
  const { watch } = useFormContext();
  return <output data-test-subj="parameterValuesValue">{watch(ConfigKey.PARAMS)}</output>;
};
