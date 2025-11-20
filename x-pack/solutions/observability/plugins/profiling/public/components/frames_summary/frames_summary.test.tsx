/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { FramesSummary } from '.';

describe('FramesSummary', () => {
  const mockBaseValue = {
    totalCount: 498,
    scaleFactor: 1,
    totalAnnualCO2Kgs: 34.5,
    totalAnnualCostUSD: 325.2726,
  };

  const mockComparisonValue = {
    totalCount: 14940,
    scaleFactor: 1,
    totalAnnualCO2Kgs: 34.5,
    totalAnnualCostUSD: 325.2726,
  };

  it('shows only the baseline values when comparison data is not available', () => {
    render(
      <FramesSummary baseValue={mockBaseValue} comparisonValue={undefined} isLoading={false} />
    );

    // Verify summary container is rendered
    expect(screen.getByTestId('framesSummary')).toBeInTheDocument();
    expect(screen.getByTestId('framesSummary_details')).toBeInTheDocument();

    // Overall performance should be hidden when comparisonValue is empty
    expect(screen.queryByTestId('overallPerformance_value')).not.toBeInTheDocument();
    expect(screen.queryByTestId('framesSummary_item_overallPerformance')).not.toBeInTheDocument();

    // Verify baseline values are displayed
    expect(screen.getByTestId('annualizedCo2_value')).toBeInTheDocument();
    expect(screen.getByTestId('annualizedCost_value')).toBeInTheDocument();
    expect(screen.getByTestId('totalNumberOfSamples_value')).toBeInTheDocument();

    // Verify baseline values have correct content (formatted values)
    expect(screen.getByTestId('annualizedCo2_value')).toHaveTextContent(/76\.06 lbs \/ 34\.5 kg/);
    expect(screen.getByTestId('annualizedCost_value')).toHaveTextContent(/\$325\.27/);
    expect(screen.getByTestId('totalNumberOfSamples_value')).toHaveTextContent('498');

    // Verify comparison values are hidden
    expect(screen.queryByTestId('annualizedCo2_comparison_value')).not.toBeInTheDocument();
    expect(screen.queryByTestId('annualizedCost_comparison_value')).not.toBeInTheDocument();
    expect(screen.queryByTestId('totalNumberOfSamples_comparison_value')).not.toBeInTheDocument();
  });

  it('shows empty baseline values when data is not available', () => {
    render(
      <FramesSummary
        baseValue={undefined}
        comparisonValue={mockComparisonValue}
        isLoading={false}
      />
    );

    // Verify summary container is rendered
    expect(screen.getByTestId('framesSummary')).toBeInTheDocument();
    expect(screen.getByTestId('framesSummary_details')).toBeInTheDocument();

    // Verify baseline values show 0/empty when baseValue is undefined
    expect(screen.getByTestId('overallPerformance_value')).toBeInTheDocument();
    expect(screen.getByTestId('annualizedCo2_value')).toBeInTheDocument();
    expect(screen.getByTestId('annualizedCost_value')).toBeInTheDocument();
    expect(screen.getByTestId('totalNumberOfSamples_value')).toBeInTheDocument();

    // Verify baseline values are zero/empty
    expect(screen.getByTestId('overallPerformance_value')).toHaveTextContent('0%');
    expect(screen.getByTestId('annualizedCo2_value')).toHaveTextContent('0 lbs / 0 kg');
    expect(screen.getByTestId('annualizedCost_value')).toHaveTextContent('$0');
    expect(screen.getByTestId('totalNumberOfSamples_value')).toHaveTextContent('0');

    // Verify comparison values are displayed
    expect(screen.getByTestId('annualizedCo2_comparison_value')).toBeInTheDocument();
    expect(screen.getByTestId('annualizedCost_comparison_value')).toBeInTheDocument();
    expect(screen.getByTestId('totalNumberOfSamples_comparison_value')).toBeInTheDocument();

    // Verify comparison values have correct content
    expect(screen.getByTestId('annualizedCo2_comparison_value')).toHaveTextContent(
      /76\.06 lbs \/ 34\.5 kg/
    );
    expect(screen.getByTestId('annualizedCost_comparison_value')).toHaveTextContent(/\$325\.27/);
    expect(screen.getByTestId('totalNumberOfSamples_comparison_value')).toHaveTextContent(
      /14[,.]940/
    );
  });

  it('shows empty summary when no data is available', () => {
    render(<FramesSummary baseValue={undefined} comparisonValue={undefined} isLoading={false} />);

    // Verify summary container is rendered
    expect(screen.getByTestId('framesSummary')).toBeInTheDocument();
    expect(screen.getByTestId('framesSummary_details')).toBeInTheDocument();

    // Overall performance should be hidden when comparisonValue is empty
    expect(screen.queryByTestId('overallPerformance_value')).not.toBeInTheDocument();
    expect(screen.queryByTestId('framesSummary_item_overallPerformance')).not.toBeInTheDocument();

    // Verify baseline values are displayed (showing 0/empty)
    expect(screen.getByTestId('annualizedCo2_value')).toBeInTheDocument();
    expect(screen.getByTestId('annualizedCost_value')).toBeInTheDocument();
    expect(screen.getByTestId('totalNumberOfSamples_value')).toBeInTheDocument();

    // Verify baseline values are zero/empty
    expect(screen.getByTestId('annualizedCo2_value')).toHaveTextContent('0 lbs / 0 kg');
    expect(screen.getByTestId('annualizedCost_value')).toHaveTextContent('$0');
    expect(screen.getByTestId('totalNumberOfSamples_value')).toHaveTextContent('0');

    // Verify comparison values are hidden
    expect(screen.queryByTestId('annualizedCo2_comparison_value')).not.toBeInTheDocument();
    expect(screen.queryByTestId('annualizedCost_comparison_value')).not.toBeInTheDocument();
    expect(screen.queryByTestId('totalNumberOfSamples_comparison_value')).not.toBeInTheDocument();
  });

  it('hides overall performance when comparison value is empty', () => {
    render(
      <FramesSummary baseValue={mockBaseValue} comparisonValue={undefined} isLoading={false} />
    );

    // Overall performance should be hidden when comparisonValue is empty
    expect(screen.queryByTestId('framesSummary_item_overallPerformance')).not.toBeInTheDocument();
  });

  it('shows overall performance when comparison value is available', () => {
    render(
      <FramesSummary
        baseValue={mockBaseValue}
        comparisonValue={mockComparisonValue}
        isLoading={false}
      />
    );

    // Overall performance should be visible when comparisonValue exists
    expect(screen.getByTestId('framesSummary_item_overallPerformance')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(
      <FramesSummary
        baseValue={mockBaseValue}
        comparisonValue={mockComparisonValue}
        isLoading={true}
      />
    );

    // When loading, comparison values should not be shown
    expect(screen.queryByTestId('annualizedCo2_comparison_value')).not.toBeInTheDocument();
    expect(screen.queryByTestId('annualizedCost_comparison_value')).not.toBeInTheDocument();
    expect(screen.queryByTestId('totalNumberOfSamples_comparison_value')).not.toBeInTheDocument();
  });

  it('renders in compressed mode', () => {
    render(
      <FramesSummary
        baseValue={mockBaseValue}
        comparisonValue={mockComparisonValue}
        isLoading={false}
        compressed={true}
      />
    );

    // In compressed mode, should not have accordion
    expect(screen.queryByTestId('framesSummary_compressed')).toBeInTheDocument();
    expect(screen.queryByTestId('framesSummary_performanceTitle')).not.toBeInTheDocument();
    expect(screen.queryByTestId('framesSummary_performanceValue')).not.toBeInTheDocument();
  });

  it('renders with border when hasBorder is true', () => {
    const { container } = render(
      <FramesSummary
        baseValue={mockBaseValue}
        comparisonValue={mockComparisonValue}
        isLoading={false}
        hasBorder={true}
      />
    );

    // Check that panels have border - EuiPanel with hasBorder prop adds hasBorder class
    // The actual class name might vary, so we check for panels with the hasBorder attribute or class
    const panels = container.querySelectorAll('[class*="hasBorder"], .euiPanel[class*="border"]');
    expect(panels.length).toBeGreaterThan(0);
  });

  describe('performance title labels', () => {
    it('shows "Gained/Lost overall performance by" when loading', () => {
      render(
        <FramesSummary
          baseValue={mockBaseValue}
          comparisonValue={mockComparisonValue}
          isLoading={true}
        />
      );

      // Both the accordion header and summary item should show the same title
      expect(screen.getByTestId('framesSummary_performanceTitle')).toHaveTextContent(
        'Gained/Lost overall performance by'
      );
      expect(screen.getByTestId('overallPerformance_summary_title')).toHaveTextContent(
        'Gained/Lost overall performance by'
      );
    });

    it('shows "Lost overall performance by" when comparison has more samples than baseline', () => {
      // Baseline has fewer samples (498) than comparison (14940)
      // This means performance was lost (comparison is worse)
      const baselineWithFewerSamples = {
        totalCount: 498,
        scaleFactor: 1,
        totalAnnualCO2Kgs: 34.5,
        totalAnnualCostUSD: 325.2726,
      };

      const comparisonWithMoreSamples = {
        totalCount: 14940,
        scaleFactor: 1,
        totalAnnualCO2Kgs: 34.5,
        totalAnnualCostUSD: 325.2726,
      };

      render(
        <FramesSummary
          baseValue={baselineWithFewerSamples}
          comparisonValue={comparisonWithMoreSamples}
          isLoading={false}
        />
      );

      // Both the accordion header and summary item should show the same title
      expect(screen.getByTestId('framesSummary_performanceTitle')).toHaveTextContent(
        'Lost overall performance by'
      );
      expect(screen.getByTestId('overallPerformance_summary_title')).toHaveTextContent(
        'Lost overall performance by'
      );
    });

    it('shows "Gained overall performance by" when comparison has fewer samples than baseline', () => {
      // Baseline has more samples (14940) than comparison (498)
      // This means performance was gained (comparison is better)
      const baselineWithMoreSamples = {
        totalCount: 14940,
        scaleFactor: 1,
        totalAnnualCO2Kgs: 34.5,
        totalAnnualCostUSD: 325.2726,
      };

      const comparisonWithFewerSamples = {
        totalCount: 498,
        scaleFactor: 1,
        totalAnnualCO2Kgs: 34.5,
        totalAnnualCostUSD: 325.2726,
      };

      render(
        <FramesSummary
          baseValue={baselineWithMoreSamples}
          comparisonValue={comparisonWithFewerSamples}
          isLoading={false}
        />
      );

      // Both the accordion header and summary item should show the same title
      expect(screen.getByTestId('framesSummary_performanceTitle')).toHaveTextContent(
        'Gained overall performance by'
      );
      expect(screen.getByTestId('overallPerformance_summary_title')).toHaveTextContent(
        'Gained overall performance by'
      );
    });

    it('shows "Gained overall performance by" when samples are equal (zero difference)', () => {
      // When samples are equal, percentDiffDelta should be 0, which means "Gained"
      const equalSamples = {
        totalCount: 1000,
        scaleFactor: 1,
        totalAnnualCO2Kgs: 34.5,
        totalAnnualCostUSD: 325.2726,
      };

      render(
        <FramesSummary baseValue={equalSamples} comparisonValue={equalSamples} isLoading={false} />
      );

      // Both the accordion header and summary item should show the same title
      expect(screen.getByTestId('framesSummary_performanceTitle')).toHaveTextContent(
        'Gained overall performance by'
      );
      expect(screen.getByTestId('overallPerformance_summary_title')).toHaveTextContent(
        'Gained overall performance by'
      );
    });

    it('shows "Gained/Lost overall performance by" in header when comparison value is undefined, but item is hidden', () => {
      // When comparisonValue is undefined, the overall performance item is hidden from the list
      // But the accordion header still shows "Gained/Lost" because data[0] is used before filtering
      render(
        <FramesSummary baseValue={mockBaseValue} comparisonValue={undefined} isLoading={false} />
      );

      // The accordion header shows "Gained/Lost" when comparisonValue is undefined
      expect(screen.getByTestId('framesSummary_performanceTitle')).toHaveTextContent(
        'Gained/Lost overall performance by'
      );
      // But the item itself is hidden from the summary items
      expect(screen.queryByTestId('framesSummary_item_overallPerformance')).not.toBeInTheDocument();
      expect(screen.queryByTestId('overallPerformance_summary_title')).not.toBeInTheDocument();
    });
  });
});
