/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, render, screen, within } from '@testing-library/react';
import React from 'react';

import { ConnectorFilter, DESCRIPTION_PLACEHOLDER } from '.';
import { TestProviders } from '../../../../../../common/mock';
import { getMockConnectors } from '../../../../mock/mock_connectors';

const aiConnectors = getMockConnectors();
const connectorNames = aiConnectors.map((c) => c.name);

const defaultProps = {
  aiConnectors,
  connectorNames,
  selectedConnectorNames: [],
  setSelectedConnectorNames: jest.fn(),
};

const openConnectorFilter = () => fireEvent.click(screen.getByTestId('connectorFilterButton'));

describe('ConnectorFilter', () => {
  it('renders the expected number of options', () => {
    render(
      <TestProviders>
        <ConnectorFilter {...defaultProps} />
      </TestProviders>
    );

    openConnectorFilter();

    expect(screen.getAllByTestId('connectorFilterOption').length).toBe(connectorNames.length);
  });

  describe('returns the correct description for each connector with a known actionTypeId', () => {
    const descriptionTable = [
      { name: 'GPT-4.1', expected: 'OpenAI' },
      { name: 'Gemini 2.5 Pro', expected: 'Google Gemini' },
      { name: 'Claude 3.7 Sonnet', expected: 'Amazon Bedrock' },
    ];

    it.each(descriptionTable)(
      'renders the $expected description for connector $name',
      ({ name, expected }) => {
        render(
          <TestProviders>
            <ConnectorFilter {...defaultProps} />
          </TestProviders>
        );

        openConnectorFilter();

        // Find the connector option by name using the optionLabel test id
        const options = screen.getAllByTestId('connectorFilterOption');
        const option = options.find((opt) => {
          const label = within(opt).getByTestId('optionLabel');
          return label.textContent === name;
        });

        if (!option) {
          throw new Error(`Connector option with name '${name}' not found`);
        }

        // check the description:
        const description = within(option).getByTestId('optionDescription');
        expect(description).toHaveTextContent(expected);
      }
    );
  });

  it('returns the expected placeholder description for a connector with an unknown actionTypeId', () => {
    render(
      <TestProviders>
        <ConnectorFilter {...defaultProps} />
      </TestProviders>
    );

    openConnectorFilter();

    // Find the Elastic LLM connector option:
    const options = screen.getAllByTestId('connectorFilterOption');
    const elasticLlmOption = options.find((opt) => {
      const label = within(opt).getByTestId('optionLabel');
      return label.textContent === 'Elastic LLM'; // <-- has actionTypeId: '.inference', which is not handled by getDescription
    });

    const description = within(elasticLlmOption!).getByTestId('optionDescription');
    expect(description).toHaveTextContent(DESCRIPTION_PLACEHOLDER);
  });

  describe('Deleted badge', () => {
    it('shows the Deleted badge for the connector when it is missing from aiConnectors', () => {
      // Remove 'GPT-4.1' from aiConnectors but keep its name in connectorNames:
      const deletedConnectorName = 'GPT-4.1';
      const filteredAiConnectors = aiConnectors.filter((c) => c.name !== deletedConnectorName);

      render(
        <TestProviders>
          <ConnectorFilter
            {...defaultProps}
            aiConnectors={filteredAiConnectors}
            connectorNames={connectorNames}
          />
        </TestProviders>
      );

      openConnectorFilter();

      // Find the connector option for the deleted connector by its name
      const deletedOption = screen
        .getByText(deletedConnectorName)
        .closest('[data-test-subj="connectorFilterOption"]');

      if (deletedOption == null) {
        throw new Error(`Connector option with name '${deletedConnectorName}' not found`);
      }

      expect(
        within(deletedOption as HTMLElement).getByTestId('deletedConnectorBadge')
      ).toBeInTheDocument();
    });

    it('does NOT show the Deleted badge for connectors present in aiConnectors', () => {
      render(
        <TestProviders>
          <ConnectorFilter {...defaultProps} />
        </TestProviders>
      );

      openConnectorFilter();

      const options = screen.getAllByTestId('connectorFilterOption');

      // All connectors in defaultProps.aiConnectors should NOT have the badge
      const connectorNamesSet = new Set(aiConnectors.map((c) => c.name));
      options.forEach((opt) => {
        const label = within(opt).getByTestId('optionLabel').textContent;
        if (connectorNamesSet.has(`${label}`)) {
          expect(within(opt).queryByTestId('deletedConnectorBadge')).toBeNull();
        }
      });
    });
  });
});
