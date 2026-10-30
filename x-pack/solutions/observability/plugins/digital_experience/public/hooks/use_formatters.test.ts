/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment-timezone';
import { renderHook } from '@testing-library/react';
import { createUiSettingsMock } from '../test_utils/ui_settings_mock';
import { useFormatters } from './use_formatters';
import { useKibanaServices } from './use_kibana_services';

jest.mock('./use_kibana_services');

const renderFormatters = (settings: Record<string, string> = {}) => {
  jest.mocked(useKibanaServices).mockReturnValue({
    uiSettings: createUiSettingsMock(settings),
  } as unknown as ReturnType<typeof useKibanaServices>);
  return renderHook(() => useFormatters()).result.current;
};

describe('useFormatters', () => {
  it('formats numbers and percents with the default patterns', () => {
    const { formatNumber, formatPercent } = renderFormatters();

    expect(formatNumber(1533)).toBe('1,533');
    expect(formatPercent(0.125)).toBe('12.5%');
  });

  it('follows the patterns configured in Advanced Settings', () => {
    const { formatNumber, formatPercent } = renderFormatters({
      'format:number:defaultPattern': '0.0',
      'format:percent:defaultPattern': '0%',
    });

    expect(formatNumber(1533)).toBe('1533.0');
    expect(formatPercent(0.125)).toBe('13%');
  });

  it('formats dates with the date format in the configured time zone', () => {
    const { formatDate, timeZone } = renderFormatters({ 'dateFormat:tz': 'America/New_York' });

    expect(formatDate('2021-01-18T12:25:00.000Z')).toBe('Jan 18, 2021 @ 07:25:00.000');
    expect(timeZone).toBe('America/New_York');
  });

  it("uses the browser's time zone, by its IANA name, when Kibana follows the browser", () => {
    const { formatDate, timeZone } = renderFormatters({ 'dateFormat:tz': 'Browser' });

    expect(timeZone).toBe(moment.tz.guess());
    expect(formatDate('2021-01-18T12:25:00.000Z')).toBe(
      moment('2021-01-18T12:25:00.000Z').format('MMM D, YYYY @ HH:mm:ss.SSS')
    );
  });
});
