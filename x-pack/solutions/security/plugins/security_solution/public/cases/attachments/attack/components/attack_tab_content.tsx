/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { EuiEmptyPrompt, EuiFlexItem, EuiInMemoryTable, EuiText, EuiToolTip } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import type { CommonAttachmentListViewProps } from '@kbn/cases-plugin/public';
import type { AttackDiscoveryAlert } from '@kbn/elastic-assistant-common';
import { replaceAnonymizedValuesWithOriginalValues } from '@kbn/elastic-assistant-common';
import type { AttackAttachmentMetadata } from '../../../../../common/cases/attachments/attack';
import {
  ATTACK_TAB_EMPTY_TEST_ID,
  ATTACK_TAB_ROW_STATUS_TEST_ID,
  ATTACK_TAB_ROW_TITLE_TEST_ID,
  ATTACK_TAB_ROW_UNRESOLVED_TEST_ID,
  ATTACK_TAB_TABLE_TEST_ID,
} from '../../../../../common/cases/attachments/attack/test_ids';
import { useKibana } from '../../../../common/lib/kibana';
import { useAssistantAvailability } from '../../../../assistant/use_assistant_availability';
import { useFindAttackDiscoveries } from '../../../../attack_discovery/pages/use_find_attack_discoveries';
import { FormattedRelativePreferenceDate } from '../../../../common/components/formatted_date';
import { getEmptyValue } from '../../../../common/components/empty_value';
import { RuleStatus } from '../../../../timelines/components/timeline/body/renderers/rule_status';
import { ShowAttackButton } from './show_attack_button';
import type { AttackCaseAttachmentRow } from '../utils';
import { isAttackAttachment, matchesSearchTerm } from '../utils';

/** One attached attack: the snapshot persisted on the attachment, plus the live document when it resolves. */
interface AttackRow {
  /** The attack document `_id`, persisted as the attachment id. */
  attachmentId: string;
  /** The attachment saved object id, used to key the row and the navigation button. */
  savedObjectId: string;
  metadata: AttackAttachmentMetadata;
  createdAt: string;
  attachedBy: string;
  /** The live attack document. Absent while the query runs and when the id cannot be resolved. */
  attack?: AttackDiscoveryAlert;
  /** True once the live query has settled without returning this attack. */
  isUnresolved: boolean;
}

const PAGINATION = { initialPageSize: 10, pageSizeOptions: [10, 25, 50] };
const SORTING = { sort: { field: 'createdAt' as const, direction: 'desc' as const } };

const UNKNOWN_USER = i18n.translate(
  'xpack.securitySolution.attackDiscovery.cases.tab.unknownUser',
  {
    defaultMessage: 'Unknown',
  }
);

const TABLE_CAPTION = i18n.translate('xpack.securitySolution.attackDiscovery.cases.tab.caption', {
  defaultMessage: 'Attacks attached to this case',
});

const UNRESOLVED_TOOLTIP = i18n.translate(
  'xpack.securitySolution.attackDiscovery.cases.tab.unresolvedTooltip',
  {
    defaultMessage:
      'This attack could not be loaded. It may have been deleted, aged into a frozen tier, or be outside your access. The details shown were captured when it was attached.',
  }
);

const getAttachedBy = (createdBy: AttackCaseAttachmentRow['createdBy']): string =>
  createdBy?.fullName || createdBy?.username || createdBy?.email || UNKNOWN_USER;

/**
 * Prefers the live attack title, de-anonymised, and falls back to the snapshot taken at attach
 * time so a row still names its attack when the document cannot be resolved.
 */
const getTitle = (
  attack: AttackDiscoveryAlert | undefined,
  metadata: AttackAttachmentMetadata
): string => {
  if (attack == null) {
    return metadata.title;
  }
  // `_find` is queried with `with_replacements: false`, so live titles arrive anonymised.
  return replaceAnonymizedValuesWithOriginalValues({
    messageContent: attack.title,
    replacements: attack.replacements,
  });
};

