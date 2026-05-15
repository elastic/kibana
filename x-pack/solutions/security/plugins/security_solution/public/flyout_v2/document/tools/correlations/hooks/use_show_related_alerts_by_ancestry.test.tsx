/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RenderHookResult } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import type {
  UseShowRelatedAlertsByAncestryParams,
  UseShowRelatedAlertsByAncestryResult,
} from './use_show_related_alerts_by_ancestry';
import { useShowRelatedAlertsByAncestry } from './use_show_related_alerts_by_ancestry';
import { licenseService } from '../../../../../common/hooks/use_license';
import type { DataTableRecord } from '@kbn/discover-utils';
import { ALERT_ANCESTORS_ID } from '../../../../../../common/field_maps/field_names';
import { useIsAnalyzerEnabled } from '../../../../../detections/hooks/use_is_analyzer_enabled';

jest.mock('../../../../../common/hooks/use_license', () => {
  const licenseServiceInstance = {
    isPlatinumPlus: jest.fn(),
  };
  return {
    licenseService: licenseServiceInstance,
    useLicense: () => {
      return licenseServiceInstance;
    },
  };
});
jest.mock('../../../../../detections/hooks/use_is_analyzer_enabled');
const licenseServiceMock = licenseService as jest.Mocked<typeof licenseService>;

const hitWithoutAncestors: DataTableRecord = {
  id: 'event-id',
  raw: { _id: 'event-id', _index: 'index' },
  flattened: {},
  isAnchor: false,
} as unknown as DataTableRecord;

const hitWithAncestors: DataTableRecord = {
  id: 'event-id',
  raw: { _id: 'event-id', _index: 'index' },
  flattened: { [ALERT_ANCESTORS_ID]: 'ancestors-id' },
  isAnchor: false,
} as unknown as DataTableRecord;

describe('useShowRelatedAlertsByAncestry', () => {
  let hookResult: RenderHookResult<
    UseShowRelatedAlertsByAncestryResult,
    UseShowRelatedAlertsByAncestryParams
  >;

  it('should return false if Process Entity Info is not available', () => {
    (useIsAnalyzerEnabled as jest.Mock).mockReturnValue(false);
    licenseServiceMock.isPlatinumPlus.mockReturnValue(true);
    hookResult = renderHook(() =>
      useShowRelatedAlertsByAncestry({
        hit: hitWithoutAncestors,
        isRulePreview: false,
      })
    );

    expect(hookResult.result.current).toEqual({
      show: false,
      ancestryDocumentId: 'event-id',
    });
  });

  it(`should return false if license is lower than platinum`, () => {
    licenseServiceMock.isPlatinumPlus.mockReturnValue(false);
    hookResult = renderHook(() =>
      useShowRelatedAlertsByAncestry({
        hit: hitWithAncestors,
        isRulePreview: false,
      })
    );

    expect(hookResult.result.current).toEqual({
      show: false,
      ancestryDocumentId: 'event-id',
    });
  });

  it('should return true and event id as document id by default ', () => {
    (useIsAnalyzerEnabled as jest.Mock).mockReturnValue(true);
    licenseServiceMock.isPlatinumPlus.mockReturnValue(true);
    hookResult = renderHook(() =>
      useShowRelatedAlertsByAncestry({
        hit: hitWithAncestors,
        isRulePreview: false,
      })
    );

    expect(hookResult.result.current).toEqual({
      show: true,
      ancestryDocumentId: 'event-id',
    });
  });

  it('should return true and ancestor id as document id if flyout is open in preview', () => {
    (useIsAnalyzerEnabled as jest.Mock).mockReturnValue(true);
    licenseServiceMock.isPlatinumPlus.mockReturnValue(true);
    hookResult = renderHook(() =>
      useShowRelatedAlertsByAncestry({
        hit: hitWithAncestors,
        isRulePreview: true,
      })
    );

    expect(hookResult.result.current).toEqual({
      show: true,
      ancestryDocumentId: 'ancestors-id',
    });
  });
});
