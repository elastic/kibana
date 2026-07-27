/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiLoadingSpinner,
  EuiSelect,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import type { ActionConnector } from '@kbn/triggers-actions-ui-plugin/public';
import type {
  RequiredConnector,
  WorkflowConnectorActionTypeId,
} from '../../../../common/siem_migrations/parsers/tines';
import { useKibana } from '../../../common/lib/kibana';
import { useLoadActionConnectors } from '../hooks/use_load_action_connectors';
import type { ConnectorSelections } from '../utils/resolve_connector_placeholders';
import * as i18n from '../pages/translations';

const CONNECTOR_TYPE_LABELS: Record<WorkflowConnectorActionTypeId, string> = {
  '.email': i18n.CONNECTOR_TYPE_EMAIL,
  '.slack': i18n.CONNECTOR_TYPE_SLACK,
};

export interface RequiredConnectorsPanelProps {
  requiredConnectors: RequiredConnector[];
  selections: ConnectorSelections;
  onSelectionsChange: (selections: ConnectorSelections) => void;
  hasUnresolvedPlaceholders: boolean;
}

const buildSelectOptions = (connectors: ActionConnector[]) => [
  { value: '', text: i18n.CONNECTOR_SELECT_PLACEHOLDER },
  ...connectors.map((connector) => ({
    value: connector.id,
    text: connector.name,
  })),
];

export const RequiredConnectorsPanel = React.memo<RequiredConnectorsPanelProps>(
  ({ requiredConnectors, selections, onSelectionsChange, hasUnresolvedPlaceholders }) => {
    const { application } = useKibana().services;
    const { connectorsByType, isLoading, refetch } = useLoadActionConnectors();
    const selectionsRef = useRef(selections);
    selectionsRef.current = selections;

    // Auto-select when exactly one connector exists for a required type and nothing is selected yet.
    useEffect(() => {
      if (isLoading || requiredConnectors.length === 0) {
        return;
      }
      let changed = false;
      const next: ConnectorSelections = { ...selectionsRef.current };
      for (const required of requiredConnectors) {
        const available = connectorsByType[required.actionTypeId];
        const current = next[required.actionTypeId];
        if ((current == null || current === '') && available.length === 1) {
          next[required.actionTypeId] = available[0].id;
          changed = true;
        }
      }
      if (changed) {
        onSelectionsChange(next);
      }
    }, [connectorsByType, isLoading, onSelectionsChange, requiredConnectors]);

    const onSelectChange = useCallback(
      (actionTypeId: WorkflowConnectorActionTypeId, connectorId: string) => {
        onSelectionsChange({
          ...selectionsRef.current,
          [actionTypeId]: connectorId.length > 0 ? connectorId : undefined,
        });
      },
      [onSelectionsChange]
    );

    const openConnectorsManagement = useCallback(() => {
      application.navigateToApp('management', {
        path: 'insightsAndAlerting/triggersActionsConnectors/connectors',
      });
    }, [application]);

    const configuredCount = useMemo(
      () =>
        requiredConnectors.filter((required) => {
          const selected = selections[required.actionTypeId];
          return selected != null && selected.length > 0;
        }).length,
      [requiredConnectors, selections]
    );

    if (requiredConnectors.length === 0) {
      return null;
    }

    return (
      <EuiCallOut
        color={hasUnresolvedPlaceholders ? 'warning' : 'success'}
        iconType={hasUnresolvedPlaceholders ? 'warning' : 'check'}
        title={i18n.REQUIRED_CONNECTORS_TITLE(configuredCount, requiredConnectors.length)}
        data-test-subj="requiredConnectorsPanel"
      >
        <EuiText size="s">
          <p>{i18n.REQUIRED_CONNECTORS_DESCRIPTION}</p>
        </EuiText>
        <EuiSpacer size="s" />
        <EuiFlexGroup gutterSize="s" responsive={false} wrap>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              size="s"
              iconType="plusInCircle"
              onClick={openConnectorsManagement}
              data-test-subj="createConnectorLink"
            >
              {i18n.CREATE_CONNECTOR_GENERIC}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              size="s"
              iconType="refresh"
              onClick={refetch}
              data-test-subj="refreshConnectorsButton"
            >
              {i18n.REFRESH_CONNECTORS}
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="m" />
        {isLoading ? (
          <EuiLoadingSpinner size="m" data-test-subj="requiredConnectorsLoading" />
        ) : (
          <EuiFlexGroup direction="column" gutterSize="m">
            {requiredConnectors.map((required) => {
              const connectors = connectorsByType[required.actionTypeId];
              const label = CONNECTOR_TYPE_LABELS[required.actionTypeId];
              const selectedId = selections[required.actionTypeId] ?? '';
              const isConfigured = selectedId.length > 0;

              return (
                <EuiFlexItem key={required.actionTypeId} grow={false}>
                  <EuiFormRow
                    label={i18n.REQUIRED_CONNECTOR_ROW_LABEL(
                      label,
                      isConfigured ? 1 : 0,
                      1,
                      required.stepNames.length
                    )}
                    helpText={
                      connectors.length === 0
                        ? i18n.REQUIRED_CONNECTOR_NONE_HELP(label)
                        : undefined
                    }
                    fullWidth
                  >
                    <EuiSelect
                      options={buildSelectOptions(connectors)}
                      value={selectedId}
                      onChange={(event) =>
                        onSelectChange(required.actionTypeId, event.target.value)
                      }
                      disabled={connectors.length === 0}
                      fullWidth
                      data-test-subj={`requiredConnectorSelect-${required.actionTypeId.replace(
                        '.',
                        ''
                      )}`}
                      aria-label={i18n.REQUIRED_CONNECTOR_SELECT_ARIA(label)}
                    />
                  </EuiFormRow>
                </EuiFlexItem>
              );
            })}
          </EuiFlexGroup>
        )}
        {hasUnresolvedPlaceholders && (
          <>
            <EuiSpacer size="s" />
            <EuiText size="s" color="subdued">
              <p>{i18n.REQUIRED_CONNECTORS_SOFT_WARNING}</p>
            </EuiText>
          </>
        )}
      </EuiCallOut>
    );
  }
);
RequiredConnectorsPanel.displayName = 'RequiredConnectorsPanel';
