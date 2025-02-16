/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useNavigateToUserDetails } from './use_navigate_to_user_details';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import {
  CspInsightLeftPanelSubTab,
  EntityDetailsLeftPanelTab,
} from '../../shared/components/left_panel/left_panel_header';
import { UserDetailsPanelKey } from '../../user_details_left';
import { createTelemetryServiceMock } from '../../../../common/lib/telemetry/telemetry_service.mock';
import { UserPanelKey } from '../../shared/constants';

jest.mock('@kbn/expandable-flyout');
jest.mock('../../../../common/hooks/use_experimental_features');

const mockedTelemetry = createTelemetryServiceMock();
jest.mock('../../../../common/lib/kibana', () => {
  const original = jest.requireActual('../../../../common/lib/kibana');
  return {
    ...original,
    useKibana: () => ({
      ...original.useKibana(),
      services: {
        ...original.useKibana().services,
        telemetry: mockedTelemetry,
      },
    }),
  };
});

const mockProps = {
  userName: 'testUser',
  scopeId: 'testScopeId',
  isRiskScoreExist: false,
  hasMisconfigurationFindings: false,
  hasNonClosedAlerts: false,
  contextID: 'testContextID',
  isPreviewMode: false,
  email: ['test@test.com'],
};

const tab = EntityDetailsLeftPanelTab.RISK_INPUTS;
const subTab = CspInsightLeftPanelSubTab.MISCONFIGURATIONS;

const mockOpenLeftPanel = jest.fn();
const mockOpenFlyout = jest.fn();

describe('useNavigateToUserDetails', () => {
  describe('when newExpandableFlyoutNavigationDisabled is false', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      (useIsExperimentalFeatureEnabled as jest.Mock).mockReturnValue(false);
      (useExpandableFlyoutApi as jest.Mock).mockReturnValue({
        openLeftPanel: mockOpenLeftPanel,
        openFlyout: mockOpenFlyout,
      });
    });

    it('returns callback that opens details panel when not in preview mode', () => {
      const { result } = renderHook(() => useNavigateToUserDetails(mockProps));

      expect(result.current.isLinkEnabled).toBe(true);
      result.current.openDetailsPanel({ tab, subTab });

      expect(result.current.isLinkEnabled).toBe(true);
      result.current.openDetailsPanel({ tab, subTab });

      expect(mockOpenLeftPanel).toHaveBeenCalledWith({
        id: UserDetailsPanelKey,
        params: {
          user: {
            name: mockProps.userName,
            email: mockProps.email,
          },
          scopeId: mockProps.scopeId,
          isRiskScoreExist: mockProps.isRiskScoreExist,
          path: { tab, subTab },
          hasMisconfigurationFindings: mockProps.hasMisconfigurationFindings,
          hasNonClosedAlerts: mockProps.hasNonClosedAlerts,
        },
      });
    });

    it('returns callback that opens flyout when in preview mode', () => {
      const { result } = renderHook(() =>
        useNavigateToUserDetails({ ...mockProps, isPreviewMode: true })
      );

      expect(result.current.isLinkEnabled).toBe(true);
      result.current.openDetailsPanel({ tab, subTab });

      expect(mockOpenFlyout).toHaveBeenCalledWith({
        right: {
          id: UserPanelKey,
          params: {
            contextID: mockProps.contextID,
            scopeId: mockProps.scopeId,
            userName: mockProps.userName,
          },
        },
        left: {
          id: UserDetailsPanelKey,
          params: {
            user: {
              name: mockProps.userName,
              email: mockProps.email,
            },
            scopeId: mockProps.scopeId,
            isRiskScoreExist: mockProps.isRiskScoreExist,
            path: { tab, subTab },
            hasMisconfigurationFindings: mockProps.hasMisconfigurationFindings,
            hasNonClosedAlerts: mockProps.hasNonClosedAlerts,
          },
        },
      });
      expect(mockOpenLeftPanel).not.toHaveBeenCalled();
    });
  });

  describe('when newExpandableFlyoutNavigationDisabled is true', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      (useIsExperimentalFeatureEnabled as jest.Mock).mockReturnValue(true);
      (useExpandableFlyoutApi as jest.Mock).mockReturnValue({
        openLeftPanel: mockOpenLeftPanel,
        openFlyout: mockOpenFlyout,
      });
    });

    it('returns callback that opens details panel when not in preview mode', () => {
      const { result } = renderHook(() => useNavigateToUserDetails(mockProps));

      expect(result.current.isLinkEnabled).toBe(true);
      result.current.openDetailsPanel({ tab, subTab });

      expect(mockOpenLeftPanel).toHaveBeenCalledWith({
        id: UserDetailsPanelKey,
        params: {
          user: {
            name: mockProps.userName,
            email: mockProps.email,
          },
          scopeId: mockProps.scopeId,
          isRiskScoreExist: mockProps.isRiskScoreExist,
          path: { tab, subTab },
          hasMisconfigurationFindings: mockProps.hasMisconfigurationFindings,
          hasNonClosedAlerts: mockProps.hasNonClosedAlerts,
        },
      });
      expect(mockOpenFlyout).not.toHaveBeenCalled();
    });

    it('returns empty callback and isLinkEnabled is false when in preview mode', () => {
      const { result } = renderHook(() =>
        useNavigateToUserDetails({ ...mockProps, isPreviewMode: true })
      );

      expect(result.current.isLinkEnabled).toBe(false);
      result.current.openDetailsPanel({ tab, subTab });

      expect(mockOpenLeftPanel).not.toHaveBeenCalled();
      expect(mockOpenFlyout).not.toHaveBeenCalled();
    });
  });
});
