/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataTableRecord } from '@kbn/discover-utils';
import { getTimelineRowTypeIndicator } from './get_row_indicator';
import type { EuiThemeComputed } from '@elastic/eui';

const mockEuiTheme = {
  colors: {
    primary: 'primary',
    accent: 'accent',
    warning: 'warning',
    lightShade: 'lightShade',
  },
} as EuiThemeComputed;

describe('getTimelineRowTypeIndicator', () => {
  describe('Alert', () => {
    it('should return correct label and color for EQL Event', () => {
      const row = {
        flattened: {
          'event.kind': 'signal',
          'eql.parentId': '123',
          'eql.sequenceNumber': '1-3',
        },
      } as unknown as DataTableRecord;
      const rowIndicator = getTimelineRowTypeIndicator(row, mockEuiTheme);
      expect(rowIndicator).toEqual({
        color: 'accent',
        label: 'EQL Sequence',
      });
    });
    it('should return correct label and color for non-EQL Event', () => {
      const row = {
        flattened: {
          'event.kind': 'signal',
        },
      } as unknown as DataTableRecord;
      const rowIndicator = getTimelineRowTypeIndicator(row, mockEuiTheme);
      expect(rowIndicator).toEqual({
        color: 'warning',
        label: 'Alert',
      });
    });
  });

  describe('Event', () => {
    it('should return correct label and color for EQL Event', () => {
      const row = {
        flattened: {
          'eql.parentId': '123',
          'eql.sequenceNumber': '1-3',
        },
      } as unknown as DataTableRecord;
      const rowIndicator = getTimelineRowTypeIndicator(row, mockEuiTheme);
      expect(rowIndicator).toEqual({
        color: 'accent',
        label: 'EQL Sequence',
      });
    });
    it('should return correct label and color for non-EQL Event', () => {
      const row = {
        flattened: {},
      } as unknown as DataTableRecord;
      const rowIndicator = getTimelineRowTypeIndicator(row, mockEuiTheme);
      expect(rowIndicator).toMatchObject({
        color: 'lightShade',
        label: 'Event',
      });
    });
  });

  describe('EQL Event Type', () => {
    it('should return correct label and color for Even EQL Sequence', () => {
      const row = {
        flattened: {
          'eql.parentId': '123',
          'eql.sequenceNumber': '2-4',
        },
      } as unknown as DataTableRecord;
      const rowIndicator = getTimelineRowTypeIndicator(row, mockEuiTheme);
      expect(rowIndicator).toEqual({
        color: 'primary',
        label: 'EQL Sequence',
      });
    });
    it('should return correct label and color for Non-Even EQL Sequence', () => {
      const row = {
        flattened: {
          'eql.parentId': '123',
          'eql.sequenceNumber': '1-4',
        },
      } as unknown as DataTableRecord;
      const rowIndicator = getTimelineRowTypeIndicator(row, mockEuiTheme);
      expect(rowIndicator).toEqual({
        color: 'accent',
        label: 'EQL Sequence',
      });
    });
  });
});
