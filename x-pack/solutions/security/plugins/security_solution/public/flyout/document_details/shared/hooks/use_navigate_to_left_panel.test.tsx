/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useNavigateToLeftPanel } from './use_navigate_to_left_panel';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { renderHook } from '@testing-library/react';
import { useDocumentDetailsContext } from '../context';
import { mockFlyoutApi } from '../mocks/mock_flyout_context';
import { DocumentDetailsRightPanelKey, DocumentDetailsLeftPanelKey } from '../constants/panel_keys';
import { useKibana as mockUseKibana } from '../../../../common/lib/kibana/__mocks__';
import { useKibana } from '../../../../common/lib/kibana';

const mockUseIsExperimentalFeatureEnabled = useIsExperimentalFeatureEnabled as jest.Mock;
jest.mock('../../../../common/hooks/use_experimental_features');

jest.mock('../../../../common/lib/kibana');

const mockedUseKibana = mockUseKibana();
(useKibana as jest.Mock).mockReturnValue(mockedUseKibana);

jest.mock('@kbn/expandable-flyout');
jest.mock('../context');

const eventId = 'eventId';
const indexName = 'indexName';
const scopeId = 'scopeId';

describe('useNavigateToLeftPanel', () => {
  describe('newExpandableFlyoutNavigationDisabled is true', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      mockUseIsExperimentalFeatureEnabled.mockReturnValue(true);
      jest.mocked(useExpandableFlyoutApi).mockReturnValue(mockFlyoutApi);
    });

    it('should enable navigation if isPreviewMode is false', () => {
      (useDocumentDetailsContext as jest.Mock).mockReturnValue({
        eventId,
        indexName,
        scopeId,
        isPreviewMode: false,
      });
      const hookResult = renderHook(() => useNavigateToLeftPanel({ tab: 'tab', subTab: 'subTab' }));
      expect(hookResult.result.current.isEnabled).toEqual(true);

      hookResult.result.current.navigateToLeftPanel();

      expect(mockFlyoutApi.openLeftPanel).toHaveBeenCalledWith({
        id: DocumentDetailsLeftPanelKey,
        path: {
          tab: 'tab',
          subTab: 'subTab',
        },
        params: {
          id: eventId,
          indexName,
          scopeId,
        },
      });
      expect(mockFlyoutApi.openFlyout).not.toHaveBeenCalled();
    });

    it('should disable navigation if isPreviewMode is true', () => {
      (useDocumentDetailsContext as jest.Mock).mockReturnValue({
        eventId,
        indexName,
        scopeId,
        isPreviewMode: true,
      });

      const hookResult = renderHook(() => useNavigateToLeftPanel({ tab: 'tab', subTab: 'subTab' }));
      expect(hookResult.result.current.isEnabled).toEqual(false);

      hookResult.result.current.navigateToLeftPanel();

      expect(mockFlyoutApi.openLeftPanel).not.toHaveBeenCalled();
      expect(mockFlyoutApi.openFlyout).not.toHaveBeenCalled();
    });
  });

  describe('newExpandableFlyoutNavigationDisabled is false', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      mockUseIsExperimentalFeatureEnabled.mockReturnValue(false);
    });

    it('should enable navigation if isPreviewMode is false', () => {
      (useDocumentDetailsContext as jest.Mock).mockReturnValue({
        eventId,
        indexName,
        scopeId,
        isPreviewMode: false,
      });
      const hookResult = renderHook(() => useNavigateToLeftPanel({ tab: 'tab', subTab: 'subTab' }));
      expect(hookResult.result.current.isEnabled).toEqual(true);

      hookResult.result.current.navigateToLeftPanel();

      expect(mockFlyoutApi.openLeftPanel).toHaveBeenCalledWith({
        id: DocumentDetailsLeftPanelKey,
        path: {
          tab: 'tab',
          subTab: 'subTab',
        },
        params: {
          id: eventId,
          indexName,
          scopeId,
        },
      });
      expect(mockFlyoutApi.openFlyout).not.toHaveBeenCalled();
    });

    it('should open new flyout if isPreviewMode is true', () => {
      (useDocumentDetailsContext as jest.Mock).mockReturnValue({
        eventId,
        indexName,
        scopeId,
        isPreviewMode: true,
      });
      const hookResult = renderHook(() => useNavigateToLeftPanel({ tab: 'tab', subTab: 'subTab' }));
      expect(hookResult.result.current.isEnabled).toEqual(true);

      hookResult.result.current.navigateToLeftPanel();

      expect(mockFlyoutApi.openLeftPanel).not.toHaveBeenCalled();
      expect(mockFlyoutApi.openFlyout).toHaveBeenCalledWith({
        right: {
          id: DocumentDetailsRightPanelKey,
          params: {
            id: eventId,
            indexName,
            scopeId,
          },
        },
        left: {
          id: DocumentDetailsLeftPanelKey,
          path: {
            tab: 'tab',
            subTab: 'subTab',
          },
          params: {
            id: eventId,
            indexName,
            scopeId,
          },
        },
      });
    });
  });
});
