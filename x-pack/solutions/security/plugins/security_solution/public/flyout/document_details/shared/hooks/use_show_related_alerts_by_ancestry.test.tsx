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
import { licenseService } from '../../../../common/hooks/use_license';
import type { SearchHit } from '../../../../../common/search_strategy';
import { useIsAnalyzerEnabled } from '../../../../detections/hooks/use_is_analyzer_enabled';

jest.mock('../../../../common/hooks/use_license', () => {
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
jest.mock('../../../../detections/hooks/use_is_analyzer_enabled');
const licenseServiceMock = licenseService as jest.Mocked<typeof licenseService>;
const eventId = 'event-id';
const searchHit = {
  _id: '1',
  _index: 'index',
  _source: {},
} as unknown as SearchHit;

describe('useShowRelatedAlertsByAncestry', () => {
  let hookResult: RenderHookResult<
    UseShowRelatedAlertsByAncestryResult,
    UseShowRelatedAlertsByAncestryParams
  >;

  it('should return false if Process Entity Info is not available', () => {
    (useIsAnalyzerEnabled as jest.Mock).mockReturnValue(false);
    licenseServiceMock.isPlatinumPlus.mockReturnValue(true);
    const getFieldsData = () => null;
    hookResult = renderHook(() =>
      useShowRelatedAlertsByAncestry({
        getFieldsData,
        searchHit,
        eventId,
        isRulePreview: false,
      })
    );

    expect(hookResult.result.current).toEqual({
      show: false,
      documentId: 'event-id',
    });
  });

  it(`should return false if license is lower than platinum`, () => {
    licenseServiceMock.isPlatinumPlus.mockReturnValue(false);
    const getFieldsData = () => 'value';
    hookResult = renderHook(() =>
      useShowRelatedAlertsByAncestry({
        getFieldsData,
        searchHit,
        eventId,
        isRulePreview: false,
      })
    );

    expect(hookResult.result.current).toEqual({
      show: false,
      documentId: 'event-id',
    });
  });

  it('should return true and event id as document id by default ', () => {
    (useIsAnalyzerEnabled as jest.Mock).mockReturnValue(true);
    licenseServiceMock.isPlatinumPlus.mockReturnValue(true);
    const getFieldsData = () => 'ancestors-id';
    hookResult = renderHook(() =>
      useShowRelatedAlertsByAncestry({
        getFieldsData,
        searchHit,
        eventId,
        isRulePreview: false,
      })
    );

    expect(hookResult.result.current).toEqual({
      show: true,
      documentId: 'event-id',
    });
  });

  it('should return true and ancestor id as document id if flyout is open in preview', () => {
    (useIsAnalyzerEnabled as jest.Mock).mockReturnValue(true);
    licenseServiceMock.isPlatinumPlus.mockReturnValue(true);
    const getFieldsData = () => 'ancestors-id';
    hookResult = renderHook(() =>
      useShowRelatedAlertsByAncestry({
        getFieldsData,
        searchHit,
        eventId,
        isRulePreview: true,
      })
    );

    expect(hookResult.result.current).toEqual({
      show: true,
      documentId: 'ancestors-id',
    });
  });
});
