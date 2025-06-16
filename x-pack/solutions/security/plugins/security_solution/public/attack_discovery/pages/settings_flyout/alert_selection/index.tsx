/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConnectorSelectorInline } from '@kbn/elastic-assistant';
import {
  EuiFormRow,
  EuiTab,
  EuiTabs,
  EuiText,
  EuiSpacer,
  EuiFlexItem,
  EuiFlexGroup,
} from '@elastic/eui';
import type { FilterManager } from '@kbn/data-plugin/public';
import type { Filter, Query } from '@kbn/es-query';
import React, { useMemo, useState } from 'react';

import { ElasticLLMCostAwarenessTour } from '@kbn/elastic-assistant/impl/tour/elastic_llm';
import { css } from '@emotion/react';
import { NEW_FEATURES_TOUR_STORAGE_KEYS } from '@kbn/elastic-assistant/impl/tour/const';
import { AlertSelectionQuery } from './alert_selection_query';
import { AlertSelectionRange } from './alert_selection_range';
import { getTabs } from './helpers/get_tabs';
import * as i18n from './translations';

interface Props {
  alertsPreviewStackBy0: string;
  alertSummaryStackBy0: string;
  end: string;
  filterManager: FilterManager;
  filters: Filter[];
  maxAlerts: number;
  query: Query;
  setAlertsPreviewStackBy0: React.Dispatch<React.SetStateAction<string>>;
  setAlertSummaryStackBy0: React.Dispatch<React.SetStateAction<string>>;
  setEnd: React.Dispatch<React.SetStateAction<string>>;
  setMaxAlerts: React.Dispatch<React.SetStateAction<string>>;
  setQuery: React.Dispatch<React.SetStateAction<Query>>;
  setStart: React.Dispatch<React.SetStateAction<string>>;
  start: string;
}

const AlertSelectionComponent: React.FC<Props> = ({
  alertsPreviewStackBy0,
  alertSummaryStackBy0,
  end,
  filterManager,
  filters,
  maxAlerts,
  query,
  setAlertsPreviewStackBy0,
  setAlertSummaryStackBy0,
  setEnd,
  setMaxAlerts,
  setQuery,
  setStart,
  start,
}) => {
  const { attackDiscoveryAlertsEnabled } = useKibanaFeatureFlags();

  const tabs = useMemo(
    () =>
      getTabs({
        alertsPreviewStackBy0,
        alertSummaryStackBy0,
        end,
        filters,
        maxAlerts,
        query,
        setAlertsPreviewStackBy0,
        setAlertSummaryStackBy0,
        start,
      }),
    [
      alertsPreviewStackBy0,
      alertSummaryStackBy0,
      end,
      filters,
      maxAlerts,
      query,
      setAlertsPreviewStackBy0,
      setAlertSummaryStackBy0,
      start,
    ]
  );

  const [selectedTabId, setSelectedTabId] = useState(tabs[0].id);

  const selectedTabContent = useMemo(
    () => tabs.find((obj) => obj.id === selectedTabId)?.content,
    [selectedTabId, tabs]
  );

  return (
    <EuiFlexGroup data-test-subj="alertSelection" direction="column" gutterSize="none">
      <EuiFlexItem grow={false}>
        <EuiText data-test-subj="customizeAlerts" size="s">
          <p>{i18n.CUSTOMIZE_THE_ALERTS}</p>
        </EuiText>
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <EuiSpacer size="m" />
      </EuiFlexItem>

      <EuiSpacer size="m" />

      <ElasticLLMCostAwarenessTour
        isDisabled={false}
        wrapper={false}
        selectedConnectorId={connectorId}
        storageKey={NEW_FEATURES_TOUR_STORAGE_KEYS.ELASTIC_LLM_USAGE_ATTACK_DISCOVERY_FLYOUT}
      >
        <EuiFormRow
          label={i18n.CONNECTOR}
          css={css`
            flex-grow: 1;
          `}
        >
          <ConnectorSelectorInline
            fullWidth={true}
            onConnectorSelected={noop}
            onConnectorIdSelected={onConnectorIdSelected}
            selectedConnectorId={connectorId}
            stats={attackDiscoveryAlertsEnabled ? undefined : stats}
          />
        </EuiFormRow>
      </ElasticLLMCostAwarenessTour>
      <EuiSpacer size="m" />

      <EuiFormRow label={i18n.CUSTOM_QUERY}>
        <AlertSelectionQuery
          end={end}
          filterManager={filterManager}
          filters={filters}
          query={query}
          setEnd={setEnd}
          setQuery={setQuery}
          setStart={setStart}
          start={start}
        />
      </EuiFormRow>

      <EuiFlexItem grow={false}>
        <EuiSpacer />
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <AlertSelectionRange maxAlerts={maxAlerts} setMaxAlerts={setMaxAlerts} />
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <EuiSpacer />
      </EuiFlexItem>

      <EuiTabs data-test-subj="tabs">
        {tabs.map((tab) => (
          <EuiTab
            key={tab.id}
            isSelected={tab.id === selectedTabId}
            onClick={() => setSelectedTabId(tab.id)}
          >
            {tab.name}
          </EuiTab>
        ))}
      </EuiTabs>
      {selectedTabContent}
    </EuiFlexGroup>
  );
};

AlertSelectionComponent.displayName = 'AlertSelection';

export const AlertSelection = React.memo(AlertSelectionComponent);
