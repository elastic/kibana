/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { AlertsDetailsTable } from './alerts_findings_details_table';
import { TestProviders } from '../../../common/mock/test_providers';
import { EntityIdentifierFields } from '../../../../common/entity_analytics/types';
import { useNonClosedAlerts } from '../../hooks/use_non_closed_alerts';
import { useEntityStoreEuidApi } from '@kbn/entity-store/public';
import { useUiSetting } from '../../../common/lib/kibana';
import { useEntityFromStore } from '../../../flyout/entity_details/shared/hooks/use_entity_from_store';
import { useQueryAlerts } from '../../../detections/containers/detection_engine/alerts/use_query';
import {
  ENTITY_ANALYTICS_TABLE_ID,
  ENTITY_ANALYTICS_ALERTS_FROM,
  ENTITY_ANALYTICS_DEFAULT_TIMERANGE_TO,
} from '../../../entity_analytics/components/home/constants';

jest.mock('@kbn/cloud-security-posture-common/utils/ui_metrics', () => ({
  uiMetricService: { trackUiMetric: jest.fn() },
  ENTITY_FLYOUT_EXPAND_MISCONFIGURATION_VIEW_VISITS: 'visit',
}));

jest.mock('@kbn/entity-store/public', () => ({
  ...jest.requireActual('@kbn/entity-store/public'),
  useEntityStoreEuidApi: jest.fn().mockReturnValue({ euid: null }),
}));

jest.mock('../../../common/lib/kibana', () => ({
  useUiSetting: jest.fn().mockReturnValue(false),
  useKibana: jest.fn().mockReturnValue({ services: {} }),
}));

jest.mock('../../../common/containers/use_global_time', () => ({
  useGlobalTime: jest.fn().mockReturnValue({ to: '2023-01-01', from: '2022-01-01' }),
}));

jest.mock('../../../detections/containers/detection_engine/alerts/use_query', () => ({
  useQueryAlerts: jest.fn().mockReturnValue({
    loading: false,
    data: {
      hits: {
        hits: [
          {
            fields: {
              _id: ['alert-1'],
              _index: ['index-1'],
              'kibana.alert.rule.name': ['Rule'],
              'kibana.alert.severity': ['high'],
              'kibana.alert.workflow_status': ['open'],
            },
          },
        ],
      },
    },
    setQuery: jest.fn(),
    response: '',
    request: '',
    refetch: jest.fn(),
  }),
}));

jest.mock('../../../detections/containers/detection_engine/alerts/use_signal_index', () => ({
  useSignalIndex: jest
    .fn()
    .mockReturnValue({ loading: false, signalIndexName: '.alerts-security' }),
}));

jest.mock('../../../flyout/entity_details/shared/hooks/use_entity_from_store', () => ({
  useEntityFromStore: jest.fn().mockReturnValue({ entityRecord: null, isLoading: false }),
}));

jest.mock('../../hooks/use_non_closed_alerts', () => ({
  useNonClosedAlerts: jest
    .fn()
    .mockReturnValue({ hasNonClosedAlerts: false, filteredAlertsData: null }),
}));

jest.mock('../../../common/hooks/use_navigate_to_alerts_page_with_filters', () => ({
  useNavigateToAlertsPageWithFilters: jest.fn().mockReturnValue(jest.fn()),
}));

const TARGET_RECORD = { entity: { id: 'host:target' }, host: { name: 'my-host' } };
const ALIAS_RECORD = { entity: { id: 'host:alias' }, host: { name: 'alias-host' } };
const hostNameFilter = (record: { host: { name: string } }) => ({
  term: { 'host.name': record.host.name },
});
const GROUP_FILTER = {
  bool: {
    should: [hostNameFilter(TARGET_RECORD), hostNameFilter(ALIAS_RECORD)],
    minimum_should_match: 1,
  },
};

