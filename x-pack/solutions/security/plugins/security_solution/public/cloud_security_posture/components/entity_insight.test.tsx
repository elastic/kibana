/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { EntityInsight } from './entity_insight';
import { TestProviders } from '../../common/mock/test_providers';
import { EntityIdentifierFields } from '../../../common/entity_analytics/types';
import { useHasVulnerabilities } from '@kbn/cloud-security-posture/src/hooks/use_has_vulnerabilities';
import { useNonClosedAlerts } from '../hooks/use_non_closed_alerts';
import { buildEuidCspPreviewOptions } from '../utils/build_euid_csp_preview_options';
import { VulnerabilitiesPreview } from './vulnerabilities/vulnerabilities_preview';
import type { EntityStoreRecord } from '../../flyout/entity_details/shared/hooks/use_entity_from_store';
import {
  ENTITY_ANALYTICS_TABLE_ID,
  ENTITY_ANALYTICS_ALERTS_FROM,
  ENTITY_ANALYTICS_DEFAULT_TIMERANGE_TO,
} from '../../entity_analytics/components/home/constants';

jest.mock('@kbn/entity-store/public', () => ({
  ...jest.requireActual('@kbn/entity-store/public'),
  useEntityStoreEuidApi: jest.fn().mockReturnValue({ euid: null }),
}));

jest.mock('@kbn/cloud-security-posture/src/hooks/use_has_misconfigurations', () => ({
  useHasMisconfigurations: jest.fn().mockReturnValue({
    hasMisconfigurationFindings: false,
    passedFindings: 0,
    failedFindings: 0,
  }),
}));

jest.mock('@kbn/cloud-security-posture/src/hooks/use_has_vulnerabilities', () => ({
  useHasVulnerabilities: jest.fn().mockReturnValue({ hasVulnerabilitiesFindings: false }),
}));

jest.mock('../utils/build_euid_csp_preview_options', () => ({
  ...jest.requireActual('../utils/build_euid_csp_preview_options'),
  buildEuidCspPreviewOptions: jest.fn().mockReturnValue({ enabled: false }),
}));

jest.mock('./vulnerabilities/vulnerabilities_preview', () => ({
  VulnerabilitiesPreview: jest.fn().mockReturnValue(null),
}));

jest.mock('../../common/containers/use_global_time', () => ({
  useGlobalTime: jest.fn().mockReturnValue({ to: '2023-01-01', from: '2022-01-01' }),
}));

jest.mock('../hooks/use_non_closed_alerts', () => ({
  useNonClosedAlerts: jest
    .fn()
    .mockReturnValue({ hasNonClosedAlerts: false, filteredAlertsData: null }),
}));

describe('EntityInsight', () => {
  const defaultProps = {
    identityFields: { [EntityIdentifierFields.hostName]: 'my-host' },
    isPreviewMode: false,
    openDetailsPanel: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
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
          to: ENTITY_ANALYTICS_DEFAULT_TIMERANGE_TO,
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

  describe('resolution group', () => {
    const entityRecord = { entity: { id: 'host-1' } } as EntityStoreRecord;
    const aliasRecords = [{ entity: { id: 'host-2' } } as EntityStoreRecord];

    const renderWithGroup = (props: { aliasRecords?: readonly EntityStoreRecord[] } = {}) =>
      render(
        <TestProviders>
          <EntityInsight
            {...defaultProps}
            entityType="host"
            entityRecord={entityRecord}
            {...props}
          />
        </TestProviders>
      );

    it('passes the entity record and aliases to the alerts query', () => {
      renderWithGroup({ aliasRecords });

      expect(useNonClosedAlerts).toHaveBeenCalledWith(
        expect.objectContaining({ entityRecord, aliasRecords, entityType: 'host' })
      );
    });

    it('builds the misconfigurations and vulnerabilities options from the whole group', () => {
      renderWithGroup({ aliasRecords });

      expect(buildEuidCspPreviewOptions).toHaveBeenCalledTimes(2);
      expect(buildEuidCspPreviewOptions).toHaveBeenCalledWith(
        'host',
        entityRecord,
        expect.anything(),
        { legacyIdentityFields: defaultProps.identityFields, aliasRecords }
      );
    });

    it('passes the entity record and aliases to the vulnerabilities preview', () => {
      (useHasVulnerabilities as jest.Mock).mockReturnValueOnce({
        hasVulnerabilitiesFindings: true,
      });

      renderWithGroup({ aliasRecords });

      expect(VulnerabilitiesPreview).toHaveBeenCalledWith(
        expect.objectContaining({ entityRecord, aliasRecords }),
        expect.anything()
      );
    });

    it('leaves aliasRecords undefined when the entity is not in a group', () => {
      renderWithGroup();

      expect(useNonClosedAlerts).toHaveBeenCalledWith(
        expect.objectContaining({ entityRecord, aliasRecords: undefined })
      );
      expect(buildEuidCspPreviewOptions).toHaveBeenCalledWith(
        'host',
        entityRecord,
        expect.anything(),
        { legacyIdentityFields: defaultProps.identityFields, aliasRecords: undefined }
      );
    });
  });
});
