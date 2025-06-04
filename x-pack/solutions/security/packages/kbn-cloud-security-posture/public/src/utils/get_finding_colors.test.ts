/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getCvsScoreColor, getSeverityStatusColor } from './get_finding_colors';
import { EuiThemeComputed } from '@elastic/eui';

const mockEuiThemeBorealis = {
  themeName: 'borialis',
  colors: {
    severity: {
      neutral: 'neutral',
      warning: 'warning',
      risk: 'risk',
      danger: 'danger',
      unknown: 'unknown',
    },
  },
};

describe('getSeverityStatusColor', () => {
  it('should return the correct color for LOW severity', () => {
    expect(getSeverityStatusColor('LOW', mockEuiThemeBorealis as EuiThemeComputed)).toBe('neutral');
  });

  it('should return the correct color for MEDIUM severity', () => {
    expect(getSeverityStatusColor('MEDIUM', mockEuiThemeBorealis as EuiThemeComputed)).toBe(
      'warning'
    );
  });

  it('should return the correct color for HIGH severity', () => {
    expect(getSeverityStatusColor('HIGH', mockEuiThemeBorealis as EuiThemeComputed)).toBe('risk');
  });

  it('should return the correct color for CRITICAL severity', () => {
    expect(getSeverityStatusColor('CRITICAL', mockEuiThemeBorealis as EuiThemeComputed)).toBe(
      'danger'
    );
  });

  it('should return the correct color for an unknown severity', () => {
    expect(getSeverityStatusColor('UNKNOWN', mockEuiThemeBorealis as EuiThemeComputed)).toBe(
      'unknown'
    );
  });
});

describe('getCvsScoreColor', () => {
  it('returns correct color for low severity score', () => {
    expect(getCvsScoreColor(1.5, mockEuiThemeBorealis as EuiThemeComputed)).toBe('neutral');
  });

  it('returns correct color for medium severity score', () => {
    expect(getCvsScoreColor(5.5, mockEuiThemeBorealis as EuiThemeComputed)).toBe('warning');
  });

  it('returns correct color for high severity score', () => {
    expect(getCvsScoreColor(7.9, mockEuiThemeBorealis as EuiThemeComputed)).toBe('risk');
  });

  it('returns correct color for critical severity score', () => {
    expect(getCvsScoreColor(10.0, mockEuiThemeBorealis as EuiThemeComputed)).toBe('danger');
  });

  it('returns correct color for low severity score for undefined value', () => {
    expect(getCvsScoreColor(-0.2, mockEuiThemeBorealis as EuiThemeComputed)).toBe('unknown');
  });
});
