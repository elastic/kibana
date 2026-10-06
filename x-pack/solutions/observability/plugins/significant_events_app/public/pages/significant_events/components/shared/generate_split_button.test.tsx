/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import type { InferenceConnector } from '@kbn/inference-common';
import { InferenceConnectorType } from '@kbn/inference-common';
import { KIsOnboardingStep } from '@kbn/significant-events-schema';
import { useKibana } from '../../../../hooks/use_kibana';
import { ContextMenuSplitButton } from './context_menu_split_button';
import type { ContextMenuSplitButtonProps } from './context_menu_split_button';
import { GenerateSplitButton } from './generate_split_button';
import type { OnboardingConfig } from './types';

jest.mock('../../../../hooks/use_kibana');
jest.mock('@kbn/cps-utils', () => ({
  useIsCpsMultiProject: () => false,
}));
jest.mock('./context_menu_split_button', () => ({
  ContextMenuSplitButton: jest.fn(),
}));

const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;
const mockContextMenuSplitButton = ContextMenuSplitButton as jest.MockedFunction<
  typeof ContextMenuSplitButton
>;

const createConnector = (connectorId: string, name: string): InferenceConnector => ({
  connectorId,
  name,
  type: InferenceConnectorType.Inference,
  config: {},
  capabilities: {},
  isInferenceEndpoint: true,
  isPreconfigured: true,
});

const featuresConnector = createConnector('features-model', 'Features model');
const queriesConnector = createConnector('queries-model', 'Queries model');
const replacementConnector = createConnector('replacement-model', 'Replacement model');

const baseConfig: OnboardingConfig = {
  steps: [KIsOnboardingStep.FeaturesIdentification, KIsOnboardingStep.QueriesGeneration],
  connectors: {
    features: featuresConnector.connectorId,
    queries: queriesConnector.connectorId,
  },
};

const renderButton = ({
  config = baseConfig,
  allConnectors = [featuresConnector, queriesConnector, replacementConnector],
  defaultConnectorOnly = false,
  onConfigChange = jest.fn(),
}: {
  config?: OnboardingConfig;
  allConnectors?: InferenceConnector[];
  defaultConnectorOnly?: boolean;
  onConfigChange?: jest.Mock;
} = {}) => {
  mockUseKibana.mockReturnValue({
    core: {
      settings: {
        client: {
          get: jest.fn().mockReturnValue(defaultConnectorOnly),
        },
      },
    },
    dependencies: {
      start: {
        cps: undefined,
      },
    },
  } as never);

  render(
    <GenerateSplitButton
      config={config}
      allConnectors={allConnectors}
      connectorError={undefined}
      featuresResolvedConnectorId={featuresConnector.connectorId}
      queriesResolvedConnectorId={queriesConnector.connectorId}
      onConfigChange={onConfigChange}
      onRun={jest.fn()}
      onRunFeaturesOnly={jest.fn()}
      onRunQueriesOnly={jest.fn()}
      isRunDisabled={false}
      isConfigDisabled={false}
    />
  );

  return { onConfigChange };
};

describe('GenerateSplitButton model selection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockContextMenuSplitButton.mockImplementation(
      ({ buildPanels, isPrimaryDisabled }: ContextMenuSplitButtonProps) => {
        const panels = buildPanels({ resetMenu: jest.fn(), closeMenu: jest.fn() });
        const items = panels[0].items ?? [];
        const featuresAction = items[0] as { disabled?: boolean };
        const featuresModel = items[1] as { name: React.ReactNode };
        const queriesAction = items[3] as { disabled?: boolean };

        return (
          <>
            <button data-test-subj="combined-action" disabled={isPrimaryDisabled}>
              Combined
            </button>
            <button data-test-subj="features-action" disabled={featuresAction.disabled}>
              Features
            </button>
            <button data-test-subj="queries-action" disabled={queriesAction.disabled}>
              Queries
            </button>
            <div data-test-subj="features-model-state">{featuresModel.name}</div>
            <div data-test-subj="features-model-options">{panels[1].content}</div>
            <div data-test-subj="queries-model-options">{panels[2].content}</div>
          </>
        );
      }
    );
  });

  it.each([
    {
      scenario: 'both selections are valid',
      allConnectors: [featuresConnector, queriesConnector],
      combinedDisabled: false,
      featuresDisabled: false,
      queriesDisabled: false,
    },
    {
      scenario: 'the features selection is missing',
      allConnectors: [queriesConnector],
      combinedDisabled: true,
      featuresDisabled: true,
      queriesDisabled: false,
    },
    {
      scenario: 'the queries selection is missing',
      allConnectors: [featuresConnector],
      combinedDisabled: true,
      featuresDisabled: false,
      queriesDisabled: true,
    },
  ])(
    'sets action availability when $scenario',
    ({ allConnectors, combinedDisabled, featuresDisabled, queriesDisabled }) => {
      renderButton({ allConnectors });

      expect(screen.getByTestId('combined-action')).toHaveProperty('disabled', combinedDisabled);
      expect(screen.getByTestId('features-action')).toHaveProperty('disabled', featuresDisabled);
      expect(screen.getByTestId('queries-action')).toHaveProperty('disabled', queriesDisabled);
    }
  );

  it('shows an explicit missing default and allows a replacement selection', () => {
    const { onConfigChange } = renderButton({
      allConnectors: [queriesConnector, replacementConnector],
    });

    expect(screen.getByTestId('features-model-state')).toHaveTextContent(
      'Default model unavailable'
    );

    fireEvent.click(screen.getAllByText(replacementConnector.name)[0]);

    expect(onConfigChange).toHaveBeenCalledWith({
      ...baseConfig,
      connectors: {
        ...baseConfig.connectors,
        features: replacementConnector.connectorId,
      },
    });
  });

  it('shows a generic callout when the configured default model is required', () => {
    renderButton({ defaultConnectorOnly: true });

    const callouts = screen.getAllByTestId('significant_events_default_connector_only_callout');
    expect(callouts[0]).toHaveTextContent('Configured default model only');
    expect(callouts[0]).toHaveTextContent(
      'Generation succeeds only with the configured default model.'
    );
    expect(callouts[0]).not.toHaveTextContent(featuresConnector.connectorId);
  });
});
