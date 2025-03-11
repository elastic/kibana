/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import {
  AlertMonitorStatusComponent,
  AlertMonitorStatusProps,
  hasFilters,
} from './alert_monitor_status';
import { render } from '../../../../lib/helper/rtl_helpers';

describe('alert monitor status component', () => {
  jest.setTimeout(10_000);

  describe('hasFilters', () => {
    const EMPTY_FILTERS = {
      tags: [],
      'url.port': [],
      'observer.geo.name': [],
      'monitor.type': [],
    };

    it('returns false when filters are empty', () => {
      expect(hasFilters({})).toBe(false);
    });

    it('returns false when all fields are empty', () => {
      expect(hasFilters(EMPTY_FILTERS)).toBe(false);
    });

    it.each([
      { tags: ['prod'] },
      { 'url.port': ['5678'] },
      { 'observer.geo.name': ['Fairbanks'] },
      { 'monitor.type': ['HTTP'] },
    ])('returns true if a filter has a field', (testObj) => {
      expect(
        hasFilters({
          ...EMPTY_FILTERS,
          ...testObj,
        })
      ).toBe(true);
    });
  });

  describe('AlertMonitorStatus', () => {
    const defaultProps: AlertMonitorStatusProps = {
      ruleParams: {
        numTimes: 3,
        search: 'monitor.id: foo',
        timerangeUnit: 'h',
        timerangeCount: 21,
      },
      enabled: true,
      isOldAlert: true,
      snapshotCount: 0,
      snapshotLoading: false,
      numTimes: 14,
      setRuleParams: jest.fn(),
      timerange: { from: 'now-12h', to: 'now' },
    };

    it('passes default props to children', async () => {
      render(<AlertMonitorStatusComponent {...defaultProps} />);

      expect(
        await screen.findByText('This alert will apply to approximately 0 monitors.')
      ).toBeInTheDocument();
      expect(await screen.findByText('Add filter')).toBeInTheDocument();
      expect(await screen.findByText('Availability')).toBeInTheDocument();
      expect(await screen.findByText('Status check')).toBeInTheDocument();
      expect(await screen.findByText('any monitor is up in')).toBeInTheDocument();
      expect(await screen.findByText('days')).toBeInTheDocument();
      expect(await screen.findByText('hours')).toBeInTheDocument();
      expect(await screen.findByText('within the last')).toBeInTheDocument();
    });
  });
});
