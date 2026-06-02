/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiEmptyPrompt,
  EuiFlexItem,
  EuiInMemoryTable,
  type EuiBasicTableColumn,
} from '@elastic/eui';
import { FormattedMessage, FormattedRelative } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import type { CommonAttachmentTabViewProps } from '@kbn/cases-plugin/public';
import { SECURITY_ENTITY_ATTACHMENT_TYPE, type CaseUI } from '@kbn/cases-plugin/common';
import type { EntityAttachmentMetadata } from '../../../../../common/cases/attachments/entity';
import { ENTITY_TAB_EMPTY_TEST_ID, ENTITY_TAB_TABLE_TEST_ID } from './test_ids';

type CaseAttachment = CaseUI['comments'][number];

interface EntityRow {
  id: string;
  entityId: string;
  entityName: string;
  entityType: EntityAttachmentMetadata['entityType'];
  riskLevel?: string;
  riskScore?: number;
  createdAt: string;
  createdBy: string;
}

/**
 * Narrow a case attachment to a `security.entity` row. The cases V2 union types
 * `attachmentId` as `string | string[]` (alerts can be batched), so we also
 * defensively reject array ids and missing metadata.
 */
const isEntityAttachment = (
  comment: CaseAttachment
): comment is CaseAttachment & {
  type: typeof SECURITY_ENTITY_ATTACHMENT_TYPE;
  attachmentId: string;
  metadata: EntityAttachmentMetadata;
} => {
  if (comment.type !== SECURITY_ENTITY_ATTACHMENT_TYPE) return false;
  const candidate = comment as CaseAttachment & {
    attachmentId?: unknown;
    metadata?: unknown;
  };
  return (
    typeof candidate.attachmentId === 'string' &&
    candidate.metadata != null &&
    typeof candidate.metadata === 'object'
  );
};

const formatCreatedBy = (createdBy: CaseAttachment['createdBy']) =>
  createdBy?.fullName ?? createdBy?.username ?? createdBy?.email ?? '—';

const matchesSearchTerm = (row: EntityRow, searchTerm: string) => {
  const haystack = `${row.entityName} ${row.entityType} ${row.riskLevel ?? ''}`.toLowerCase();
  return haystack.includes(searchTerm.toLowerCase());
};

const columns: Array<EuiBasicTableColumn<EntityRow>> = [
  {
    field: 'entityName',
    name: i18n.translate('xpack.securitySolution.entityAnalytics.cases.tab.columns.name', {
      defaultMessage: 'Entity name',
    }),
    sortable: true,
  },
  {
    field: 'entityType',
    name: i18n.translate('xpack.securitySolution.entityAnalytics.cases.tab.columns.type', {
      defaultMessage: 'Type',
    }),
    sortable: true,
    width: '120px',
  },
  {
    field: 'riskLevel',
    name: i18n.translate('xpack.securitySolution.entityAnalytics.cases.tab.columns.riskLevel', {
      defaultMessage: 'Risk level',
    }),
    sortable: true,
    width: '120px',
    render: (riskLevel?: string) => riskLevel ?? '—',
  },
  {
    field: 'riskScore',
    name: i18n.translate('xpack.securitySolution.entityAnalytics.cases.tab.columns.riskScore', {
      defaultMessage: 'Risk score',
    }),
    sortable: true,
    width: '110px',
    render: (riskScore?: number) => (typeof riskScore === 'number' ? Math.round(riskScore) : '—'),
  },
  {
    field: 'createdBy',
    name: i18n.translate('xpack.securitySolution.entityAnalytics.cases.tab.columns.addedBy', {
      defaultMessage: 'Added by',
    }),
    sortable: true,
  },
  {
    field: 'createdAt',
    name: i18n.translate('xpack.securitySolution.entityAnalytics.cases.tab.columns.addedAt', {
      defaultMessage: 'Added at',
    }),
    sortable: true,
    width: '160px',
    render: (createdAt: string) => <FormattedRelative value={new Date(createdAt)} />,
  },
];

/**
 * Renders the body of the "Entity" accordion in the case Attachments tab. Lists
 * every `security.entity` attachment on the case, sourced from `caseData.comments`
 * (no extra fetch). The search term from the parent tab filters by entity name,
 * type, and risk level.
 */
export const EntityTabContent: React.FC<CommonAttachmentTabViewProps> = ({
  caseData,
  searchTerm,
}) => {
  const rows = useMemo<EntityRow[]>(() => {
    const items: EntityRow[] = [];
    for (const comment of caseData.comments) {
      if (!isEntityAttachment(comment)) continue;
      items.push({
        id: comment.id,
        entityId: comment.attachmentId,
        entityName: comment.metadata.entityName,
        entityType: comment.metadata.entityType,
        riskLevel: comment.metadata.riskLevel,
        riskScore: comment.metadata.riskScore,
        createdAt: comment.createdAt,
        createdBy: formatCreatedBy(comment.createdBy),
      });
    }
    if (!searchTerm) return items;
    return items.filter((row) => matchesSearchTerm(row, searchTerm));
  }, [caseData.comments, searchTerm]);

  if (rows.length === 0) {
    return (
      <EuiEmptyPrompt
        data-test-subj={ENTITY_TAB_EMPTY_TEST_ID}
        iconType="user"
        iconColor="default"
        titleSize="xs"
        body={
          <p>
            {searchTerm ? (
              <FormattedMessage
                id="xpack.securitySolution.entityAnalytics.cases.tab.noResults"
                defaultMessage="No entities match your search."
              />
            ) : (
              <FormattedMessage
                id="xpack.securitySolution.entityAnalytics.cases.tab.empty"
                defaultMessage="No entities have been attached to this case yet."
              />
            )}
          </p>
        }
      />
    );
  }

  return (
    <EuiFlexItem data-test-subj={ENTITY_TAB_TABLE_TEST_ID}>
      <EuiInMemoryTable
        items={rows}
        columns={columns}
        itemId="id"
        sorting={{ sort: { field: 'createdAt', direction: 'desc' } }}
        pagination={{ pageSizeOptions: [10, 25, 50] }}
      />
    </EuiFlexItem>
  );
};

EntityTabContent.displayName = 'EntityTabContent';

// eslint-disable-next-line import/no-default-export
export default EntityTabContent;
