/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { EntityType } from '../../../common/entity_analytics/types';
import { useRiskContributingAlerts } from './use_risk_contributing_alerts';
import { useQueryAlerts } from '../../detections/containers/detection_engine/alerts/use_query';
import { useAlertsPrivileges } from '../../detections/containers/detection_engine/alerts/use_alerts_privileges';
import {
  buildExecutionContext,
  EA_EXECUTION_CONTEXT_NAMES,
} from '../../common/utils/execution_context';

jest.mock('../../detections/containers/detection_engine/alerts/use_query');
jest.mock('../../detections/containers/detection_engine/alerts/use_alerts_privileges');

const mockUseQueryAlerts = useQueryAlerts as jest.Mock;
const mockUseAlertsPrivileges = useAlertsPrivileges as jest.Mock;

describe('useRiskContributingAlerts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAlertsPrivileges.mockReturnValue({ hasAlertsRead: true });
    mockUseQueryAlerts.mockReturnValue({ loading: false, data: undefined, setQuery: jest.fn() });
  });

  it('forwards the caller-supplied executionContext to useQueryAlerts', () => {
    const executionContext = buildExecutionContext(
      EA_EXECUTION_CONTEXT_NAMES.ENTITY_DETAILS_FLYOUT,
      'risk_inputs_alerts'
    );

    renderHook(() =>
      useRiskContributingAlerts({
        riskScore: undefined,
        entityType: EntityType.host,
        executionContext,
      })
    );

    expect(mockUseQueryAlerts).toHaveBeenCalledWith(
      expect.objectContaining({
        executionContext: {
          child: {
            type: 'security_solution',
            name: 'entity_analytics:entity_details_flyout',
            id: 'risk_inputs_alerts',
          },
        },
      })
    );
  });

  it('passes no executionContext to useQueryAlerts when the caller does not supply one', () => {
    renderHook(() =>
      useRiskContributingAlerts({ riskScore: undefined, entityType: EntityType.host })
    );

    const [queryArgs] = mockUseQueryAlerts.mock.calls[0];
    expect(queryArgs.executionContext).toBeUndefined();
  });
});
