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
import {
  ParameterValuesEditor,
  canUseParameterPairs,
  pairsToParamsJson,
  paramsJsonToPairs,
} from './parameter_values';
import { ConfigKey } from '../../../../../../common/runtime_types';

jest.mock('./code_editor', () => ({
  JSONEditor: ({
    ariaLabel,
    onChange,
    readOnly,
    value,
  }: {
    ariaLabel: string;
    onChange: (value: string) => void;
    readOnly?: boolean;
    value: string;
  }) => (
    <textarea
      aria-label={ariaLabel}
      data-test-subj="syntheticsParamsJSONEditor"
      onChange={(event) => onChange(event.target.value)}
      readOnly={readOnly}
      value={value}
    />
  ),
}));

describe('params JSON helpers', () => {
  it('converts a flat object to pairs and back', () => {
    const pairs = paramsJsonToPairs('{"username":"elastic","password":"changeme"}');

    expect(pairs).toEqual([
      ['username', 'elastic'],
      ['password', 'changeme'],
    ]);
    expect(pairsToParamsJson(pairs)).toBe('{"username":"elastic","password":"changeme"}');
  });

  it('drops keyless pairs and returns an empty string when nothing is left', () => {
    expect(pairsToParamsJson([['', 'orphan']])).toBe('');
    expect(
      pairsToParamsJson([
        ['', 'orphan'],
        ['token', 'abc'],
      ])
    ).toBe('{"token":"abc"}');
  });

  it.each(['', '{}', '{"token":"abc"}'])('uses pairs for flat string params: %s', (params) => {
    expect(canUseParameterPairs(params)).toBe(true);
  });

  it.each([
    '{"retries":3}',
    '{"options":{"mode":"x"}}',
    '["first"]',
    '{"certificate":"first line\\nsecond line"}',
    '{invalid',
  ])('falls back to JSON for other params: %s', (params) => {
    expect(canUseParameterPairs(params)).toBe(false);
  });
});

describe('ParameterValuesEditor', () => {
  it('renders hidden values with show and edit controls', () => {
    const { getByTestId } = render(<ParameterValuesEditorForm />);

    expect(getByTestId('keyValuePairsKey0')).toHaveValue('password');
    expect(getByTestId('keyValuePairsKey0')).toHaveAccessibleName('Parameter password');
    expect(getByTestId('keyValuePairsValue0')).toHaveValue('changeme');
    expect(getByTestId('keyValuePairsValue0')).toHaveAccessibleName('Value for parameter password');
    expect(getByTestId('keyValuePairsValue0')).toHaveAttribute('type', 'password');
    expect(getByTestId('keyValuePairsValue0')).toHaveAttribute('readonly');
  });

  it('toggles value visibility', () => {
    const { getByTestId } = render(<ParameterValuesEditorForm />);

    fireEvent.click(getByTestId('syntheticsParamValueVisibility0'));
    expect(getByTestId('keyValuePairsValue0')).toHaveAttribute('type', 'text');

    fireEvent.click(getByTestId('syntheticsParamValueVisibility0'));
    expect(getByTestId('keyValuePairsValue0')).toHaveAttribute('type', 'password');
  });

  it('edits a value after clicking edit', () => {
    const { getByTestId } = render(<ParameterValuesEditorForm />);

    fireEvent.click(getByTestId('syntheticsParamValueEdit0'));

    expect(getByTestId('keyValuePairsValue0')).not.toHaveAttribute('readonly');
    expect(getByTestId('keyValuePairsValue0')).toHaveAttribute('type', 'text');

    fireEvent.change(getByTestId('keyValuePairsValue0'), { target: { value: 'replacement' } });
    expect(getByTestId('parameterValuesValue')).toHaveTextContent('{"password":"replacement"}');

    fireEvent.blur(getByTestId('keyValuePairsValue0'));
    expect(getByTestId('keyValuePairsValue0')).toHaveAttribute('readonly');
    expect(getByTestId('keyValuePairsValue0')).toHaveAttribute('type', 'password');
  });

  it('renames a parameter and keeps its value', () => {
    const { getByTestId } = render(<ParameterValuesEditorForm />);

    fireEvent.change(getByTestId('keyValuePairsKey0'), { target: { value: 'token' } });

    expect(getByTestId('parameterValuesValue')).toHaveTextContent('{"token":"changeme"}');
  });

  it('keeps a new blank row until it has a key', () => {
    const { getByTestId } = render(<ParameterValuesEditorForm defaultParams="" />);

    fireEvent.click(getByTestId('syntheticsMonitorConfigParams__button'));
    expect(getByTestId('keyValuePairsKey0')).toHaveValue('');
    expect(getByTestId('parameterValuesValue')).toHaveTextContent('');

    fireEvent.change(getByTestId('keyValuePairsKey0'), { target: { value: 'token' } });
    expect(getByTestId('parameterValuesValue')).toHaveTextContent('{"token":""}');
  });

  it('hides the next value after deleting a visible row', () => {
    const { getAllByTestId, getByTestId } = render(
      <ParameterValuesEditorForm defaultParams={'{"first":"one","second":"two"}'} />
    );

    fireEvent.click(getByTestId('syntheticsParamValueVisibility0'));
    fireEvent.click(getAllByTestId('syntheticsKeyValuePairsFieldButton')[0]);

    expect(getByTestId('keyValuePairsValue0')).toHaveValue('two');
    expect(getByTestId('keyValuePairsValue0')).toHaveAttribute('type', 'password');
    expect(getByTestId('parameterValuesValue')).toHaveTextContent('{"second":"two"}');
  });

  it('disables editing controls when read only', () => {
    const { getByTestId } = render(<ParameterValuesEditorForm readOnly />);

    expect(getByTestId('syntheticsMonitorConfigParams__button')).toBeDisabled();
    expect(getByTestId('syntheticsParamValueEdit0')).toBeDisabled();
    expect(getByTestId('syntheticsKeyValuePairsFieldButton')).toBeDisabled();
    expect(getByTestId('keyValuePairsKey0')).toHaveAttribute('readonly');
  });

  it('uses the JSON editor for params that are not flat strings', () => {
    const params = '{"retries":3,"options":{"mode":"x"}}';
    const { getByTestId, queryByTestId } = render(
      <ParameterValuesEditorForm defaultParams={params} />
    );

    expect(queryByTestId('keyValuePairsKey0')).not.toBeInTheDocument();
    expect(getByTestId('syntheticsParamsJSONEditor')).toHaveValue(params);

    const updated = '{"retries":4,"options":{"mode":"y"}}';
    fireEvent.change(getByTestId('syntheticsParamsJSONEditor'), { target: { value: updated } });
    expect(getByTestId('parameterValuesValue')).toHaveTextContent(updated);
  });
});

const ParameterValuesEditorForm = ({
  defaultParams = '{"password":"changeme"}',
  readOnly,
}: {
  defaultParams?: string;
  readOnly?: boolean;
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
        readOnly={readOnly}
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
