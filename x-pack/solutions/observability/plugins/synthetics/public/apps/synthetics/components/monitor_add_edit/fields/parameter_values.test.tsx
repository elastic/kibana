/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react';
import { FormProvider, useForm, useFormContext } from 'react-hook-form';
import { render } from '../../../utils/testing/rtl_helpers';
import { ParameterValuesEditor, ParameterValuesVisibilityToggle } from './parameter_values';
import { ParameterValuesProvider } from '../form/parameter_values_context';
import { ConfigKey } from '../../../../../../common/runtime_types';
import { fetchSyntheticsMonitor } from '../../../state/monitor_details/api';

const mockUseKibana = jest.fn();

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  ...jest.requireActual('@kbn/kibana-react-plugin/public'),
  useKibana: () => mockUseKibana(),
}));

jest.mock('./code_editor', () => ({
  CodeEditor: ({ readOnly, value }: { readOnly?: boolean; value: string }) => (
    <input data-test-subj="parameterValuesEditor" readOnly={readOnly} value={value} />
  ),
}));

jest.mock('../../../state/monitor_details/api', () => ({
  fetchSyntheticsMonitor: jest.fn(),
}));

jest.mock('../../../hooks', () => ({
  useGetUrlParams: () => ({}),
}));

jest.mock('../hooks', () => ({
  useIsEditFlow: () => true,
}));

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => ({ monitorId: 'monitor-id' }),
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

  it('masks parameter values and makes the editor read-only by default', () => {
    const { getByTestId } = render(
      <ParameterValuesProvider hideParameterValuesByDefault>
        <ParameterValuesEditor
          ariaLabel="Monitor params code editor"
          id="syntheticsMonitorConfigParams"
          onChange={() => {}}
          value={'{"username":"elastic","password":"changeme"}'}
        />
      </ParameterValuesProvider>
    );

    const editor = getByTestId('parameterValuesEditor') as HTMLInputElement;
    expect(editor.value).toBe('{"username":"********","password":"********"}');
    expect(editor).toHaveAttribute('readonly');
  });

  it('shows parameter values when masking is disabled', () => {
    const { getByTestId } = render(
      <ParameterValuesProvider hideParameterValuesByDefault={false}>
        <ParameterValuesEditor
          ariaLabel="Monitor params code editor"
          id="syntheticsMonitorConfigParams"
          onChange={() => {}}
          value={'{"username":"elastic"}'}
        />
      </ParameterValuesProvider>
    );

    const editor = getByTestId('parameterValuesEditor') as HTMLInputElement;
    expect(editor.value).toBe('{"username":"elastic"}');
    expect(editor).not.toHaveAttribute('readonly');
  });

  it('fetches and displays parameter values when the toggle is disabled', async () => {
    (fetchSyntheticsMonitor as jest.Mock).mockResolvedValue({
      [ConfigKey.PARAMS]: '{"password":"changeme"}',
    });

    const { getByRole, getByTestId } = render(<ParameterValuesToggleForm />);

    fireEvent.click(getByRole('switch', { name: 'Hide parameter values' }));

    await waitFor(() => {
      expect(fetchSyntheticsMonitor).toHaveBeenCalledWith({
        monitorId: 'monitor-id',
        spaceId: undefined,
        hideParams: false,
      });
    });

    await waitFor(() => {
      expect(getByTestId('parameterValuesValue')).toHaveTextContent('{"password":"changeme"}');
    });
  });

  it('does not render the toggle without both required privileges', () => {
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

    const { queryByRole } = render(<ParameterValuesToggleForm />);

    expect(queryByRole('switch', { name: 'Hide parameter values' })).not.toBeInTheDocument();
  });
});

const ParameterValuesToggleForm = () => {
  const methods = useForm({
    defaultValues: {
      [ConfigKey.PARAMS]: '{"password":"********"}',
    },
  });

  return (
    <ParameterValuesProvider hideParameterValuesByDefault>
      <FormProvider {...methods}>
        <ParameterValuesVisibilityToggle />
        <ParameterValuesValue />
      </FormProvider>
    </ParameterValuesProvider>
  );
};

const ParameterValuesValue = () => {
  const { watch } = useFormContext();
  return <output data-test-subj="parameterValuesValue">{watch(ConfigKey.PARAMS)}</output>;
};
