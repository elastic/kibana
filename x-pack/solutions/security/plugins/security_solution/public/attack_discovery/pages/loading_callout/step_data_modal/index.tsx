/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiButtonEmpty,
  EuiCodeBlock,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSpacer,
  EuiText,
  useGeneratedHtmlId,
} from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';

import { useWorkflowEditorLink } from '../../use_workflow_editor_link';
import { getWorkflowDescriptionPrefix } from './helpers/get_workflow_description_prefix';
import { serialiseRawData } from './helpers/serialise_raw_data';
import {
  WorkflowAlertsSummaryLine,
  type WorkflowRetrievalSummary,
} from './workflow_alerts_summary_line';
import * as i18n from './translations';

export type ExtractionStrategy = 'custom_workflow' | 'default_custom_query' | 'default_esql';

const EXTRACTION_STRATEGY_BADGE_LABELS: Record<ExtractionStrategy, string> = {
  custom_workflow: i18n.CUSTOM_WORKFLOW,
  default_custom_query: i18n.CUSTOM_QUERY,
  default_esql: i18n.ESQL,
};

export type StepDataType = 'alerts' | 'discoveries' | 'validated_discoveries';

export interface StepDataModalProps {
  /** Data count displayed in the header; null when count is unknown */
  dataCount: number | null;
  /** Determines the serialisation strategy for raw data display */
  dataType: StepDataType;
  /** Extraction strategy badge label (only meaningful for alerts) */
  extractionStrategy?: ExtractionStrategy;
  /** The data items to display */
  items: unknown[];
  /** Called when the modal should close */
  onClose: () => void;
  /** Step name displayed in the modal header */
  stepName: string;
  /** Workflow ID for generating the editor link in the description */
  workflowId?: string;
  /** Workflow name displayed as a link in the description */
  workflowName?: string;
  /** Workflow run ID for generating the editor link in the description */
  workflowRunId?: string;
  /** Per-workflow summaries for the combined alerts modal */
  workflowSummaries?: WorkflowRetrievalSummary[];
}

interface DescriptionSectionProps {
  dataCount: number | null;
  dataType: StepDataType;
  editorUrl: string | null;
  workflowId?: string;
  workflowName?: string;
  workflowRunId?: string;
  workflowSummaries?: WorkflowRetrievalSummary[];
}

