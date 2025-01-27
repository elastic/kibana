/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, render, screen } from '@testing-library/react';

import { generateHistoricalResultsStub } from '../../../../../../stub/generate_historical_results_stub';
import {
  TestDataQualityProviders,
  TestExternalProviders,
  TestHistoricalResultsProvider,
} from '../../../../../../mock/test_providers/test_providers';
import { HistoricalResultsList } from '.';
import {
  CHANGE_YOUR_SEARCH_CRITERIA_OR_RUN,
  NO_RESULTS_MATCH_YOUR_SEARCH_CRITERIA,
} from './translations';
import { getFormattedCheckTime } from '../../utils/get_formatted_check_time';
import { getHistoricalResultStub } from '../../../../../../stub/get_historical_result_stub';
import userEvent from '@testing-library/user-event';

describe('HistoricalResultsList', () => {
  it('should render individual historical result accordions with result outcome text, formatted check time and amount of incompatible fields', () => {
    const indexName = 'test';
    const [historicalResultFail, historicalResultPass] = generateHistoricalResultsStub(
      indexName,
      2
    );
    const modifiedResults = [
      historicalResultFail,
      {
        ...historicalResultPass,
        totalFieldCount: historicalResultPass.totalFieldCount - 1,
        incompatibleFieldCount: 0,
        incompatibleFieldMappingItems: [],
        incompatibleFieldValueItems: [],
        markdownComments: [],
      },
    ];

    render(
      <TestExternalProviders>
        <TestDataQualityProviders>
          <TestHistoricalResultsProvider
            historicalResultsState={{
              results: modifiedResults,
              isLoading: false,
              error: null,
              total: modifiedResults.length,
            }}
          >
            <HistoricalResultsList indexName={indexName} />
          </TestHistoricalResultsProvider>
        </TestDataQualityProviders>
      </TestExternalProviders>
    );

    expect(
      screen.getByTestId(`historicalResultAccordionButton-${historicalResultFail.checkedAt}`)
    ).toHaveTextContent(
      `Fail${getFormattedCheckTime(historicalResultFail.checkedAt)}1 Incompatible field`
    );

    expect(
      screen.getByTestId(`historicalResultAccordionButton-${historicalResultPass.checkedAt}`)
    ).toHaveTextContent(
      `Pass${getFormattedCheckTime(historicalResultPass.checkedAt)}0 Incompatible fields`
    );
  });

  it('should render historical results accordions collapsed', () => {
    const indexName = 'test';
    const historicalResult = getHistoricalResultStub(indexName);
    render(
      <TestExternalProviders>
        <TestDataQualityProviders>
          <TestHistoricalResultsProvider
            historicalResultsState={{
              results: [historicalResult],
              isLoading: false,
              error: null,
              total: 1,
            }}
          >
            <HistoricalResultsList indexName={indexName} />
          </TestHistoricalResultsProvider>
        </TestDataQualityProviders>
      </TestExternalProviders>
    );

    const accordionToggleButton = screen.getByTestId(
      `historicalResultAccordionButton-${historicalResult.checkedAt}`
    );

    expect(accordionToggleButton).toBeInTheDocument();

    expect(accordionToggleButton).toHaveAttribute('aria-expanded', 'false');
  });

  describe('when historical result is expanded', () => {
    it('should remove incompatible field count text', async () => {
      const indexName = 'test';
      const historicalResult = getHistoricalResultStub(indexName);
      render(
        <TestExternalProviders>
          <TestDataQualityProviders>
            <TestHistoricalResultsProvider
              historicalResultsState={{
                results: [historicalResult],
                isLoading: false,
                error: null,
                total: 1,
              }}
            >
              <HistoricalResultsList indexName={indexName} />
            </TestHistoricalResultsProvider>
          </TestDataQualityProviders>
        </TestExternalProviders>
      );

      const accordionToggleButton = screen.getByTestId(
        `historicalResultAccordionButton-${historicalResult.checkedAt}`
      );

      expect(accordionToggleButton).toBeInTheDocument();

      await act(async () => userEvent.click(accordionToggleButton));

      expect(accordionToggleButton).toHaveAttribute('aria-expanded', 'true');

      expect(accordionToggleButton).toHaveTextContent(
        `Fail${getFormattedCheckTime(historicalResult.checkedAt)}`
      );

      expect(accordionToggleButton).not.toHaveTextContent('1 Incompatible field');
    });
  });

  describe('when historical results are empty', () => {
    it('should show empty message', () => {
      const indexName = 'test';
      render(
        <TestExternalProviders>
          <TestDataQualityProviders>
            <TestHistoricalResultsProvider
              historicalResultsState={{
                results: [],
                isLoading: false,
                error: null,
                total: 0,
              }}
            >
              <HistoricalResultsList indexName={indexName} />
            </TestHistoricalResultsProvider>
          </TestDataQualityProviders>
        </TestExternalProviders>
      );

      expect(screen.getByText(NO_RESULTS_MATCH_YOUR_SEARCH_CRITERIA)).toBeInTheDocument();
      expect(screen.getByText(CHANGE_YOUR_SEARCH_CRITERIA_OR_RUN)).toBeInTheDocument();
    });
  });

  describe('when clicked on each accordion', () => {
    it('should expand each accordion independently', async () => {
      const indexName = 'test';
      const results = generateHistoricalResultsStub(indexName, 2);
      render(
        <TestExternalProviders>
          <TestDataQualityProviders>
            <TestHistoricalResultsProvider
              historicalResultsState={{
                results,
                isLoading: false,
                error: null,
                total: results.length,
              }}
            >
              <HistoricalResultsList indexName={indexName} />
            </TestHistoricalResultsProvider>
          </TestDataQualityProviders>
        </TestExternalProviders>
      );

      for (const result of results) {
        const accordionToggleButton = screen.getByTestId(
          `historicalResultAccordionButton-${result.checkedAt}`
        );

        expect(accordionToggleButton).toBeInTheDocument();

        expect(accordionToggleButton).toHaveAttribute('aria-expanded', 'false');

        await act(async () => userEvent.click(accordionToggleButton));
      }

      const allAccordionToggles = screen.getAllByTestId(/historicalResultAccordionButton-.*/);

      for (const accordionToggleButton of allAccordionToggles) {
        expect(accordionToggleButton).toHaveAttribute('aria-expanded', 'true');
      }
    });
  });
});
