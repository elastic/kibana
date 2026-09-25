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
  hasInvalidParamNames,
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

  it('skips blank rows and returns an empty string when nothing is left', () => {
    expect(pairsToParamsJson([['', '']])).toBe('');
    expect(
      pairsToParamsJson([
        ['', ''],
        ['token', 'abc'],
      ])
    ).toBe('{"token":"abc"}');
  });

  it('keeps nameless, duplicate and __proto__ names so they are not lost', () => {
    expect(
      pairsToParamsJson([
        ['', 'orphan'],
        ['token', 'a'],
        ['token', 'b'],
        ['__proto__', 'c'],
      ])
    ).toBe('{"":"orphan","token":"a","token":"b","__proto__":"c"}');
    expect(paramsJsonToPairs('{"__proto__":"c"}')).toEqual([['__proto__', 'c']]);
  });

  it.each(['', '{}', '{"token":"abc"}', '{"":"orphan"}', '{"certificate":"first\\nsecond"}'])(
    'uses pairs for flat string params: %s',
    (params) => {
      expect(canUseParameterPairs(params)).toBe(true);
    }
  );

  it.each([
    '{"retries":3}',
    '{"options":{"mode":"x"}}',
    '["first"]',
    '{"token":"a","token":"b"}',
    '{invalid',
  ])('falls back to JSON for other params: %s', (params) => {
    expect(canUseParameterPairs(params)).toBe(false);
  });

  it.each(['{"":"orphan"}', '{"token":"a", "token" :"b"}', '{"a\\"b":"1","a\\"b":"2"}'])(
    'flags missing or duplicate names: %s',
    (params) => {
      expect(hasInvalidParamNames(params)).toBe(true);
    }
  );

  it.each(['', '{"token":"a","other":"token"}', '{"a":{"b":1},"c":{"b":2}}', '{invalid'])(
    'accepts params without name problems: %s',
    (params) => {
      expect(hasInvalidParamNames(params)).toBe(false);
    }
  );
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
    expect(getByTestId('keyValuePairsValue0')).toHaveValue('changeme');
    expect(getByTestId('keyValuePairsValue0')).not.toHaveAttribute('type', 'password');
    expect(getByTestId('keyValuePairsValue0')).toHaveAttribute('readonly');

    fireEvent.click(getByTestId('syntheticsParamValueVisibility0'));
    expect(getByTestId('keyValuePairsValue0')).toHaveAttribute('type', 'password');
  });

  it('edits a value after clicking edit', () => {
    const { getByTestId } = render(<ParameterValuesEditorForm />);

    fireEvent.click(getByTestId('syntheticsParamValueEdit0'));

    expect(getByTestId('keyValuePairsValue0')).not.toHaveAttribute('readonly');
    expect(getByTestId('keyValuePairsValue0')).not.toHaveAttribute('type', 'password');
    expect(getByTestId('keyValuePairsValue0')).toHaveFocus();

    fireEvent.change(getByTestId('keyValuePairsValue0'), { target: { value: 'replacement' } });
    expect(getByTestId('parameterValuesValue')).toHaveTextContent('{"password":"replacement"}');

    fireEvent.blur(getByTestId('keyValuePairsValue0'));
    expect(getByTestId('keyValuePairsValue0')).toHaveAttribute('readonly');
    expect(getByTestId('keyValuePairsValue0')).toHaveAttribute('type', 'password');
  });

  it('keeps focus in the value while a row button is pressed', () => {
    const { getAllByTestId, getByTestId } = render(
      <ParameterValuesEditorForm defaultParams={'{"certificate":"first\\nsecond","token":"abc"}'} />
    );
    fireEvent.click(getByTestId('syntheticsParamValueEdit0'));

    const buttons = [
      getByTestId('syntheticsParamValueVisibility1'),
      getByTestId('syntheticsParamValueEdit1'),
      ...getAllByTestId('syntheticsKeyValuePairsFieldButton'),
    ];

    buttons.forEach((button) => {
      // fireEvent returns false when the default action (moving focus away) is prevented
      expect(fireEvent.mouseDown(button)).toBe(false);
    });
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

  it('lets a new row take a value without clicking edit, then hides it', () => {
    const { getByTestId } = render(<ParameterValuesEditorForm defaultParams="" />);

    fireEvent.click(getByTestId('syntheticsMonitorConfigParams__button'));
    expect(getByTestId('keyValuePairsValue0')).not.toHaveAttribute('readonly');

    fireEvent.change(getByTestId('keyValuePairsKey0'), { target: { value: 'token' } });
    fireEvent.change(getByTestId('keyValuePairsValue0'), { target: { value: 'abc' } });
    expect(getByTestId('keyValuePairsValue0')).not.toHaveAttribute('readonly');
    expect(getByTestId('parameterValuesValue')).toHaveTextContent('{"token":"abc"}');

    fireEvent.blur(getByTestId('keyValuePairsValue0'));
    expect(getByTestId('keyValuePairsValue0')).toHaveAttribute('readonly');
    expect(getByTestId('keyValuePairsValue0')).toHaveAttribute('type', 'password');
  });

  it('keeps empty values editable', () => {
    const { getByTestId } = render(<ParameterValuesEditorForm defaultParams={'{"token":""}'} />);

    expect(getByTestId('keyValuePairsValue0')).not.toHaveAttribute('readonly');

    fireEvent.blur(getByTestId('keyValuePairsValue0'));
    expect(getByTestId('keyValuePairsValue0')).not.toHaveAttribute('readonly');
  });

  it('keeps earlier new rows editable when more rows are added', () => {
    const { getByTestId } = render(<ParameterValuesEditorForm defaultParams="" />);

    fireEvent.click(getByTestId('syntheticsMonitorConfigParams__button'));
    fireEvent.click(getByTestId('syntheticsMonitorConfigParams__button'));

    expect(getByTestId('keyValuePairsValue0')).not.toHaveAttribute('readonly');
    expect(getByTestId('keyValuePairsValue1')).not.toHaveAttribute('readonly');
  });

  it('keeps multi-line values in key-value rows', () => {
    const { getByTestId } = render(
      <ParameterValuesEditorForm defaultParams={'{"certificate":"first\\nsecond"}'} />
    );

    expect(getByTestId('syntheticsParamsEditorModeToggle')).toHaveTextContent('Edit as JSON');
    fireEvent.click(getByTestId('syntheticsParamValueVisibility0'));
    expect(getByTestId('keyValuePairsValue0')).toHaveValue('first\nsecond');
    expect(getByTestId('keyValuePairsValue0')).toHaveAttribute('rows', '2');

    fireEvent.click(getByTestId('syntheticsParamValueEdit0'));
    fireEvent.change(getByTestId('keyValuePairsValue0'), {
      target: { value: 'first\nsecond\nthird' },
    });
    expect(getByTestId('parameterValuesValue')).toHaveTextContent(
      '{"certificate":"first\\nsecond\\nthird"}'
    );
  });

  it('moves focus to the new row key when adding a parameter', () => {
    const { getByTestId } = render(<ParameterValuesEditorForm defaultParams="" />);

    fireEvent.click(getByTestId('syntheticsMonitorConfigParams__button'));

    expect(getByTestId('keyValuePairsKey0')).toHaveFocus();
  });

  it('keeps focus in the list after deleting a row', () => {
    const { getAllByTestId, getByTestId } = render(
      <ParameterValuesEditorForm defaultParams={'{"first":"one","second":"two"}'} />
    );

    fireEvent.click(getAllByTestId('syntheticsKeyValuePairsFieldButton')[0]);
    expect(getByTestId('keyValuePairsKey0')).toHaveValue('second');
    expect(getByTestId('keyValuePairsKey0')).toHaveFocus();

    fireEvent.click(getByTestId('syntheticsKeyValuePairsFieldButton'));
    expect(getByTestId('syntheticsMonitorConfigParams__button')).toHaveFocus();
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
    expect(getByTestId('syntheticsParamsEditorModeToggle')).toBeDisabled();
  });

  it('keeps row positions when a name is cleared', () => {
    const { getByTestId } = render(
      <ParameterValuesEditorForm defaultParams={'{"first":"one","second":"two"}'} />
    );

    fireEvent.change(getByTestId('keyValuePairsKey1'), { target: { value: '' } });
    expect(getByTestId('keyValuePairsKey0')).toHaveValue('first');
    expect(getByTestId('keyValuePairsKey1')).toHaveValue('');
    expect(getByTestId('keyValuePairsKey1')).toHaveAttribute('aria-invalid', 'true');

    fireEvent.change(getByTestId('keyValuePairsKey1'), { target: { value: 'third' } });
    expect(getByTestId('keyValuePairsKey0')).toHaveValue('first');
    expect(getByTestId('parameterValuesValue')).toHaveTextContent('{"first":"one","third":"two"}');
  });

  it('keeps both rows and flags them when names collide', () => {
    const { getByTestId } = render(
      <ParameterValuesEditorForm defaultParams={'{"first":"one","second":"two"}'} />
    );

    fireEvent.change(getByTestId('keyValuePairsKey1'), { target: { value: 'first' } });
    expect(getByTestId('keyValuePairsValue0')).toHaveValue('one');
    expect(getByTestId('keyValuePairsValue1')).toHaveValue('two');
    expect(getByTestId('keyValuePairsKey0')).toHaveAttribute('aria-invalid', 'true');
    expect(getByTestId('keyValuePairsKey1')).toHaveAttribute('aria-invalid', 'true');
    expect(getByTestId('parameterValuesValue')).toHaveTextContent('{"first":"one","first":"two"}');
  });

  it('switches a new monitor to JSON for non-string params', () => {
    const { getByTestId, queryByTestId } = render(<ParameterValuesEditorForm defaultParams="" />);

    fireEvent.click(getByTestId('syntheticsParamsEditorModeToggle'));
    fireEvent.change(getByTestId('syntheticsParamsJSONEditor'), {
      target: { value: '{"retries":3}' },
    });

    expect(getByTestId('parameterValuesValue')).toHaveTextContent('{"retries":3}');
    expect(queryByTestId('keyValuePairsKey0')).not.toBeInTheDocument();
  });

  it('stays in JSON mode while typing values that also fit pairs', () => {
    const { getByTestId, queryByTestId } = render(
      <ParameterValuesEditorForm defaultParams={'{"retries":3}'} />
    );

    fireEvent.change(getByTestId('syntheticsParamsJSONEditor'), {
      target: { value: '{"retries":"3"}' },
    });
    expect(getByTestId('syntheticsParamsJSONEditor')).toBeInTheDocument();

    fireEvent.change(getByTestId('syntheticsParamsJSONEditor'), { target: { value: '' } });
    expect(getByTestId('syntheticsParamsJSONEditor')).toBeInTheDocument();
    expect(queryByTestId('syntheticsMonitorConfigParams__button')).not.toBeInTheDocument();
  });

  it('switches JSON back to pairs when the params fit', () => {
    const { getByTestId } = render(<ParameterValuesEditorForm defaultParams={'{"retries":3}'} />);

    fireEvent.change(getByTestId('syntheticsParamsJSONEditor'), {
      target: { value: '{"retries":"3"}' },
    });
    fireEvent.click(getByTestId('syntheticsParamsEditorModeToggle'));

    expect(getByTestId('keyValuePairsKey0')).toHaveValue('retries');
    expect(getByTestId('keyValuePairsValue0')).toHaveValue('3');
  });

  it('stays in JSON mode when the form delivers earlier values late', () => {
    const { getByTestId, queryByTestId } = render(<LaggingParameterValuesEditor />);

    // An editor can auto-close braces, so a transient `{}` fits key-value pairs.
    fireEvent.change(getByTestId('syntheticsParamsJSONEditor'), { target: { value: '{}' } });
    fireEvent.change(getByTestId('syntheticsParamsJSONEditor'), {
      target: { value: '{"retries":4}' },
    });

    fireEvent.click(getByTestId('flushValue'));
    expect(queryByTestId('keyValuePairsKey0')).not.toBeInTheDocument();
    expect(getByTestId('syntheticsParamsJSONEditor')).toBeInTheDocument();

    fireEvent.click(getByTestId('flushValue'));
    expect(getByTestId('syntheticsParamsJSONEditor')).toHaveValue('{"retries":4}');
  });

  it('follows values that did not come from the editor', () => {
    const { getByTestId, queryByTestId } = render(<LaggingParameterValuesEditor />);

    fireEvent.click(getByTestId('resetValue'));

    expect(queryByTestId('syntheticsParamsJSONEditor')).not.toBeInTheDocument();
    expect(getByTestId('keyValuePairsKey0')).toHaveValue('token');
  });

  it('keeps the first blank row while adding a parameter to an empty object', () => {
    const { getByTestId } = render(<ParameterValuesEditorForm defaultParams="{}" />);

    fireEvent.click(getByTestId('syntheticsMonitorConfigParams__button'));

    expect(getByTestId('keyValuePairsKey0')).toHaveValue('');
  });

  it('uses the JSON editor for multiline string values', () => {
    const params = JSON.stringify({ certificate: 'first line\nsecond line' });
    const { getByTestId, queryByTestId } = render(
      <ParameterValuesEditorForm defaultParams={params} />
    );

    expect(queryByTestId('keyValuePairsKey0')).not.toBeInTheDocument();
    expect(getByTestId('syntheticsParamsJSONEditor')).toHaveValue(params);
  });
});

// Applies the editor's values to `value` one at a time, like a form that re-renders late.
const LaggingParameterValuesEditor = () => {
  const [value, setValue] = React.useState('{"retries":3}');
  const pending = React.useRef<string[]>([]);

  return (
    <>
      <ParameterValuesEditor onChange={(next) => pending.current.push(next)} value={value} />
      <button
        data-test-subj="flushValue"
        onClick={() => {
          const [next] = pending.current.splice(0, 1);
          setValue(next);
        }}
        type="button"
      />
      <button
        data-test-subj="resetValue"
        onClick={() => setValue('{"token":"abc"}')}
        type="button"
      />
    </>
  );
};

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
