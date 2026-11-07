/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiBadge,
  EuiButtonGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiLoadingSpinner,
  EuiPanel,
  EuiText,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import {
  ConversationCard,
  useCaseBridge,
  type BaseActionsProps,
  type CaseBridgeCaseSummary,
  type Investigation,
} from '@kbn/agentic-investigations-common';
import {
  groupAsOneList,
  groupByCase,
  type QueueGroup,
  type QueueGroupBy,
  type QueueRow,
} from './group_by';
import { QUEUE_GROUP_BY } from '../translations';

const STATUS_BADGE: Record<string, { color: string; label: string }> = {
  open: { color: 'primary', label: QUEUE_GROUP_BY.statusOpen },
  'in-progress': { color: 'warning', label: QUEUE_GROUP_BY.statusInProgress },
  closed: { color: 'default', label: QUEUE_GROUP_BY.statusClosed },
};

export const GroupByControl: React.FC<{
  groupBy: QueueGroupBy;
  onChange: (groupBy: QueueGroupBy) => void;
}> = ({ groupBy, onChange }) => (
  <EuiFlexGroup justifyContent="flexEnd" alignItems="center" gutterSize="s" responsive={false}>
    <EuiFlexItem grow={false}>
      <EuiText size="s" id="alertzeroQueueGroupByLabel">
        <strong>{QUEUE_GROUP_BY.label}</strong>
      </EuiText>
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiButtonGroup
        legend={QUEUE_GROUP_BY.label}
        buttonSize="compressed"
        idSelected={groupBy}
        onChange={(id) => onChange(id as QueueGroupBy)}
        options={[
          {
            id: 'type',
            label: QUEUE_GROUP_BY.type,
            'data-test-subj': 'alertzeroQueueGroupBy-type',
          },
          {
            id: 'case',
            label: QUEUE_GROUP_BY.case,
            'data-test-subj': 'alertzeroQueueGroupBy-case',
          },
          {
            id: 'none',
            label: QUEUE_GROUP_BY.none,
            'data-test-subj': 'alertzeroQueueGroupBy-none',
          },
        ]}
        data-test-subj="alertzeroQueueGroupBy"
      />
    </EuiFlexItem>
  </EuiFlexGroup>
);

export interface GroupedQueueProps {
  groupBy: Exclude<QueueGroupBy, 'type'>;
  rows: QueueRow[];
  selectedProposalId?: string;
  onClickAction: BaseActionsProps['onClickAction'];
  onClickCard: (id: Investigation['id']) => void;
  onOpenChat: (id: Investigation['id']) => void;
  canOpenInvestigationDetails?: boolean;
  getChatHref: (id: Investigation['id']) => string | undefined;
  canManageEscalations?: boolean;
  canCloseInvestigation?: boolean;
  onCopyLink: BaseActionsProps['onCopyLink'];
  renderAssignees: (investigation: Investigation) => React.ReactNode;
  renderInFlightStatus?: (investigation: Investigation) => React.ReactNode;
}

