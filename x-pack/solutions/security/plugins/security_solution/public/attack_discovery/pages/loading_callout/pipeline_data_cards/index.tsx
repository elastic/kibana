/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiText,
} from '@elastic/eui';
import React, { useCallback } from 'react';

import { UnknownCountBadge } from './unknown_count_badge';
import * as i18n from './translations';

export interface RetrievalWorkflowData {
  /** The number of alerts retrieved, or null when the count is unknown (generic strategy) */
  alertsContextCount: number | null;
  /** Display name for this retrieval workflow */
  workflowName: string;
}

export interface PipelineDataCardsProps {
  /** Total alert count across all retrieval workflows, or null when unknown */
  combinedAlertsCount: number | null;
  /** Number of discoveries from the generation step */
  discoveriesCount: number;
  /** Callback when a "View data" button is clicked */
  onViewData: (step: string) => void;
  /** Number of validated discoveries */
  validatedCount: number;
  /** Per-retrieval-workflow data */
  retrievalWorkflows: RetrievalWorkflowData[];
}

const PipelineDataCardsComponent: React.FC<PipelineDataCardsProps> = ({
  combinedAlertsCount,
  discoveriesCount,
  onViewData,
  validatedCount,
  retrievalWorkflows,
}) => {
  const handleViewRetrieval = useCallback(() => onViewData('retrieval'), [onViewData]);
  const handleViewGeneration = useCallback(() => onViewData('generation'), [onViewData]);
  const handleViewValidation = useCallback(() => onViewData('validation'), [onViewData]);

  return (
    <EuiFlexGroup data-test-subj="pipelineDataCards" direction="column" gutterSize="m">
      {/* Retrieval workflows */}
      {retrievalWorkflows.length > 0 && (
        <EuiFlexItem grow={false}>
          <EuiPanel color="subdued" hasBorder={false} paddingSize="s">
            <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} wrap>
              {retrievalWorkflows.map((workflow, index) => (
                <EuiFlexItem grow={false} key={workflow.workflowName}>
                  <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
                    {workflow.alertsContextCount != null ? (
                      <EuiFlexItem grow={false}>
                        <EuiBadge color="primary" data-test-subj={`retrievalBadge-${index}`}>
                          {i18n.ALERTS(workflow.alertsContextCount)}
                        </EuiBadge>
                      </EuiFlexItem>
                    ) : (
                      <EuiFlexItem grow={false}>
                        <UnknownCountBadge />
                      </EuiFlexItem>
                    )}

                    <EuiFlexItem grow={false}>
                      <EuiText color="subdued" size="xs">
                        {workflow.workflowName}
                      </EuiText>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>
              ))}

              <EuiFlexItem grow={false}>
                {combinedAlertsCount != null ? (
                  <EuiBadge color="primary" data-test-subj="combinedAlertsBadge">
                    {i18n.COMBINED_ALERTS(combinedAlertsCount)}
                  </EuiBadge>
                ) : (
                  <UnknownCountBadge />
                )}
              </EuiFlexItem>

              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  data-test-subj="viewDataRetrieval"
                  iconType="inspect"
                  onClick={handleViewRetrieval}
                  size="xs"
                >
                  {i18n.VIEW_DATA}
                </EuiButtonEmpty>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>
        </EuiFlexItem>
      )}

      {/* Generation */}
      <EuiFlexItem grow={false}>
        <EuiPanel color="subdued" hasBorder={false} paddingSize="s">
          <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiBadge color="accent" data-test-subj="discoveriesBadge">
                {i18n.DISCOVERIES(discoveriesCount)}
              </EuiBadge>
            </EuiFlexItem>

            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                data-test-subj="viewDataGeneration"
                iconType="inspect"
                onClick={handleViewGeneration}
                size="xs"
              >
                {i18n.VIEW_DATA}
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      </EuiFlexItem>

      {/* Validation */}
      <EuiFlexItem grow={false}>
        <EuiPanel color="subdued" hasBorder={false} paddingSize="s">
          <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiBadge color="success" data-test-subj="validatedBadge">
                {i18n.VALIDATED(validatedCount)}
              </EuiBadge>
            </EuiFlexItem>

            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                data-test-subj="viewDataValidation"
                iconType="inspect"
                onClick={handleViewValidation}
                size="xs"
              >
                {i18n.VIEW_DATA}
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

PipelineDataCardsComponent.displayName = 'PipelineDataCards';

export const PipelineDataCards = React.memo(PipelineDataCardsComponent);