/**
 * Renders the "Attacks" accordion body in the case Attachments tab.
 *
 * Filters the case's attack attachments by `searchTerm` in-memory against the persisted
 * metadata before handing the surviving ids to the live query, so a search that matches
 * nothing costs no request.
 */
export const AttackTabContent: React.FC<CommonAttachmentListViewProps> = ({
  caseData,
  searchTerm,
}) => {
  const attachments = useMemo<AttackCaseAttachmentRow[]>(
    () =>
      caseData.comments.flatMap((comment) =>
        isAttackAttachment(comment) && (!searchTerm || matchesSearchTerm(comment, searchTerm))
          ? [comment]
          : []
      ),
    [caseData.comments, searchTerm]
  );

  if (attachments.length === 0) {
    return (
      <EuiEmptyPrompt
        data-test-subj={ATTACK_TAB_EMPTY_TEST_ID}
        iconType="securitySignalDetected"
        iconColor="default"
        titleSize="xs"
        body={
          <p>
            {searchTerm ? (
              <FormattedMessage
                id="xpack.securitySolution.attackDiscovery.cases.tab.noResults"
                defaultMessage="No attacks match your search."
              />
            ) : (
              <FormattedMessage
                id="xpack.securitySolution.attackDiscovery.cases.tab.empty"
                defaultMessage="No attacks have been attached to this case yet."
              />
            )}
          </p>
        }
      />
    );
  }

  return <AttackTabTable attachments={attachments} />;
};

AttackTabContent.displayName = 'AttackTabContent';

/**
 * Deferred inner component — keeps the attacks search request from firing on cases with no
 * attack attachments.
 */
