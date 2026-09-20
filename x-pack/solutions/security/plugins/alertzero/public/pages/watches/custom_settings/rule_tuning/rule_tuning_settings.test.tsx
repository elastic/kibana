/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { agentBuilderDefaultAgentId } from '@kbn/agent-builder-common';
import {
  SYSTEM_SECURITY_WATCH_DETECTION_ID,
  SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID,
  type Worker,
} from '@kbn/alertzero-common';
import { RuleTuningSettings } from './rule_tuning_settings';

const CUSTOM_AGENT_ID = 'my-custom-agent';

const ruleTuning: Worker = {
  id: SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID,
  name: 'Rule Tuning',
  watchIds: [SYSTEM_SECURITY_WATCH_DETECTION_ID],
  enabled: true,
  lastRun: null,
  state: 'ok',
  settingsRevision: 1,
  settings: {
    workerId: SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID,
    autonomy: 'manual',
    scheduleInterval: '2h',
    extras: { analysisWindowDays: 21 },
  },
};

const listAgents = jest.fn();

const withProviders = (children: React.ReactNode) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <KibanaContextProvider services={{ agentBuilder: { agents: { list: listAgents } } }}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </KibanaContextProvider>
  );
};

const renderSettings = (onExtrasChange = jest.fn(), settings = ruleTuning.settings) => {
  const { rerender } = render(
    withProviders(
      <RuleTuningSettings worker={ruleTuning} settings={settings} onExtrasChange={onExtrasChange} />
    )
  );
  return {
    onExtrasChange,
    rerender,
    field: screen.getByTestId('alertZeroAnalysisWindowDays'),
  };
};

describe('RuleTuningSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    listAgents.mockResolvedValue([
      { id: agentBuilderDefaultAgentId, name: 'Default agent', readonly: false },
      { id: CUSTOM_AGENT_ID, name: 'My custom agent', readonly: false },
    ]);
  });

  it('shows the saved analysis window', () => {
    const { field } = renderSettings();

    expect(field).toHaveValue(21);
  });

  it('hands back the complete extras object as soon as a valid value is typed', () => {
    const { onExtrasChange, field } = renderSettings();

    fireEvent.change(field, { target: { value: '7' } });

    expect(onExtrasChange).toHaveBeenCalledTimes(1);
    expect(onExtrasChange).toHaveBeenCalledWith({ analysisWindowDays: 7 });
  });

  it('reverts an out-of-range value on blur instead of emitting it', () => {
    const { onExtrasChange, field } = renderSettings();

    fireEvent.change(field, { target: { value: '31' } });
    expect(onExtrasChange).not.toHaveBeenCalled();
    expect(field).toHaveValue(31);

    fireEvent.blur(field);

    expect(onExtrasChange).not.toHaveBeenCalled();
    expect(field).toHaveValue(21);
  });

  it('holds incomplete input while typing and reverts it on blur', () => {
    const { onExtrasChange, field } = renderSettings();

    fireEvent.change(field, { target: { value: '' } });
    expect(onExtrasChange).not.toHaveBeenCalled();

    fireEvent.blur(field);

    expect(field).toHaveValue(21);
  });

  it('re-syncs when the parent resets the value', () => {
    const { rerender, field } = renderSettings();

    fireEvent.change(field, { target: { value: '7' } });
    rerender(
      withProviders(
        <RuleTuningSettings
          worker={ruleTuning}
          settings={{ ...ruleTuning.settings, extras: { analysisWindowDays: 14 } }}
          onExtrasChange={jest.fn()}
        />
      )
    );

    expect(field).toHaveValue(14);
  });

  it('falls back to the default window when extras are missing', () => {
    render(
      withProviders(
        <RuleTuningSettings
          worker={ruleTuning}
          settings={{ ...ruleTuning.settings, extras: undefined }}
          onExtrasChange={jest.fn()}
        />
      )
    );

    expect(screen.getByTestId('alertZeroAnalysisWindowDays')).toHaveValue(14);
  });

  describe('agent picker', () => {
    it('leaves the agent unset until the user picks one, preserving the default agent', async () => {
      const { onExtrasChange } = renderSettings();

      await screen.findByTestId('alertZeroRuleTuningAgentSelector');

      expect(onExtrasChange).not.toHaveBeenCalled();
    });

    it('keeps the required extras intact when an agent is picked', async () => {
      const onExtrasChange = jest.fn();
      renderSettings(onExtrasChange);

      fireEvent.click(await screen.findByTestId('alertZeroRuleTuningAgentSelector'));
      fireEvent.click(await screen.findByText('My custom agent'));

      await waitFor(() => {
        expect(onExtrasChange).toHaveBeenCalledWith({
          analysisWindowDays: 21,
          agentId: CUSTOM_AGENT_ID,
        });
      });
    });

    it('keeps a stored agent visible', async () => {
      renderSettings(jest.fn(), {
        ...ruleTuning.settings,
        extras: { analysisWindowDays: 21, agentId: CUSTOM_AGENT_ID },
      });

      expect(await screen.findByText('My custom agent')).toBeInTheDocument();
    });

    it('drops the agent key entirely when the user clears the picker', async () => {
      const onExtrasChange = jest.fn();
      renderSettings(onExtrasChange, {
        ...ruleTuning.settings,
        extras: { analysisWindowDays: 21, agentId: CUSTOM_AGENT_ID },
      });

      fireEvent.click(await screen.findByTestId('alertZeroRuleTuningAgentSelector'));
      fireEvent.click(await screen.findByText('Default agent'));

      await waitFor(() => {
        expect(onExtrasChange).toHaveBeenCalledWith({ analysisWindowDays: 21 });
      });
      expect(onExtrasChange.mock.calls[0][0]).not.toHaveProperty('agentId');
    });
  });
});
