/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiThemeComputed } from '@elastic/eui';

import { getExecutionStatusHealthColor, getExecutionStatusLabel } from './execution_status';

const mockEuiTheme = {
  colors: {
    success: 'success',
    danger: 'danger',
    warning: 'warning',
  },
} as unknown as EuiThemeComputed;

describe('Execution Status Utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getExecutionStatusHealthColor', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should return `success` color for the `active` status', () => {
      const result = getExecutionStatusHealthColor('active', mockEuiTheme);
      expect(result).toEqual('success');
    });

    it('should return `success` color for the `ok` status', () => {
      const result = getExecutionStatusHealthColor('ok', mockEuiTheme);
      expect(result).toEqual('success');
    });

    it('should return `danger` color for the `error` status', () => {
      const result = getExecutionStatusHealthColor('error', mockEuiTheme);
      expect(result).toEqual('danger');
    });

    it('should return `warning` color for the `warning` status', () => {
      const result = getExecutionStatusHealthColor('warning', mockEuiTheme);
      expect(result).toEqual('warning');
    });

    it('should return `subdued` color for the unknown status', () => {
      const result = getExecutionStatusHealthColor('unknown', mockEuiTheme);
      expect(result).toEqual('subdued');
    });
  });

  describe('getExecutionStatusLabel', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should return `Success` label for the `active` status', () => {
      const result = getExecutionStatusLabel('active');
      expect(result).toEqual('Success');
    });

    it('should return `Success` label for the `ok` status', () => {
      const result = getExecutionStatusLabel('ok');
      expect(result).toEqual('Success');
    });

    it('should return `Failed` label for the `error` status', () => {
      const result = getExecutionStatusLabel('error');
      expect(result).toEqual('Failed');
    });

    it('should return `Warning` label for the `warning` status', () => {
      const result = getExecutionStatusLabel('warning');
      expect(result).toEqual('Warning');
    });

    it('should return `Unknown` label for the unknown status', () => {
      const result = getExecutionStatusLabel('unknown');
      expect(result).toEqual('Unknown');
    });
  });
});
