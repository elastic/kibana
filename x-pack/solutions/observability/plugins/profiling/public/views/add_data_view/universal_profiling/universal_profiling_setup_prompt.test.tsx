/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, render } from '@testing-library/react';
import type { NoDataCardProps } from '@kbn/shared-ux-card-no-data';
import type { ProfilingStatus } from '@kbn/profiling-utils';

const mockNoDataCard = jest.fn();

jest.mock('../../../components/contexts/profiling_dependencies/use_profiling_dependencies');
jest.mock('../../../components/contexts/profiling_status/use_profiling_status');
jest.mock('../../../hooks/use_auto_aborted_http_client', () => ({
  useAutoAbortedHttpClient: () => ({ name: 'http' }),
}));
jest.mock('@kbn/shared-ux-card-no-data', () => ({
  NoDataCard: (props: NoDataCardProps) => {
    mockNoDataCard(props);
    return null;
  },
}));

import { AsyncStatus } from '../../../hooks/use_async';
import { useProfilingDependencies } from '../../../components/contexts/profiling_dependencies/use_profiling_dependencies';
import { useProfilingStatus } from '../../../components/contexts/profiling_status/use_profiling_status';
import { UniversalProfilingSetupPrompt } from './universal_profiling_setup_prompt';

const makeStatus = (canSetup: boolean): ProfilingStatus => ({
  isEnabled: true,
  otel: { isAvailable: true, hasData: false },
  universalProfiling: {
    isAvailable: true,
    hasSetup: false,
    hasData: false,
    hasLegacyData: false,
    canSetup,
  },
});

describe('UniversalProfilingSetupPrompt', () => {
  const postSetupResources = jest.fn();
  const refresh = jest.fn();
  const addError = jest.fn();

  // The setup card props from its latest render.
  const getSetupCard = () => mockNoDataCard.mock.calls[mockNoDataCard.mock.calls.length - 1][0];

  const clickSetupButton = async () => {
    await act(async () => {
      getSetupCard().onClick({ preventDefault: jest.fn() });
    });
  };

  const renderPrompt = (canSetup = true) => {
    (useProfilingStatus as jest.Mock).mockReturnValue({
      status: AsyncStatus.Settled,
      data: makeStatus(canSetup),
      refresh,
    });
    render(<UniversalProfilingSetupPrompt />);
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useProfilingDependencies as jest.Mock).mockReturnValue({
      start: {
        core: {
          docLinks: { ELASTIC_WEBSITE_URL: 'https://www.elastic.co/', DOC_LINK_VERSION: 'current' },
          notifications: { toasts: { addError } },
        },
      },
      services: { postSetupResources },
    });
  });

  it('renders the setup card', () => {
    renderPrompt();

    expect(getSetupCard()).toEqual(
      expect.objectContaining({
        'data-test-subj': 'profilingCheckSetupCard',
        buttonText: 'Set up Universal Profiling',
        buttonIsDisabled: false,
        disabledButtonTooltipText: undefined,
        docsLink:
          'https://www.elastic.co/guide/en/observability/current/profiling-get-started.html',
      })
    );
  });

  it('disables the setup button when the user cannot run the setup', () => {
    renderPrompt(false);

    expect(getSetupCard()).toEqual(
      expect.objectContaining({
        buttonIsDisabled: true,
        disabledButtonTooltipText: 'You need superuser permissions to set up Universal Profiling.',
      })
    );
  });

  it('runs the setup and fetches the status again', async () => {
    postSetupResources.mockResolvedValue(undefined);
    renderPrompt();

    await clickSetupButton();

    expect(postSetupResources).toHaveBeenCalledWith({ http: { name: 'http' } });
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(addError).not.toHaveBeenCalled();
  });

  it('shows the loading state while the setup is running', async () => {
    postSetupResources.mockReturnValue(new Promise(() => {}));
    renderPrompt();

    await clickSetupButton();

    expect(getSetupCard()).toEqual(
      expect.objectContaining({
        buttonText: 'Setting up Universal Profiling...',
        buttonIsDisabled: true,
      })
    );
  });

  it('shows an error toast when the setup fails', async () => {
    const error = Object.assign(new Error('Internal Server Error'), {
      body: { message: 'Error while setting up Universal Profiling' },
    });
    postSetupResources.mockRejectedValue(error);
    renderPrompt();

    await clickSetupButton();

    expect(addError).toHaveBeenCalledWith(error, {
      title: 'Failed to complete setup',
      toastMessage: 'Error while setting up Universal Profiling',
    });
    expect(refresh).not.toHaveBeenCalled();
    expect(getSetupCard()).toEqual(expect.objectContaining({ buttonIsDisabled: false }));
  });
});
