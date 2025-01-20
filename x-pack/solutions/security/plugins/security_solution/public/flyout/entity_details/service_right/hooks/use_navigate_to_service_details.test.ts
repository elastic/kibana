/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useNavigateToServiceDetails } from './use_navigate_to_service_details';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import {
  CspInsightLeftPanelSubTab,
  EntityDetailsLeftPanelTab,
} from '../../shared/components/left_panel/left_panel_header';
import { ServiceDetailsPanelKey } from '../../service_details_left';
import { createTelemetryServiceMock } from '../../../../common/lib/telemetry/telemetry_service.mock';
import { ServicePanelKey } from '../../shared/constants';

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
  serviceName: 'testService',
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

describe('useNavigateToServiceDetails', () => {
  describe('when preview navigation is enabled', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      (useIsExperimentalFeatureEnabled as jest.Mock).mockReturnValue(true);
      (useExpandableFlyoutApi as jest.Mock).mockReturnValue({
        openLeftPanel: mockOpenLeftPanel,
        openFlyout: mockOpenFlyout,
      });
    });

    it('returns callback that opens details panel when not in preview mode', () => {
      const { result } = renderHook(() => useNavigateToServiceDetails(mockProps));

      expect(result.current.isLinkEnabled).toBe(true);
      result.current.openDetailsPanel({ tab, subTab });

      expect(result.current.isLinkEnabled).toBe(true);
      result.current.openDetailsPanel({ tab, subTab });

      expect(mockOpenLeftPanel).toHaveBeenCalledWith({
        id: ServiceDetailsPanelKey,
        params: {
          service: {
            name: mockProps.serviceName,
          },
          scopeId: mockProps.scopeId,
          isRiskScoreExist: mockProps.isRiskScoreExist,
          path: { tab, subTab },
        },
      });
    });

    it('returns callback that opens flyout when in preview mode', () => {
      const { result } = renderHook(() =>
        useNavigateToServiceDetails({ ...mockProps, isPreviewMode: true })
      );

      expect(result.current.isLinkEnabled).toBe(true);
      result.current.openDetailsPanel({ tab, subTab });

      expect(mockOpenFlyout).toHaveBeenCalledWith({
        right: {
          id: ServicePanelKey,
          params: {
            contextID: mockProps.contextID,
            scopeId: mockProps.scopeId,
            serviceName: mockProps.serviceName,
          },
        },
        left: {
          id: ServiceDetailsPanelKey,
          params: {
            service: {
              name: mockProps.serviceName,
            },
            scopeId: mockProps.scopeId,
            isRiskScoreExist: mockProps.isRiskScoreExist,
            path: { tab, subTab },
          },
        },
      });
      expect(mockOpenLeftPanel).not.toHaveBeenCalled();
    });
  });

  describe('when preview navigation is disabled', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      (useIsExperimentalFeatureEnabled as jest.Mock).mockReturnValue(false);
      (useExpandableFlyoutApi as jest.Mock).mockReturnValue({
        openLeftPanel: mockOpenLeftPanel,
        openFlyout: mockOpenFlyout,
      });
    });

    it('returns callback that opens details panel when not in preview mode', () => {
      const { result } = renderHook(() => useNavigateToServiceDetails(mockProps));

      expect(result.current.isLinkEnabled).toBe(true);
      result.current.openDetailsPanel({ tab, subTab });

      expect(mockOpenLeftPanel).toHaveBeenCalledWith({
        id: ServiceDetailsPanelKey,
        params: {
          service: {
            name: mockProps.serviceName,
          },
          scopeId: mockProps.scopeId,
          isRiskScoreExist: mockProps.isRiskScoreExist,
          path: { tab, subTab },
        },
      });
      expect(mockOpenFlyout).not.toHaveBeenCalled();
    });

    it('returns empty callback and isLinkEnabled is false when in preview mode', () => {
      const { result } = renderHook(() =>
        useNavigateToServiceDetails({ ...mockProps, isPreviewMode: true })
      );

      expect(result.current.isLinkEnabled).toBe(false);
      result.current.openDetailsPanel({ tab, subTab });

      expect(mockOpenLeftPanel).not.toHaveBeenCalled();
      expect(mockOpenFlyout).not.toHaveBeenCalled();
    });
  });
});
