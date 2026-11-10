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
import type { FormConfig, SyntheticsMonitor } from '../types';
import { ConfigKey, FormMonitorType, MonitorTypeEnum } from '../types';
import { formatDefaultFormValues } from './defaults';
import { FIELD } from './field_config';
import { Field } from './field';

jest.mock('../../../../../hooks/use_kibana_space', () => ({
  useKibanaSpace: jest.fn().mockReturnValue({ space: { id: 'default' } }),
}));

jest.mock('../../../../../utils/kibana_service', () => ({
  kibanaService: { coreStart: { docLinks: { links: {} } } },
}));

jest.mock('../fields/code_editor', () => ({
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

type FormApi = ReturnType<typeof useFormWrapped<FormConfig>>;

const toMonitor = (params: unknown): SyntheticsMonitor =>
  ({
    [ConfigKey.MONITOR_TYPE]: MonitorTypeEnum.BROWSER,
    [ConfigKey.FORM_MONITOR_TYPE]: FormMonitorType.MULTISTEP,
    [ConfigKey.PARAMS]: params,
  } as unknown as SyntheticsMonitor);

const ParamsForm = ({
  formRef,
  params,
  readOnly,
}: {
  formRef: { current?: FormApi };
  params: unknown;
  readOnly?: boolean;
}) => {
  const methods = useFormWrapped<FormConfig>({
    mode: 'onSubmit',
    reValidateMode: 'onSubmit',
    defaultValues: formatDefaultFormValues(toMonitor(params)) as FormConfig,
    shouldFocusError: false,
  });
  formRef.current = methods;

  return (
    <FormProvider {...methods}>
      <Field {...FIELD(readOnly)[ConfigKey.PARAMS]} />
    </FormProvider>
  );
};

const renderParams = (params: unknown, readOnly?: boolean) => {
  const formRef: { current?: FormApi } = {};
  const utils = render(<ParamsForm formRef={formRef} params={params} readOnly={readOnly} />);
  const getParams = () => formRef.current?.getValues(ConfigKey.PARAMS);
  const settle = () =>
    act(async () => {
      jest.advanceTimersByTime(1000);
    });
  const isValid = async () => {
    let valid: boolean | undefined;
    await act(async () => {
      valid = await formRef.current?.trigger(ConfigKey.PARAMS);
    });
    return valid;
  };
  const onValid = jest.fn();
  const submit = () =>
    act(async () => {
      await formRef.current?.handleSubmit(onValid)();
    });
  return { ...utils, getParams, isValid, onValid, settle, submit };
};

const FLAT = '{"username":"elastic","password":"changeme"}';

// Stored shapes that monitors created before the key/value editor can contain.
const STORED_PARAMS: Array<{
  name: string;
  params: string;
  mode: 'pairs' | 'json';
  valid: boolean;
}> = [
  { name: 'empty', params: '', mode: 'pairs', valid: true },
  { name: 'empty object', params: '{}', mode: 'pairs', valid: true },
  { name: 'flat string map', params: FLAT, mode: 'pairs', valid: true },
  {
    name: 'pretty-printed flat map',
    params: '{\n  "username": "elastic",\n  "password": "changeme"\n}',
    mode: 'pairs',
    valid: true,
  },
  {
    name: 'escaped quotes and unicode',
    params: '{"quote":"say \\"hi\\"","symbols":"ü✓"}',
    mode: 'pairs',
    valid: true,
  },
  {
    name: 'multi-line value',
    params: '{"certificate":"first\\nsecond"}',
    mode: 'pairs',
    valid: true,
  },
  { name: 'nested object', params: '{"user":{"name":"elastic"}}', mode: 'json', valid: true },
  { name: 'number', params: '{"retries":3}', mode: 'json', valid: true },
  { name: 'boolean and null', params: '{"debug":true,"token":null}', mode: 'json', valid: true },
  { name: 'array value', params: '{"tags":["a","b"]}', mode: 'json', valid: true },
  { name: 'top-level array', params: '["secret"]', mode: 'json', valid: false },
  { name: 'malformed JSON', params: '{invalid', mode: 'json', valid: false },
];

describe('Parameters field with existing monitors', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe.each(STORED_PARAMS)('$name', ({ params, mode, valid }) => {
    it(`opens in ${mode} mode`, () => {
      const { queryByTestId } = renderParams(params);

      expect(Boolean(queryByTestId('syntheticsMonitorConfigParams__button'))).toBe(
        mode === 'pairs'
      );
      expect(Boolean(queryByTestId('syntheticsParamsJSONEditor'))).toBe(mode === 'json');
    });

    it('keeps the stored value untouched by looking around', async () => {
      const { getByTestId, queryByTestId, getParams, settle } = renderParams(params);

      if (queryByTestId('keyValuePairsKey0')) {
        fireEvent.click(getByTestId('syntheticsParamValueVisibility0'));
        fireEvent.click(getByTestId('syntheticsParamValueEdit0'));
        fireEvent.focus(getByTestId('keyValuePairsKey0'));
        fireEvent.blur(getByTestId('keyValuePairsKey0'));
        fireEvent.click(getByTestId('syntheticsParamValueVisibility0'));
      }
      fireEvent.click(getByTestId('syntheticsParamsEditorModeToggle'));
      await settle();
      fireEvent.click(getByTestId('syntheticsParamsEditorModeToggle'));
      await settle();

      expect(getParams()).toBe(params);
    });

    it(`is ${valid ? 'accepted' : 'rejected'} by validation`, async () => {
      const { isValid } = renderParams(params);

      expect(await isValid()).toBe(valid);
    });

    it(valid ? 'submits the stored value as is' : 'blocks submitting', async () => {
      const { onValid, submit } = renderParams(params);

      await submit();

      if (valid) {
        expect(onValid).toHaveBeenCalledWith(
          expect.objectContaining({ [ConfigKey.PARAMS]: params }),
          undefined
        );
      } else {
        expect(onValid).not.toHaveBeenCalled();
      }
    });
  });

  // Previously accepted by the form and the server (the last duplicate won). The key/value
  // editor can't represent these, so validation asks for unique, non-empty names.
  it.each(['{"token":"a","token":"b"}', '{"":"orphan"}'])(
    'asks for unique, non-empty names on stored params: %s',
    async (params) => {
      const { findByText, onValid, submit } = renderParams(params);

      await submit();

      expect(onValid).not.toHaveBeenCalled();
      expect(
        await findByText('Parameter names must be unique and cannot be empty')
      ).toBeInTheDocument();
    }
  );

  describe('editing', () => {
    it('changes only the edited value and keeps the other entries', async () => {
      const params = '{"quote":"say \\"hi\\"","symbols":"ü✓","password":"changeme"}';
      const { getByTestId, getParams, settle } = renderParams(params);

      fireEvent.click(getByTestId('syntheticsParamValueEdit2'));
      fireEvent.change(getByTestId('keyValuePairsValue2'), { target: { value: 'rotated' } });
      await settle();

      expect(JSON.parse(getParams() ?? '')).toEqual({
        quote: 'say "hi"',
        symbols: 'ü✓',
        password: 'rotated',
      });
      expect(Object.keys(JSON.parse(getParams() ?? ''))).toEqual(['quote', 'symbols', 'password']);
    });

    it('keeps line breaks in multi-line values', async () => {
      const { getByTestId, getParams, settle } = renderParams('{"certificate":"first\\nsecond"}');

      fireEvent.click(getByTestId('syntheticsParamValueVisibility0'));
      fireEvent.click(getByTestId('syntheticsParamValueEdit0'));
      fireEvent.change(getByTestId('keyValuePairsValue0'), {
        target: { value: 'first\nsecond\nthird' },
      });
      await settle();

      expect(JSON.parse(getParams() ?? '')).toEqual({ certificate: 'first\nsecond\nthird' });
    });

    it('saves a removed last parameter as empty params', async () => {
      const { getByTestId, getParams, settle } = renderParams('{"token":"abc"}');

      fireEvent.click(getByTestId('syntheticsKeyValuePairsFieldButton'));
      await settle();

      expect(getParams()).toBe('');
    });

    it('writes JSON editor text exactly as typed', async () => {
      const typed = '{\n  "retries": 3,\n  "user": { "name": "elastic" }\n}';
      const { getByTestId, getParams, settle } = renderParams('{"retries":3}');

      fireEvent.change(getByTestId('syntheticsParamsJSONEditor'), { target: { value: typed } });
      await settle();

      expect(getParams()).toBe(typed);
    });
  });

  describe('params returned by the API as an object', () => {
    it('opens a flat string object as key/value rows', () => {
      const { getParams, getByTestId } = renderParams({ username: 'elastic' });

      expect(getParams()).toBe('{"username":"elastic"}');
      expect(getByTestId('keyValuePairsKey0')).toHaveValue('username');
    });

    it('opens an object with non-string values in the JSON editor', () => {
      const { getParams, getByTestId } = renderParams({ retries: 3 });

      expect(getParams()).toBe('{"retries":3}');
      expect(getByTestId('syntheticsParamsJSONEditor')).toHaveValue('{"retries":3}');
    });
  });

  describe('read only', () => {
    it('does not allow changing key/value rows', async () => {
      const { getByTestId, getAllByTestId, getParams, settle } = renderParams(FLAT, true);

      expect(getByTestId('syntheticsMonitorConfigParams__button')).toBeDisabled();
      expect(getByTestId('keyValuePairsKey0')).toHaveAttribute('readonly');
      expect(getByTestId('syntheticsParamValueEdit0')).toBeDisabled();
      getAllByTestId('syntheticsKeyValuePairsFieldButton').forEach((button: HTMLElement) =>
        expect(button).toBeDisabled()
      );
      await settle();

      expect(getParams()).toBe(FLAT);
    });
  });
});
