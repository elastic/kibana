/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiAccordion,
  EuiBadge,
  EuiBasicTable,
  EuiCallOut,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { FormattedDate, FormattedTime } from '@kbn/i18n-react';
import type { HuntSessionAttachment } from '../../../../common/hunt_session_attachment_schema';
import { huntSessionAttachmentSchema } from '../../../../common/hunt_session_attachment_schema';
import * as i18n from './translations';

export interface HuntSessionAttachmentInlineContentProps {
  attachment: { data?: unknown };
}

/** Most fields one evidence table shows; the stored row keeps every field. */
const MAX_TABLE_COLUMNS = 6;

type Row = Record<string, string | number | boolean | null>;

const cell = (value: unknown) => (value === null || value === undefined ? '' : String(value));

const EvidenceTable: React.FC<{ rows: Row[] }> = ({ rows }) => {
  const fields = [...new Set(rows.flatMap((row) => Object.keys(row)))].slice(0, MAX_TABLE_COLUMNS);
  return (
    <EuiBasicTable<Row>
      items={rows}
      tableCaption={i18n.EVIDENCE_TABLE_CAPTION}
      columns={fields.map((field) => ({
        field,
        name: field,
        truncateText: true,
        render: (value: unknown) => cell(value),
      }))}
    />
  );
};

const Preservation: React.FC<{
  preservation: NonNullable<HuntSessionAttachment['preservations']>[number];
}> = ({ preservation }) => (
  <EuiAccordion
    id={`huntPreservation-${preservation.preservation_id}`}
    paddingSize="m"
    data-test-subj="alertZeroHuntPreservation"
    buttonContent={
      <EuiText size="s">
        <strong>{i18n.PRESERVATION_HEADING(preservation.selectedEvidence.length)}</strong>{' '}
        {i18n.PRESERVATION_BY(preservation.actor)} <FormattedDate value={preservation.timestamp} />{' '}
        <FormattedTime value={preservation.timestamp} />
      </EuiText>
    }
  >
    <EuiText size="xs" color="subdued">
      {i18n.TIME_RANGE(preservation.timeRange.from, preservation.timeRange.to)}
    </EuiText>
    <EuiSpacer size="xs" />
    <EuiCodeBlock language="esql" fontSize="s" paddingSize="s" isCopyable overflowHeight={160}>
      {preservation.query}
    </EuiCodeBlock>
    <EuiSpacer size="s" />
    <EvidenceTable rows={preservation.selectedEvidence} />
  </EuiAccordion>
);

/** The hunt, how it was run, the evidence preserved from it, and the automated adjudication if any. */
export const HuntSessionAttachmentInlineContent: React.FC<
  HuntSessionAttachmentInlineContentProps
> = ({ attachment }) => {
  const parsed = huntSessionAttachmentSchema.safeParse(attachment?.data);
  if (!parsed.success) {
    return (
      <EuiCallOut announceOnMount color="warning" size="s" title={i18n.INVALID_DATA}>
        {i18n.INVALID_DATA_BODY}
      </EuiCallOut>
    );
  }
  const {
    definition,
    trigger,
    has_manual_append: hasManualAppend,
    preservations,
    adjudication,
  } = parsed.data;

  return (
    <div data-test-subj="alertZeroHuntSession">
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
        <EuiFlexItem grow={false}>
          <EuiTitle size="xs">
            <h3>{definition.name}</h3>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiBadge color="hollow" data-test-subj="alertZeroHuntTrigger">
            {trigger === 'manual' ? i18n.TRIGGER_MANUAL : i18n.TRIGGER_AUTOMATED}
          </EuiBadge>
        </EuiFlexItem>
        {hasManualAppend && trigger === 'automated' && (
          <EuiFlexItem grow={false}>
            <EuiBadge color="hollow">{i18n.EXTENDED_BY_ANALYST}</EuiBadge>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      <EuiSpacer size="xs" />
      <EuiText size="s" data-test-subj="alertZeroHuntHypothesis">
        <p>{definition.hypothesis}</p>
      </EuiText>

      {adjudication && (
        <>
          <EuiSpacer size="m" />
          <EuiTitle size="xxs">
            <h4>{i18n.ADJUDICATION_HEADING}</h4>
          </EuiTitle>
          <EuiText size="s" data-test-subj="alertZeroHuntAdjudication">
            <p>
              <EuiBadge color="hollow">{adjudication.severity}</EuiBadge> {adjudication.summary}
            </p>
            <ul>
              {adjudication.hypotheses.map((hypothesis) => (
                <li key={hypothesis}>{hypothesis}</li>
              ))}
            </ul>
          </EuiText>
          <EuiText size="xs" color="subdued">
            {i18n.TIME_RANGE(adjudication.executionWindow.from, adjudication.executionWindow.to)}
          </EuiText>
          <EuiCodeBlock
            language="esql"
            fontSize="s"
            paddingSize="s"
            isCopyable
            overflowHeight={160}
          >
            {adjudication.query}
          </EuiCodeBlock>
        </>
      )}

      {preservations && preservations.length > 0 && (
        <>
          <EuiSpacer size="m" />
          <EuiTitle size="xxs">
            <h4>{i18n.EVIDENCE_HEADING}</h4>
          </EuiTitle>
          {preservations.map((preservation) => (
            <Preservation key={preservation.preservation_id} preservation={preservation} />
          ))}
        </>
      )}
    </div>
  );
};