const DescriptionSection: React.FC<DescriptionSectionProps> = ({
  dataCount,
  dataType,
  editorUrl,
  workflowId,
  workflowName,
  workflowRunId,
  workflowSummaries,
}) => {
  const hasWorkflowDescription = workflowName != null;
  const hasWorkflowSummaries = workflowSummaries != null && workflowSummaries.length > 0;

  if (hasWorkflowSummaries) {
    return (
      <>
        <EuiFlexGroup
          data-test-subj="stepDataModalWorkflowSummaries"
          direction="column"
          gutterSize="xs"
        >
          {workflowSummaries.map((summary, index) => (
            <EuiFlexItem grow={false} key={summary.workflowRunId ?? index}>
              <WorkflowAlertsSummaryLine
                alertsCount={summary.alertsCount}
                workflowId={summary.workflowId}
                workflowName={summary.workflowName}
                workflowRunId={summary.workflowRunId}
              />
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>

        <EuiSpacer size="m" />
      </>
    );
  }

  if (!hasWorkflowDescription) {
    return null;
  }

  if (dataType === 'alerts') {
    return (
      <>
        <WorkflowAlertsSummaryLine
          alertsCount={dataCount}
          workflowId={workflowId}
          workflowName={workflowName}
          workflowRunId={workflowRunId}
        />

        <EuiSpacer size="m" />
      </>
    );
  }

  return (
    <>
      <EuiText data-test-subj="stepDataModalWorkflowDescription" size="s">
        {`${getWorkflowDescriptionPrefix(dataCount, dataType)} `}
        {editorUrl != null ? (
          <EuiLink
            data-test-subj="stepDataModalWorkflowLink"
            external
            href={editorUrl}
            target="_blank"
          >
            {workflowName}
          </EuiLink>
        ) : (
          <strong data-test-subj="stepDataModalWorkflowLink">{workflowName}</strong>
        )}
      </EuiText>

      <EuiSpacer size="m" />
    </>
  );
};

/**
 * Modal for viewing pipeline step data as raw content.
 *
 * Displays an EuiCodeBlock with JSON/CSV content, syntax highlighting,
 * and a copy button.
 *
 * The modal header shows the step name, an optional extraction strategy
 * badge, and the data count. The footer provides Copy All and Close buttons.
 */
export const StepDataModal: React.FC<StepDataModalProps> = ({
  dataCount,
  dataType,
  extractionStrategy,
  items,
  onClose,
  stepName,
  workflowId,
  workflowName,
  workflowRunId,
  workflowSummaries,
}) => {
  const modalTitleId = useGeneratedHtmlId({ prefix: 'stepDataModal' });

  const { editorUrl } = useWorkflowEditorLink({
    workflowId: workflowId ?? null,
    workflowRunId: workflowRunId ?? null,
  });

  const rawData = useMemo(() => serialiseRawData(items, dataType), [items, dataType]);

  const handleCopyAll = useCallback(() => {
    navigator.clipboard.writeText(rawData);
  }, [rawData]);

  const isEmpty = items.length === 0;
  const hasWorkflowDescription = workflowName != null;
  const hasWorkflowSummaries = workflowSummaries != null && workflowSummaries.length > 0;

  return (
    <EuiModal
      aria-labelledby={modalTitleId}
      data-test-subj="stepDataModal"
      maxWidth={900}
      onClose={onClose}
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle id={modalTitleId}>
          <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
            <EuiFlexItem grow={false}>{stepName}</EuiFlexItem>

            {extractionStrategy != null && (
              <EuiFlexItem grow={false}>
                <EuiBadge color="hollow" data-test-subj="stepDataModalExtractionStrategy">
                  {EXTRACTION_STRATEGY_BADGE_LABELS[extractionStrategy]}
                </EuiBadge>
              </EuiFlexItem>
            )}

            {!hasWorkflowDescription && !hasWorkflowSummaries && (
              <EuiFlexItem grow={false}>
                <EuiText color="subdued" data-test-subj="stepDataModalDataCount" size="s">
                  {`${i18n.COUNT}: ${dataCount != null ? dataCount : i18n.UNKNOWN}`}
                </EuiText>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        <DescriptionSection
          dataCount={dataCount}
          dataType={dataType}
          editorUrl={editorUrl}
          workflowId={workflowId}
          workflowName={workflowName}
          workflowRunId={workflowRunId}
          workflowSummaries={workflowSummaries}
        />
        {isEmpty ? (
          <EuiEmptyPrompt
            body={<p>{i18n.NO_DATA}</p>}
            data-test-subj="stepDataModalEmptyState"
            iconType="database"
            titleSize="xs"
          />
        ) : (
          <EuiCodeBlock
            data-test-subj="stepDataModalCodeBlock"
            isCopyable={true}
            language={dataType === 'alerts' ? 'text' : 'json'}
            overflowHeight={400}
            paddingSize="m"
          >
            {rawData}
          </EuiCodeBlock>
        )}
      </EuiModalBody>

      <EuiModalFooter>
        <EuiFlexGroup justifyContent="spaceBetween" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              data-test-subj="stepDataModalCopyAllButton"
              iconType="copy"
              onClick={handleCopyAll}
            >
              {i18n.COPY_ALL}
            </EuiButtonEmpty>
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiButtonEmpty data-test-subj="stepDataModalCloseButton" onClick={onClose}>
              {i18n.CLOSE}
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiModalFooter>
    </EuiModal>
  );
};
