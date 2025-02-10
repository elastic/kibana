/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiSearchBar } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useMemo, useState } from 'react';
import type { SanitizedDashboardAsset } from '@kbn/streams-plugin/server/routes/dashboards/route';
import { IngestStreamGetResponse } from '@kbn/streams-schema';
import { AddDashboardFlyout } from './add_dashboard_flyout';
import { DashboardsTable } from './dashboard_table';
import { useDashboardsApi } from '../../hooks/use_dashboards_api';
import { useDashboardsFetch } from '../../hooks/use_dashboards_fetch';

export function StreamDetailDashboardsView({
  definition,
}: {
  definition?: IngestStreamGetResponse;
}) {
  const [query, setQuery] = useState('');

  const [isAddDashboardFlyoutOpen, setIsAddDashboardFlyoutOpen] = useState(false);

  const dashboardsFetch = useDashboardsFetch(definition?.stream.name);
  const { addDashboards, removeDashboards } = useDashboardsApi(definition?.stream.name);

  const [isUnlinkLoading, setIsUnlinkLoading] = useState(false);
  const linkedDashboards = useMemo(() => {
    return dashboardsFetch.value?.dashboards ?? [];
  }, [dashboardsFetch.value?.dashboards]);

  const filteredDashboards = useMemo(() => {
    return linkedDashboards.filter((dashboard) => {
      return dashboard.label.toLowerCase().includes(query.toLowerCase());
    });
  }, [linkedDashboards, query]);

  const [selectedDashboards, setSelectedDashboards] = useState<SanitizedDashboardAsset[]>([]);

  return (
    <EuiFlexGroup direction="column">
      <EuiFlexItem grow={false}>
        <EuiFlexGroup direction="row" gutterSize="s">
          {selectedDashboards.length > 0 && (
            <EuiButton
              data-test-subj="streamsAppStreamDetailRemoveDashboardButton"
              iconType="trash"
              isLoading={isUnlinkLoading}
              onClick={async () => {
                try {
                  setIsUnlinkLoading(true);

                  await removeDashboards(selectedDashboards);
                  await dashboardsFetch.refresh();

                  setSelectedDashboards([]);
                } finally {
                  setIsUnlinkLoading(false);
                }
              }}
              color="danger"
            >
              {i18n.translate('xpack.streams.streamDetailDashboardView.removeSelectedButtonLabel', {
                defaultMessage: 'Unlink selected',
              })}
            </EuiButton>
          )}
          <EuiSearchBar
            query={query}
            box={{
              incremental: true,
            }}
            onChange={(nextQuery) => {
              setQuery(nextQuery.queryText);
            }}
          />
          <EuiButton
            data-test-subj="streamsAppStreamDetailAddDashboardButton"
            iconType="plusInCircle"
            onClick={() => {
              setIsAddDashboardFlyoutOpen(true);
            }}
          >
            {i18n.translate('xpack.streams.streamDetailDashboardView.addADashboardButtonLabel', {
              defaultMessage: 'Add a dashboard',
            })}
          </EuiButton>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem>
        <DashboardsTable
          dashboards={filteredDashboards}
          loading={dashboardsFetch.loading}
          selectedDashboards={selectedDashboards}
          setSelectedDashboards={setSelectedDashboards}
        />
        {definition && isAddDashboardFlyoutOpen ? (
          <AddDashboardFlyout
            linkedDashboards={linkedDashboards}
            entityId={definition.stream.name}
            onAddDashboards={async (dashboards) => {
              await addDashboards(dashboards);
              await dashboardsFetch.refresh();
              setIsAddDashboardFlyoutOpen(false);
            }}
            onClose={() => {
              setIsAddDashboardFlyoutOpen(false);
            }}
          />
        ) : null}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
