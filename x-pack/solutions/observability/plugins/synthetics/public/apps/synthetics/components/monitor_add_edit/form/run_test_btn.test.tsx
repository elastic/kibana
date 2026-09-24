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
import { ConfigKey, FormMonitorType } from '../../../../../../common/runtime_types';
import { runOnceMonitor } from '../../../state/manual_test_runs/api';
import { getDefaultFormFields } from './defaults';
import { RunTestButton } from './run_test_btn';

jest.mock('../../../state/manual_test_runs/api', () => ({
  runOnceMonitor: jest.fn().mockResolvedValue({ errors: [] }),
}));

jest.mock('../../../hooks', () => ({
  useGetUrlParams: () => ({ spaceId: 'default' }),
}));

jest.mock('../../../../../hooks/use_kibana_space', () => ({
  useKibanaSpace: () => ({ space: { id: 'default' } }),
}));

jest.mock('../../test_now_mode/test_now_mode_flyout', () => ({
  TestNowModeFlyout: () => null,
}));

describe('RunTestButton', () => {
  beforeEach(() => {
    (runOnceMonitor as jest.Mock).mockClear();
  });

  it('sends masked parameter placeholders for the server to restore', async () => {
    const { getByRole } = render(<RunTestHarness />);

    await waitFor(() =>
      expect(getByRole('button', { name: 'Click to run test now' })).toBeEnabled()
    );
    fireEvent.click(getByRole('button', { name: 'Click to run test now' }));

    await waitFor(() => {
      expect(runOnceMonitor).toHaveBeenCalledWith(
        expect.objectContaining({
          monitor: expect.objectContaining({
            [ConfigKey.PARAMS]: '{"password":"********"}',
            [ConfigKey.CONFIG_ID]: 'saved-monitor-id',
          }),
        })
      );
    });
  });
});

const RunTestHarness = () => {
  const methods = useForm({
    defaultValues: {
      ...getDefaultFormFields()[FormMonitorType.MULTISTEP],
      [ConfigKey.NAME]: 'Mask params browser',
      [ConfigKey.CONFIG_ID]: 'saved-monitor-id',
      [ConfigKey.PARAMS]: '{"password":"********"}',
    },
  });

  return (
    <FormProvider {...methods}>
      <RunTestButton canUsePublicLocations isServiceAllowed />
    </FormProvider>
  );
};
