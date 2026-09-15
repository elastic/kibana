/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiBadge,
  EuiBasicTable,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiText,
  EuiToolTip,
  type EuiBasicTableColumn,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { AttachmentRenderProps } from '@kbn/agent-builder-browser/attachments';
import type { Attachment } from '@kbn/agent-builder-common/attachments';
import type { SecurityAgentBuilderAttachments } from '../../../../common/constants';

export const INVESTIGATION_IOCS_ATTACHMENT_TEST_ID =
  'securitySolutionAgentBuilderInvestigationIocsAttachment';

export interface InvestigationIoc {
  value: string;
  comment?: string;
}

export const INVESTIGATION_IOC_CATEGORIES = [
  'shas',
  'ips',
  'file_paths',
  'malicious_commands',
  'ransom_note',
  'encryption_marker',
  'compromised_identities',
  'affected_hosts',
] as const;

export type InvestigationIocCategory = (typeof INVESTIGATION_IOC_CATEGORIES)[number];

export type InvestigationIocsAttachmentData = {
  attachmentLabel?: string;
} & Partial<Record<InvestigationIocCategory, InvestigationIoc[]>>;

export type InvestigationIocsAttachment = Attachment<
  typeof SecurityAgentBuilderAttachments.investigationIocs,
  InvestigationIocsAttachmentData
>;

interface IocCategoryRow {
  id: InvestigationIocCategory;
  typeLabel: string;
  items: InvestigationIoc[];
}

const TYPE_COLUMN = i18n.translate(
  'xpack.securitySolution.agentBuilder.investigationIocs.typeColumn',
  { defaultMessage: 'IOC type' }
);
const VALUE_COLUMN = i18n.translate(
  'xpack.securitySolution.agentBuilder.investigationIocs.valueColumn',
  { defaultMessage: 'Indicators' }
);

const CATEGORY_LABELS: Record<InvestigationIocCategory, string> = {
  shas: i18n.translate('xpack.securitySolution.agentBuilder.investigationIocs.category.shas', {
    defaultMessage: 'SHA256',
  }),
  ips: i18n.translate('xpack.securitySolution.agentBuilder.investigationIocs.category.ips', {
    defaultMessage: 'IP addresses',
  }),
  file_paths: i18n.translate(
    'xpack.securitySolution.agentBuilder.investigationIocs.category.filePaths',
    { defaultMessage: 'File paths' }
  ),
  malicious_commands: i18n.translate(
    'xpack.securitySolution.agentBuilder.investigationIocs.category.maliciousCommands',
    { defaultMessage: 'Malicious command lines' }
  ),
  ransom_note: i18n.translate(
    'xpack.securitySolution.agentBuilder.investigationIocs.category.ransomNote',
    { defaultMessage: 'Ransom notes' }
  ),
  encryption_marker: i18n.translate(
    'xpack.securitySolution.agentBuilder.investigationIocs.category.encryptionMarker',
    { defaultMessage: 'Encryption markers' }
  ),
  compromised_identities: i18n.translate(
    'xpack.securitySolution.agentBuilder.investigationIocs.category.compromisedIdentities',
    { defaultMessage: 'Compromised identities' }
  ),
  affected_hosts: i18n.translate(
    'xpack.securitySolution.agentBuilder.investigationIocs.category.affectedHosts',
    { defaultMessage: 'Affected hosts' }
  ),
};

const wrappingCellCss = css`
  overflow-wrap: anywhere;
`;

const TABLE_CAPTION = i18n.translate(
  'xpack.securitySolution.agentBuilder.investigationIocs.tableCaption',
  { defaultMessage: 'Indicators of compromise by type' }
);

const isIoc = (value: unknown): value is InvestigationIoc => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const item = value as { value?: unknown; comment?: unknown };
  if (typeof item.value !== 'string' || item.value === '') {
    return false;
  }
  return item.comment === undefined || typeof item.comment === 'string';
};

const parseIocs = (value: unknown): InvestigationIoc[] =>
  Array.isArray(value) ? value.filter(isIoc) : [];

export const parseIocCategoryRows = (data: unknown): IocCategoryRow[] => {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return [];
  }
  const payload = data as Record<string, unknown>;
  return INVESTIGATION_IOC_CATEGORIES.flatMap((category) => {
    const items = parseIocs(payload[category]);
    if (items.length === 0) {
      return [];
    }
    return [{ id: category, typeLabel: CATEGORY_LABELS[category], items }];
  });
};

const IocBadges: React.FC<{ items: InvestigationIoc[] }> = ({ items }) => (
  <EuiFlexGroup gutterSize="s" wrap responsive={false} css={wrappingCellCss}>
    {items.map((item, index) => {
      const badge = (
        <EuiBadge color="hollow" data-test-subj={`investigationIocBadge-${index}`}>
          {item.value}
        </EuiBadge>
      );
      return (
        <EuiFlexItem key={`${item.value}-${index}`} grow={false}>
          {item.comment ? (
            <EuiToolTip content={item.comment}>
              <span tabIndex={0}>{badge}</span>
            </EuiToolTip>
          ) : (
            badge
          )}
        </EuiFlexItem>
      );
    })}
  </EuiFlexGroup>
);

/**
 * Category table for a `security.investigation.iocs` attachment: one row per filled category,
 * with each indicator as a badge and its comment in a tooltip.
 */
export const InvestigationIocsInlineContent: React.FC<
  AttachmentRenderProps<Attachment<string, unknown>>
> = ({ attachment }) => {
  const rows = useMemo(() => parseIocCategoryRows(attachment.data), [attachment.data]);

  const columns = useMemo<Array<EuiBasicTableColumn<IocCategoryRow>>>(
    () => [
      {
        field: 'typeLabel',
        name: TYPE_COLUMN,
        width: '14em',
        render: (typeLabel: string) => (
          <EuiText size="s" css={wrappingCellCss}>
            {typeLabel}
          </EuiText>
        ),
      },
      {
        field: 'items',
        name: VALUE_COLUMN,
        render: (items: InvestigationIoc[]) => <IocBadges items={items} />,
      },
    ],
    []
  );

  if (rows.length === 0) {
    return (
      <EuiPanel
        hasShadow={false}
        hasBorder={false}
        paddingSize="m"
        data-test-subj={INVESTIGATION_IOCS_ATTACHMENT_TEST_ID}
      >
        <EuiText size="s" color="subdued">
          <FormattedMessage
            id="xpack.securitySolution.agentBuilder.investigationIocs.empty"
            defaultMessage="No indicators were extracted from the available telemetry."
          />
        </EuiText>
      </EuiPanel>
    );
  }

  return (
    <EuiPanel
      hasShadow={false}
      hasBorder={false}
      paddingSize="s"
      data-test-subj={INVESTIGATION_IOCS_ATTACHMENT_TEST_ID}
    >
      <EuiBasicTable
        tableCaption={TABLE_CAPTION}
        items={rows}
        columns={columns}
        itemId="id"
        tableLayout="auto"
        responsiveBreakpoint={false}
      />
    </EuiPanel>
  );
};
