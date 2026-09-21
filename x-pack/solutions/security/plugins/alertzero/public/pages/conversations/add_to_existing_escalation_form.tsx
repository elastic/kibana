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
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSubmit: (incidentId: string) => void;
  isSubmitting: boolean;
  onCancel: () => void;
}

export const AddToExistingEscalationForm = memo<AddToExistingEscalationFormProps>(
  ({ incidents, isLoading, searchQuery, onSearchChange, onSubmit, isSubmitting, onCancel }) => {
    const { euiTheme } = useEuiTheme();
    const [selectedId, setSelectedId] = useState<string | null>(null);

    return (
      <>
        <EuiModalBody>
          <EuiFieldSearch
            fullWidth
            placeholder={T.searchPlaceholder}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            data-test-subj="escalationModalIncidentSearch"
          />

          <EuiSpacer size="m" />

          {isLoading ? (
            <EuiFlexGroup justifyContent="center">
              <EuiFlexItem grow={false}>
                <EuiLoadingSpinner size="m" />
              </EuiFlexItem>
            </EuiFlexGroup>
          ) : incidents.length === 0 ? (
            <EuiText size="s" color="subdued" textAlign="center">
              <p>{T.emptyText}</p>
            </EuiText>
          ) : (
            incidents.map((incident) => (
              <EuiToolTip
                key={incident.id}
                content={incident.alreadyLinked ? T.alreadyLinkedTooltip : undefined}
                position="top"
                display="block"
              >
                <EuiPanel
                  hasBorder
                  paddingSize="m"
                  css={css`
                    margin-bottom: ${euiTheme.size.s};
                    ${incident.alreadyLinked
                      ? `cursor: not-allowed; opacity: 0.6;`
                      : `cursor: pointer;`}
                    ${selectedId === incident.id ? `border-color: ${euiTheme.colors.primary};` : ''}
                  `}
                  onClick={() => !incident.alreadyLinked && setSelectedId(incident.id)}
                  data-test-subj={`escalationModalIncident-${incident.id}`}
                >
                  <EuiFlexGroup alignItems="center" gutterSize="s">
                    <EuiFlexItem grow={false}>
                      <EuiRadio
                        id={`incident-${incident.id}`}
                        name="escalation-incident"
                        checked={selectedId === incident.id}
                        disabled={incident.alreadyLinked}
                        onChange={() => !incident.alreadyLinked && setSelectedId(incident.id)}
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
