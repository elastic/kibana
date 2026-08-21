/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act } from '@testing-library/react';
import * as formContext from 'react-hook-form';
import { render } from '../../../utils/testing/rtl_helpers';
import { ActionBar } from './submit';

jest.mock('../hooks/use_monitor_save', () => ({
  useMonitorSave: () => ({ status: 'not_initiated', loading: false, isEdit: false }),
}));

jest.mock('../../../hooks', () => ({
  ...jest.requireActual('../../../hooks'),
  useEnablement: () => ({ isServiceAllowed: true }),
}));

jest.mock('../../../../../hooks/use_capabilities', () => ({
  ...jest.requireActual('../../../../../hooks/use_capabilities'),
  useCanEditSynthetics: () => true,
}));

const getUrlForApp = (appId: string, { path }: { path: string }) => `/app/${appId}${path}`;

describe('<ActionBar /> Cancel link', () => {
  beforeEach(() => {
    jest.spyOn(formContext, 'useFormContext').mockReturnValue({
      handleSubmit: () => () => {},
      getValues: () => ({}),
      formState: { defaultValues: undefined, isValid: true, errors: {} },
    } as unknown as formContext.UseFormReturn);
  });

  it('points the Cancel link to the onboarding app when both return params are present', async () => {
    const { getByTestId } = render(<ActionBar readOnly={false} />, {
      url: '/add-monitor?returnAppId=observabilityOnboarding&returnPath=%2Fsome-path',
      core: {
        application: {
          getUrlForApp,
        },
      },
    });

    expect(getByTestId('syntheticsActionBarLink')).toHaveAttribute(
      'href',
      '/app/observabilityOnboarding/some-path'
    );

    await act(async () => {});
  });

  it('points the Cancel link to the monitors page when the search has no return params', async () => {
    const { getByTestId, history } = render(<ActionBar readOnly={false} />, {
      url: '/add-monitor',
      core: {
        application: {
          getUrlForApp,
        },
      },
    });

    expect(getByTestId('syntheticsActionBarLink')).toHaveAttribute(
      'href',
      history.createHref({ pathname: '/monitors' })
    );

    await act(async () => {});
  });
});
