/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getCvsScoreColor, getSeverityStatusColor, SEVERITY_COLOR } from './get_finding_colors';
import { EuiThemeComputed } from '@elastic/eui';

const mockEuiThemeBorealis = {
  themeName: 'borialis',
};

describe('getSeverityStatusColor', () => {
  it('should return the correct color for LOW severity', () => {
    expect(getSeverityStatusColor('LOW', mockEuiThemeBorealis as EuiThemeComputed)).toBe(
      SEVERITY_COLOR.low
    );
  });

  it('should return the correct color for MEDIUM severity', () => {
    expect(getSeverityStatusColor('MEDIUM', mockEuiThemeBorealis as EuiThemeComputed)).toBe(
      SEVERITY_COLOR.medium
    );
  });

  it('should return the correct color for HIGH severity', () => {
    expect(getSeverityStatusColor('HIGH', mockEuiThemeBorealis as EuiThemeComputed)).toBe(
      SEVERITY_COLOR.high
    );
  });

  it('should return the correct color for CRITICAL severity', () => {
    expect(getSeverityStatusColor('CRITICAL', mockEuiThemeBorealis as EuiThemeComputed)).toBe(
      SEVERITY_COLOR.critical
    );
  });

  it('should return the correct color for an unknown severity', () => {
    expect(getSeverityStatusColor('UNKNOWN', mockEuiThemeBorealis as EuiThemeComputed)).toBe(
      SEVERITY_COLOR.unknown
    );
  });
});

describe('getCvsScoreColor', () => {
  it('returns correct color for low severity score', () => {
    expect(getCvsScoreColor(1.5, mockEuiThemeBorealis as EuiThemeComputed)).toBe(
      SEVERITY_COLOR.low
    );
  });

  it('returns correct color for medium severity score', () => {
    expect(getCvsScoreColor(5.5, mockEuiThemeBorealis as EuiThemeComputed)).toBe(
      SEVERITY_COLOR.medium
    );
  });

  it('returns correct color for high severity score', () => {
    expect(getCvsScoreColor(7.9, mockEuiThemeBorealis as EuiThemeComputed)).toBe(
      SEVERITY_COLOR.high
    );
  });

  it('returns correct color for critical severity score', () => {
    expect(getCvsScoreColor(10.0, mockEuiThemeBorealis as EuiThemeComputed)).toBe(
      SEVERITY_COLOR.critical
    );
  });

  it('returns correct color for low severity score for undefined value', () => {
    expect(getCvsScoreColor(-0.2, mockEuiThemeBorealis as EuiThemeComputed)).toBe(
      SEVERITY_COLOR.unknown
    );
  });
});
