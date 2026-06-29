/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EuiThemeProvider } from '@elastic/eui';
import { useUiSetting$ } from '@kbn/kibana-react-plugin/public';
import { ChartDescriptionButton } from './chart_description_button';
import { useApiClient } from '../../hooks/use_api_client';
import { useKibana } from '../../hooks/use_kibana';
import { useLicense } from '../../hooks/use_license';
import { useGenAIConnectors } from '../../hooks/use_genai_connectors';
import { useStreamingAiInsight } from '../../hooks/use_streaming_ai_insight';

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useUiSetting$: jest.fn(),
}));

jest.mock('../../hooks/use_api_client');
jest.mock('../../hooks/use_kibana');
jest.mock('../../hooks/use_license');
jest.mock('../../hooks/use_genai_connectors');
jest.mock('../../hooks/use_streaming_ai_insight');

const mockUseUiSetting$ = useUiSetting$ as jest.Mock;
const mockUseApiClient = useApiClient as jest.Mock;
const mockUseKibana = useKibana as jest.Mock;
const mockUseLicense = useLicense as jest.Mock;
const mockUseGenAIConnectors = useGenAIConnectors as jest.Mock;
const mockUseStreamingAiInsight = useStreamingAiInsight as jest.Mock;

const baseStreamingState = () => ({
  isLoading: false,
  error: undefined as string | undefined,
  summary: '',
  fetch: jest.fn(),
  stop: jest.fn(),
  regenerate: jest.fn(),
});

const renderComponent = (
  props: Partial<React.ComponentProps<typeof ChartDescriptionButton>> = {}
) =>
  render(
    <EuiThemeProvider>
      <ChartDescriptionButton
        chartTitle="Throughput"
        series={[
          {
            title: 'Current period',
            data: [
              { x: Date.parse('2024-05-01T12:00:00.000Z'), y: 100 },
              { x: Date.parse('2024-05-01T13:00:00.000Z'), y: 200 },
            ],
          },
        ]}
        timestampFormatter={(timestamp) => `t:${timestamp}`}
        valueFormatter={(value) => `${value} tpm`}
        {...props}
      />
    </EuiThemeProvider>
  );

describe('ChartDescriptionButton', () => {
  beforeEach(() => {
    mockUseApiClient.mockReturnValue({
      stream: jest.fn(),
    });
    mockUseKibana.mockReturnValue({
      services: {
        agentBuilder: undefined,
        application: {
          capabilities: {
            agentBuilder: {
              show: false,
            },
          },
        },
      },
    });
    mockUseLicense.mockReturnValue({
      getLicense: () => ({
        hasAtLeast: () => false,
      }),
    });
    mockUseGenAIConnectors.mockReturnValue({
      hasConnectors: false,
      connectors: [],
      loading: false,
    });
    mockUseStreamingAiInsight.mockReturnValue(baseStreamingState());
    mockUseUiSetting$.mockReturnValue(['agent']);
  });

  it('opens a popover with a deterministic chart summary', async () => {
    const user = userEvent.setup();

    renderComponent();

    await user.click(screen.getByTestId('observabilityChartDescriptionButton'));

    expect(screen.getByTestId('observabilityChartDescriptionButtonPanel')).toBeInTheDocument();
    expect(screen.getByTestId('observabilityChartDescriptionButtonPanel')).toHaveAttribute(
      'aria-describedby',
      expect.any(String)
    );
    expect(screen.getByText(/Summary for Throughput/i)).toBeInTheDocument();
    expect(screen.getByText(/Basic summary generated from chart data/i)).toBeInTheDocument();
  });

  it('shows a loading message while chart data is loading', async () => {
    const user = userEvent.setup();

    renderComponent({ isLoading: true, series: [] });

    await user.click(screen.getByTestId('observabilityChartDescriptionButton'));

    expect(screen.getByText('Loading chart summary.')).toBeInTheDocument();
  });

  it('does not announce streaming AI chunks in the visible summary live region', async () => {
    const user = userEvent.setup();

    mockUseKibana.mockReturnValue({
      services: {
        agentBuilder: {},
        application: {
          capabilities: {
            agentBuilder: {
              show: true,
            },
          },
        },
      },
    });
    mockUseLicense.mockReturnValue({
      getLicense: () => ({
        hasAtLeast: () => true,
      }),
    });
    mockUseGenAIConnectors.mockReturnValue({
      hasConnectors: true,
      connectors: [],
      loading: false,
    });
    mockUseStreamingAiInsight.mockReturnValue({
      ...baseStreamingState(),
      isLoading: true,
      summary: 'Partial AI summary chunk',
    });

    renderComponent();

    await user.click(screen.getByTestId('observabilityChartDescriptionButton'));

    expect(screen.getByText('Partial AI summary chunk')).toBeInTheDocument();
    expect(
      screen.getByTestId('observabilityChartDescriptionButtonScreenReaderStatus')
    ).toHaveTextContent('Generating AI summary.');
    expect(screen.getByText('Partial AI summary chunk').closest('p')).toHaveAttribute(
      'aria-hidden',
      'true'
    );
    expect(screen.getByTestId('observabilityChartDescriptionButtonPanel')).not.toHaveAttribute(
      'aria-live'
    );
  });
});
