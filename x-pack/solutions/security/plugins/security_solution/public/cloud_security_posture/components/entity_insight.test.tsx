/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import React from 'react';
import { render } from '@testing-library/react';
import { EntityInsight } from './entity_insight';
import { TestProviders } from '../../common/mock/test_providers';
import { EntityIdentifierFields } from '../../../common/entity_analytics/types';
import { useNonClosedAlerts } from '../hooks/use_non_closed_alerts';
import {
  ENTITY_ANALYTICS_TABLE_ID,
  ENTITY_ANALYTICS_ALERTS_FROM,
  ENTITY_ANALYTICS_ALERTS_TO,
} from '../../entity_analytics/components/home/constants';

vi.mock('@kbn/entity-store/public', async () => {
      const mocked = {
      ...(await vi.importActual('@kbn/entity-store/public')),
      useEntityStoreEuidApi: vi.fn().mockReturnValue({ euid: null }),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('@kbn/cloud-security-posture/src/hooks/use_has_misconfigurations', () => {
      const mocked = {
      useHasMisconfigurations: vi.fn().mockReturnValue({
        hasMisconfigurationFindings: false,
        passedFindings: 0,
        failedFindings: 0,
      }),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('@kbn/cloud-security-posture/src/hooks/use_has_vulnerabilities', () => {
      const mocked = {
      useHasVulnerabilities: vi.fn().mockReturnValue({ hasVulnerabilitiesFindings: false }),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../common/containers/use_global_time', () => {
      const mocked = {
      useGlobalTime: vi.fn().mockReturnValue({ to: '2023-01-01', from: '2022-01-01' }),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../hooks/use_non_closed_alerts', () => {
      const mocked = {
      useNonClosedAlerts: vi
        .fn()
        .mockReturnValue({ hasNonClosedAlerts: false, filteredAlertsData: null }),
    };
      return { ...mocked, default: mocked };
    });

describe('EntityInsight', () => {
  const defaultProps = {
    identityFields: { [EntityIdentifierFields.hostName]: 'my-host' },
    isPreviewMode: false,
    openDetailsPanel: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('time range', () => {
    const renderWithScopeId = (scopeId?: string) =>
      render(
        <TestProviders>
          <EntityInsight {...defaultProps} scopeId={scopeId} />
        </TestProviders>
      );

    it('uses the global time range when no scopeId is provided', () => {
      renderWithScopeId();

      expect(useNonClosedAlerts).toHaveBeenCalledWith(
        expect.objectContaining({ from: '2022-01-01', to: '2023-01-01' })
      );
    });

    it('uses the scope time-range override for the EA homepage scope', () => {
      renderWithScopeId(ENTITY_ANALYTICS_TABLE_ID);

      expect(useNonClosedAlerts).toHaveBeenCalledWith(
        expect.objectContaining({
          from: ENTITY_ANALYTICS_ALERTS_FROM,
          to: ENTITY_ANALYTICS_ALERTS_TO,
        })
      );
    });

    it('falls back to the global time range for an unregistered scopeId', () => {
      renderWithScopeId('some-other-scope');

      expect(useNonClosedAlerts).toHaveBeenCalledWith(
        expect.objectContaining({ from: '2022-01-01', to: '2023-01-01' })
      );
    });
  });
});
