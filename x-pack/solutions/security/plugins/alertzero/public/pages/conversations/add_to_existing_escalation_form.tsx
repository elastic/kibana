/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useState } from 'react';
import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiModalBody,
  EuiModalFooter,
  EuiPanel,
  EuiRadio,
  EuiSpacer,
  EuiText,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { EscalationIncidentSummary } from '@kbn/agentic-investigations-common';
import { ESCALATION_MODAL_TRANSLATIONS } from './translations';

const T = ESCALATION_MODAL_TRANSLATIONS.addToExistingForm;

export interface AddToExistingEscalationFormProps {
  incidents: EscalationIncidentSummary[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSubmit: (incidentId: string) => void;
  isSubmitting: boolean;
  onCancel: () => void;
}

export const AddToExistingEscalationForm = memo<AddToExistingEscalationFormProps>(
  ({
    incidents,
    isLoading,
    isError,
    onRetry,
    searchQuery,
    onSearchChange,
    onSubmit,
    isSubmitting,
    onCancel,
  }) => {
    const { euiTheme } = useEuiTheme();
    const [selectedId, setSelectedId] = useState<string | null>(null);

    const isRowDisabled = (incident: EscalationIncidentSummary) =>
      incident.alreadyLinked || !incident.canManage;

    const rowTooltip = (incident: EscalationIncidentSummary) => {
      if (incident.alreadyLinked) return T.alreadyLinkedTooltip;
      if (!incident.canManage) return T.notOwnerTooltip;
      return undefined;
    };

    return (
      <>
        <EuiModalBody>
          <EuiFieldSearch
            fullWidth
            placeholder={T.searchPlaceholder}
            value={searchQuery}
            onChange={(e) => {
              setSelectedId(null);
              onSearchChange(e.target.value);
            }}
            data-test-subj="escalationModalIncidentSearch"
          />

          <EuiSpacer size="m" />

          {isLoading ? (
            <EuiFlexGroup justifyContent="center">
              <EuiFlexItem grow={false}>
                <EuiLoadingSpinner size="m" />
              </EuiFlexItem>
            </EuiFlexGroup>
          ) : isError ? (
            <EuiCallOut
              announceOnMount
              title={T.loadErrorTitle}
              color="danger"
              iconType="error"
              data-test-subj="escalationModalLoadError"
            >
              <EuiButton size="s" color="danger" onClick={onRetry}>
                {T.retryButton}
              </EuiButton>
            </EuiCallOut>
          ) : incidents.length === 0 ? (
            <EuiText size="s" color="subdued" textAlign="center">
              <p>{T.emptyText}</p>
            </EuiText>
          ) : (
            incidents.map((incident) => (
              <EuiToolTip
                key={incident.id}
                content={rowTooltip(incident)}
                position="top"
                display="block"
              >
                <EuiPanel
                  hasBorder
                  paddingSize="m"
                  css={css`
                    margin-bottom: ${euiTheme.size.s};
                    ${isRowDisabled(incident)
                      ? `cursor: not-allowed; opacity: 0.6;`
                      : `cursor: pointer;`}
                    ${selectedId === incident.id ? `border-color: ${euiTheme.colors.primary};` : ''}
                  `}
                  onClick={() => !isRowDisabled(incident) && setSelectedId(incident.id)}
                  data-test-subj={`escalationModalIncident-${incident.id}`}
                >
                  <EuiFlexGroup alignItems="center" gutterSize="s">
                    <EuiFlexItem grow={false}>
                      <EuiRadio
                        id={`incident-${incident.id}`}
                        name="escalation-incident"
                        checked={selectedId === incident.id}
                        disabled={isRowDisabled(incident)}
                        onChange={() => !isRowDisabled(incident) && setSelectedId(incident.id)}
                      />
                    </EuiFlexItem>
                    <EuiFlexItem>
                      <EuiText size="s">
                        <strong>{incident.title}</strong>
                      </EuiText>
                      <EuiText size="xs" color="subdued">
                        {T.linkedInvestigationsCount(incident.linkedInvestigationCount)}
                      </EuiText>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiBadge color="hollow">{T.openBadge}</EuiBadge>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiPanel>
              </EuiToolTip>
            ))
          )}

          <EuiSpacer size="s" />

          <EuiText size="xs" color="subdued">
            <p>{T.accessNote}</p>
          </EuiText>
        </EuiModalBody>

        <EuiModalFooter>
          <EuiButtonEmpty onClick={onCancel} data-test-subj="escalationModalCancel">
            {ESCALATION_MODAL_TRANSLATIONS.cancelButton}
          </EuiButtonEmpty>
          <EuiButton
            fill
            color="primary"
            onClick={() => selectedId && onSubmit(selectedId)}
            isLoading={isSubmitting}
            isDisabled={!selectedId || isSubmitting}
            data-test-subj="escalationModalAddToIncident"
          >
            {T.submitButton}
          </EuiButton>
        </EuiModalFooter>
      </>
    );
  }
);

AddToExistingEscalationForm.displayName = 'AddToExistingEscalationForm';