const AttackTabTable = ({ attachments }: { attachments: AttackCaseAttachmentRow[] }) => {
  const { http } = useKibana().services;
  const { isAssistantEnabled } = useAssistantAvailability();

  // One `_find` request for every attached attack rather than one per row. Memoized because
  // the array is part of the react-query key.
  const attackIds = useMemo(
    () => attachments.map(({ attachmentId }) => attachmentId),
    [attachments]
  );

  const { data, isLoading, status } = useFindAttackDiscoveries({
    http,
    ids: attackIds,
    // Attacks attached by a teammate belong to the case regardless of who generated them.
    includeAllAuthors: true,
    // `_find` defaults to 10 per page, which would silently truncate the section.
    perPage: Math.max(attackIds.length, 1),
    // The hook has no separate `enabled` flag; this doubles as one.
    isAssistantEnabled,
  });

  const attacksById = useMemo(
    () =>
      (data?.data ?? []).reduce<Record<string, AttackDiscoveryAlert>>((acc, attack) => {
        acc[attack.id] = attack;
        return acc;
      }, {}),
    [data?.data]
  );

  // A row the query never returned still renders, from the snapshot metadata: the attachment
  // records what the analyst captured, so dropping it would hide evidence. `_find` also
  // filters by visibility, so a missing id is not necessarily a deletion.
  const hasSettled = !isLoading && status !== 'idle';

  const items = useMemo<AttackRow[]>(
    () =>
      attachments.map((attachment) => {
        const attack = attacksById[attachment.attachmentId];
        return {
          attachmentId: attachment.attachmentId,
          savedObjectId: attachment.id,
          metadata: attachment.metadata,
          createdAt: attachment.createdAt,
          attachedBy: getAttachedBy(attachment.createdBy),
          attack,
          isUnresolved: hasSettled && attack == null,
        };
      }),
    [attachments, attacksById, hasSettled]
  );

  const columns = useMemo<Array<EuiBasicTableColumn<AttackRow>>>(
    () => [
      {
        name: i18n.translate('xpack.securitySolution.attackDiscovery.cases.tab.titleColumn', {
          defaultMessage: 'Title',
        }),
        field: 'metadata.title',
        sortable: (row: AttackRow) => getTitle(row.attack, row.metadata),
        render: (_title: string, row: AttackRow) => {
          const title = (
            <EuiText size="s" color={row.isUnresolved ? 'subdued' : 'default'}>
              <span data-test-subj={ATTACK_TAB_ROW_TITLE_TEST_ID}>
                {getTitle(row.attack, row.metadata)}
              </span>
            </EuiText>
          );

          return row.isUnresolved ? (
            <EuiToolTip content={UNRESOLVED_TOOLTIP}>
              {/* Focusable so the explanation is reachable by keyboard: the title is not interactive. */}
              <span data-test-subj={ATTACK_TAB_ROW_UNRESOLVED_TEST_ID} tabIndex={0}>
                {title}
              </span>
            </EuiToolTip>
          ) : (
            title
          );
        },
      },
      {
        name: i18n.translate('xpack.securitySolution.attackDiscovery.cases.tab.riskScoreColumn', {
          defaultMessage: 'Risk score',
        }),
        field: 'metadata.riskScore',
        sortable: (row: AttackRow) => row.attack?.riskScore ?? row.metadata.riskScore ?? -1,
        render: (_riskScore: number | undefined, { attack, metadata }: AttackRow) =>
          attack?.riskScore ?? metadata.riskScore ?? getEmptyValue(),
      },
      {
        name: i18n.translate('xpack.securitySolution.attackDiscovery.cases.tab.alertsColumn', {
          defaultMessage: 'Alerts',
        }),
        field: 'metadata.alertCount',
        sortable: (row: AttackRow) => row.attack?.alertIds?.length ?? row.metadata.alertCount ?? -1,
        render: (_alertCount: number | undefined, { attack, metadata }: AttackRow) =>
          attack?.alertIds?.length ?? metadata.alertCount ?? getEmptyValue(),
      },
      {
        name: i18n.translate('xpack.securitySolution.attackDiscovery.cases.tab.statusColumn', {
          defaultMessage: 'Status',
        }),
        field: 'attack.alertWorkflowStatus',
        sortable: (row: AttackRow) => row.attack?.alertWorkflowStatus ?? '',
        render: (_status: string | undefined, { attack }: AttackRow) => (
          <span data-test-subj={ATTACK_TAB_ROW_STATUS_TEST_ID}>
            {attack?.alertWorkflowStatus != null ? (
              <RuleStatus value={attack.alertWorkflowStatus} />
            ) : (
              getEmptyValue()
            )}
          </span>
        ),
      },
      {
        name: i18n.translate('xpack.securitySolution.attackDiscovery.cases.tab.attachedByColumn', {
          defaultMessage: 'Attached by',
        }),
        field: 'attachedBy',
        sortable: true,
      },
      {
        name: i18n.translate('xpack.securitySolution.attackDiscovery.cases.tab.attachedAtColumn', {
          defaultMessage: 'Attached at',
        }),
        field: 'createdAt',
        sortable: true,
        render: (createdAt: string) => <FormattedRelativePreferenceDate value={createdAt} />,
      },
      {
        name: i18n.translate('xpack.securitySolution.attackDiscovery.cases.tab.actionsColumn', {
          defaultMessage: 'Actions',
        }),
        width: '72px',
        align: 'right',
        render: (row: AttackRow) => (
          <ShowAttackButton
            id={row.savedObjectId}
            attackId={row.attachmentId}
            indexName={row.attack?.index ?? row.metadata.index}
            attackTitle={getTitle(row.attack, row.metadata)}
            isDisabled={row.isUnresolved}
          />
        ),
      },
    ],
    []
  );

  return (
    <EuiFlexItem data-test-subj={ATTACK_TAB_TABLE_TEST_ID}>
      <EuiInMemoryTable
        tableCaption={TABLE_CAPTION}
        columns={columns}
        items={items}
        itemId="savedObjectId"
        loading={isLoading}
        pagination={PAGINATION}
        sorting={SORTING}
      />
    </EuiFlexItem>
  );
};

AttackTabTable.displayName = 'AttackTabTable';

// eslint-disable-next-line import/no-default-export
export default AttackTabContent;