const CaseGroupHeader: React.FC<{
  caseId: string;
  summary: CaseBridgeCaseSummary | undefined;
  group: QueueGroup;
  onViewCase?: (caseId: string) => void;
}> = ({ caseId, summary, group, onViewCase }) => {
  // Not yet read: the cards stay in their case's group, under a header that is still loading.
  const title = summary
    ? summary.incrementalId != null
      ? QUEUE_GROUP_BY.caseTitle(`#${summary.incrementalId}`, summary.title)
      : QUEUE_GROUP_BY.caseUnnumbered(summary.title)
    : undefined;
  const status = summary ? STATUS_BADGE[summary.status] : undefined;
  return (
    <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} wrap>
      <EuiFlexItem grow={false}>
        <EuiIcon type="casesApp" aria-hidden={true} />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        {title ? (
          <EuiTitle size="xxs">
            <h3>
              <EuiLink
                onClick={() => onViewCase?.(caseId)}
                data-test-subj={`alertzeroQueueCaseGroupLink-${caseId}`}
              >
                {title}
              </EuiLink>
            </h3>
          </EuiTitle>
        ) : (
          <EuiLoadingSpinner
            size="s"
            aria-label={QUEUE_GROUP_BY.caseLoading}
            data-test-subj="alertzeroQueueCaseGroupLoading"
          />
        )}
      </EuiFlexItem>
      {status && (
        <EuiFlexItem grow={false}>
          <EuiBadge color={status.color} data-test-subj="alertzeroQueueCaseGroupStatus">
            {status.label}
          </EuiBadge>
        </EuiFlexItem>
      )}
      {summary?.isRestricted && (
        <EuiFlexItem grow={false}>
          <EuiBadge
            color="default"
            iconType="lock"
            data-test-subj="alertzeroQueueCaseGroupRestricted"
          >
            {QUEUE_GROUP_BY.restricted}
          </EuiBadge>
        </EuiFlexItem>
      )}
      <EuiFlexItem grow={false}>
        <EuiText size="xs" color="subdued">
          {QUEUE_GROUP_BY.counts(group.investigationCount, group.pendingCount)}
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const PlainGroupHeader: React.FC<{ title: string; group: QueueGroup; tooltip?: string }> = ({
  title,
  group,
  tooltip,
}) => {
  const heading = (
    <EuiTitle size="xxs">
      <h3 tabIndex={tooltip ? 0 : undefined}>{title}</h3>
    </EuiTitle>
  );
  return (
    <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} wrap>
      <EuiFlexItem grow={false}>
        {tooltip ? <EuiToolTip content={tooltip}>{heading}</EuiToolTip> : heading}
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText size="xs" color="subdued">
          {QUEUE_GROUP_BY.counts(group.investigationCount, group.pendingCount)}
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

/**
 * The queue regrouped by case, or as one list. Same cards as the Proposal type grouping; only
 * the sections change.
 */
export const GroupedQueue: React.FC<GroupedQueueProps> = ({
  groupBy,
  rows,
  selectedProposalId,
  renderAssignees,
  renderInFlightStatus,
  getChatHref,
  ...cardProps
}) => {
  const caseBridge = useCaseBridge();
  const groups = useMemo(() => {
    if (groupBy === 'none') {
      return [groupAsOneList(rows)];
    }
    return groupByCase(
      rows,
      (investigation) =>
        investigation.caseId ||
        (investigation.conversationId
          ? caseBridge?.resolveCaseId?.(investigation.conversationId)
          : undefined),
      (caseId) => caseBridge?.getCaseSummary?.(caseId) === null
    );
  }, [groupBy, rows, caseBridge]);

  const renderCards = (group: QueueGroup) =>
    group.rows.length === 0 ? (
      <EuiPanel hasBorder={false} hasShadow={false}>
        <EuiText size="xs" color="subdued">
          {QUEUE_GROUP_BY.empty}
        </EuiText>
      </EuiPanel>
    ) : (
      <EuiFlexGroup direction="column" gutterSize="none">
        {group.rows.map(({ investigation }) => (
          <ConversationCard
            key={investigation.id}
            investigation={investigation}
            isSelected={investigation.id === selectedProposalId}
            chatHref={getChatHref(investigation.id)}
            renderAssignees={renderAssignees}
            renderInFlightStatus={renderInFlightStatus}
            {...cardProps}
          />
        ))}
      </EuiFlexGroup>
    );

  if (groupBy === 'none') {
    const [group] = groups;
    return (
      <EuiFlexGroup direction="column" gutterSize="s" data-test-subj="alertzeroQueueFlatList">
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued" data-test-subj="alertzeroQueueFlatCount">
            {QUEUE_GROUP_BY.flatCount(group.investigationCount, group.pendingCount)}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiPanel paddingSize="none" hasBorder>
            {renderCards(group)}
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  if (groups.length === 0) {
    return (
      <EuiPanel hasBorder data-test-subj="alertzeroQueueCaseGroups">
        <EuiText size="xs" color="subdued">
          {QUEUE_GROUP_BY.empty}
        </EuiText>
      </EuiPanel>
    );
  }

  return (
    <EuiFlexGroup direction="column" gutterSize="l" data-test-subj="alertzeroQueueCaseGroups">
      {groups.map((group) => {
        const key = group.caseId ?? group.kind;
        let header: React.ReactNode;
        if (group.kind === 'case' && group.caseId) {
          header = (
            <CaseGroupHeader
              caseId={group.caseId}
              summary={caseBridge?.getCaseSummary?.(group.caseId) ?? undefined}
              group={group}
              onViewCase={caseBridge?.onViewCase}
            />
          );
        } else if (group.kind === 'unavailable') {
          header = (
            <PlainGroupHeader
              title={QUEUE_GROUP_BY.caseUnavailable}
              tooltip={QUEUE_GROUP_BY.caseUnavailableTooltip}
              group={group}
            />
          );
        } else {
          header = <PlainGroupHeader title={QUEUE_GROUP_BY.noCase} group={group} />;
        }
        return (
          <EuiFlexItem key={key} grow={false} data-test-subj={`alertzeroQueueGroup-${key}`}>
            <EuiPanel paddingSize="none" hasBorder>
              <EuiPanel paddingSize="m" hasBorder={false} hasShadow={false} color="subdued">
                {header}
              </EuiPanel>
              {renderCards(group)}
            </EuiPanel>
          </EuiFlexItem>
        );
      })}
    </EuiFlexGroup>
  );
};
