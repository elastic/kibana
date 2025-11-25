/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useNavigateToServiceDetails } from './use_navigate_to_service_details';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import {
  CspInsightLeftPanelSubTab,
  EntityDetailsLeftPanelTab,
} from '../../shared/components/left_panel/left_panel_header';
import { ServiceDetailsPanelKey } from '../../service_details_left';
import { createTelemetryServiceMock } from '../../../../common/lib/telemetry/telemetry_service.mock';

jest.mock('@kbn/expandable-flyout');

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
};

const tab = EntityDetailsLeftPanelTab.RISK_INPUTS;
const subTab = CspInsightLeftPanelSubTab.MISCONFIGURATIONS;

const mockOpenLeftPanel = jest.fn();
const mockOpenFlyout = jest.fn();

describe('useNavigateToServiceDetails', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useExpandableFlyoutApi as jest.Mock).mockReturnValue({
      openLeftPanel: mockOpenLeftPanel,
      openFlyout: mockOpenFlyout,
    });
  });

  it('returns callback that opens details panel', () => {
    const { result } = renderHook(() => useNavigateToServiceDetails(mockProps));

    result.current({ tab, subTab });

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
});
