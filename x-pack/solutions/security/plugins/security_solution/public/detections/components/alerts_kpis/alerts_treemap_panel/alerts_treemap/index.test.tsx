/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import { Settings } from '@elastic/charts';
import React from 'react';

import { TestProviders } from '../../../../../common/mock';
import {
  mockAlertSearchResponse,
  mockNoDataAlertSearchResponse,
  mockNoStackByField1Response,
  mockOnlyStackByField0Response,
} from './lib/mocks/mock_alert_search_response';
import * as i18n from './translations';
import type { Props } from '.';
import { AlertsTreemap } from '.';

const defaultProps: Props = {
  data: mockAlertSearchResponse,
  maxBuckets: 1000,
  minChartHeight: 370,
  stackByField0: 'kibana.alert.rule.name',
  stackByField1: 'host.name',
};

jest.mock('@elastic/charts', () => {
  const actual = jest.requireActual('@elastic/charts');
  return {
    ...actual,
    Settings: jest.fn().mockReturnValue(null),
  };
});

describe('AlertsTreemap', () => {
  describe('when the response has data', () => {
    beforeEach(() => {
      jest.clearAllMocks();

      render(
        <TestProviders>
          <AlertsTreemap {...defaultProps} />
        </TestProviders>
      );
    });

    test('it renders the treemap', () => {
      expect(screen.getByTestId('alerts-treemap').querySelector('.echChart')).toBeInTheDocument();
    });

    test('it renders the legend with the expected overflow-y style', () => {
      expect(screen.getByTestId('draggable-legend')).toHaveClass('eui-yScroll');
    });

    test('it uses a theme with the expected `minFontSize` to show more labels at various screen resolutions', () => {
      expect((Settings as jest.Mock).mock.calls[0][0].theme[0].partition.minFontSize).toEqual(4);
    });
  });

  describe('when the response does NOT have data', () => {
    beforeEach(() => {
      render(
        <TestProviders>
          <AlertsTreemap {...defaultProps} data={mockNoDataAlertSearchResponse} />
        </TestProviders>
      );
    });

    test('it does NOT render the treemap', () => {
      expect(screen.queryByTestId('alerts-treemap')).not.toBeInTheDocument();
    });

    test('it does NOT render the legend', () => {
      expect(screen.queryByTestId('draggable-legend')).not.toBeInTheDocument();
    });

    test('it renders the "no data" message', () => {
      expect(screen.getByText(i18n.NO_DATA_LABEL)).toBeInTheDocument();
    });
  });

  describe('when the user has specified a `stackByField1`, and the response has data for `stackByField0`, but `stackByField1` is not present in the response', () => {
    const stackByField1 = 'Ransomware.version'; // this non-ECS field is requested

    beforeEach(() => {
      render(
        <TestProviders>
          <AlertsTreemap
            {...defaultProps}
            stackByField1={stackByField1}
            data={mockNoStackByField1Response} // the response has values for stackByField0, but does NOT contain values for Ransomware.version
          />
        </TestProviders>
      );
    });

    test('it renders the "no data" message', () => {
      expect(screen.getByText(i18n.NO_DATA_LABEL)).toBeInTheDocument();
    });

    test('it renders an additional reason label with the `stackByField1` field', () => {
      expect(screen.getByText(i18n.NO_DATA_REASON_LABEL(stackByField1))).toBeInTheDocument();
    });

    test('it still renders the legend, because we have values for stackByField0', () => {
      expect(screen.getByTestId('draggable-legend')).toBeInTheDocument();
    });
  });

  describe('when the user has NOT specified a `stackByField1`, and the response has data for `stackByField0`', () => {
    const stackByField1 = ''; // the user has NOT specified a `stackByField1`

    beforeEach(() => {
      render(
        <TestProviders>
          <AlertsTreemap
            {...defaultProps}
            stackByField1={stackByField1}
            data={mockOnlyStackByField0Response} // the response has values for stackByField0, but stackByField1 was NOT requested
          />
        </TestProviders>
      );
    });

    test('it renders the treemap', () => {
      expect(screen.getByTestId('alerts-treemap').querySelector('.echChart')).toBeInTheDocument();
    });

    test('it does NOT render the "no data" message', () => {
      expect(screen.queryByText(i18n.NO_DATA_LABEL)).not.toBeInTheDocument();
    });

    test('it does NOT render an additional reason label with the `stackByField1` field, which was not requested', () => {
      expect(screen.queryByText(i18n.NO_DATA_REASON_LABEL(stackByField1))).not.toBeInTheDocument();
    });

    test('it renders the legend, because we have values for stackByField0', () => {
      expect(screen.getByTestId('draggable-legend')).toBeInTheDocument();
    });
  });
});