const mockEntityStoreEnabled = () => {
  (useUiSetting as jest.Mock).mockReturnValue(true);
  (useEntityStoreEuidApi as jest.Mock).mockReturnValue({
    euid: {
      dsl: { getEuidFilterBasedOnDocument: jest.fn((_def, record) => hostNameFilter(record)) },
    },
    getBuiltInEntityDefinition: jest.fn().mockReturnValue({ id: 'host' }),
  });
};

const renderTable = (
  onShowAlert: (eventId: string, indexName: string, ruleName?: string) => void
) =>
  render(
    <TestProviders>
      <AlertsDetailsTable
        field={EntityIdentifierFields.hostName}
        value="my-host"
        onShowAlert={onShowAlert}
      />
    </TestProviders>
  );

const clickRowAction = () => {
  // The row action is an icon-only button rendered with the `expand` EuiIcon.
  const expandIcon = document.querySelector('[data-euiicon-type="maximize"]');
  fireEvent.click(expandIcon?.closest('button') as HTMLElement);
};

describe('AlertsDetailsTable', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('invokes onShowAlert with the row identifiers when a row action is clicked', () => {
    const onShowAlert = jest.fn();
    renderTable(onShowAlert);

    clickRowAction();

    expect(onShowAlert).toHaveBeenCalledWith('alert-1', 'index-1', 'Rule');
  });

  describe('time range', () => {
    const renderWithScopeId = (scopeId?: string) =>
      render(
        <TestProviders>
          <AlertsDetailsTable
            field={EntityIdentifierFields.hostName}
            value="my-host"
            onShowAlert={jest.fn()}
            scopeId={scopeId}
          />
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

  describe('entity store filter', () => {
    const renderWithMode = (mode?: 'single' | 'resolved') =>
      render(
        <TestProviders>
          <AlertsDetailsTable
            field={EntityIdentifierFields.hostName}
            value="my-host"
            entityId="host:target"
            entityType="host"
            mode={mode}
            onShowAlert={jest.fn()}
          />
        </TestProviders>
      );

    beforeEach(() => {
      mockEntityStoreEnabled();
    });

    afterEach(() => {
      (useUiSetting as jest.Mock).mockReturnValue(false);
      (useEntityStoreEuidApi as jest.Mock).mockReturnValue({ euid: null });
      (useEntityFromStore as jest.Mock).mockReturnValue({ entityRecord: null, isLoading: false });
    });

    it('queries only the target entity in single mode', () => {
      (useEntityFromStore as jest.Mock).mockReturnValue({
        entityRecord: TARGET_RECORD,
        aliasRecords: [],
        isLoading: false,
      });

      renderWithMode();

      expect(useEntityFromStore).toHaveBeenCalledWith(
        expect.objectContaining({ entityId: 'host:target', mode: undefined })
      );
      expect(useNonClosedAlerts).toHaveBeenCalledWith(
        expect.objectContaining({
          identityFields: {},
          additionalFilters: [hostNameFilter(TARGET_RECORD)],
        })
      );
      const { query } = (useQueryAlerts as jest.Mock).mock.calls[0][0];
      expect(JSON.stringify(query)).toContain(JSON.stringify(hostNameFilter(TARGET_RECORD)));
      expect(JSON.stringify(query)).not.toContain('alias-host');
    });

    it('queries the whole resolution group in resolved mode', () => {
      (useEntityFromStore as jest.Mock).mockReturnValue({
        entityRecord: TARGET_RECORD,
        aliasRecords: [ALIAS_RECORD],
        isLoading: false,
      });

      renderWithMode('resolved');

      expect(useEntityFromStore).toHaveBeenCalledWith(
        expect.objectContaining({ entityId: 'host:target', mode: 'resolved' })
      );
      expect(useNonClosedAlerts).toHaveBeenCalledWith(
        expect.objectContaining({ identityFields: {}, additionalFilters: [GROUP_FILTER] })
      );
      const { query } = (useQueryAlerts as jest.Mock).mock.calls[0][0];
      expect(JSON.stringify(query)).toContain(JSON.stringify(GROUP_FILTER));
    });
  });
});
