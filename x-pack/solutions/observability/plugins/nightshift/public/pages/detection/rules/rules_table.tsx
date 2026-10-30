/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiInMemoryTable,
  EuiLink,
  EuiPopover,
  EuiText,
  EuiToolTip,
  type EuiBasicTableColumn,
} from '@elastic/eui';
import { getEbtProps } from '@kbn/ebt-click';
import type { TimeRange } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import { DISCOVER_APP_LOCATOR } from '@kbn/deeplinks-analytics';
import type { DiscoverAppLocatorParams } from '@kbn/discover-plugin/common';
import { buildDiscoverParams } from '../../../common/discover_helpers';
import { NIGHTSHIFT_EBT_ACTIONS, NIGHTSHIFT_EBT_ELEMENTS } from '../../../common/ebt_constants';
import { useFormatTimestamp } from '../../../hooks/use_format_timestamp';
import { getRuleStatusPresentation } from '../../../components/entities/rule/rule_status';
import { SeverityBadge } from '../../../components/ui/severity_badge';
import type { DetectionRule } from '../../../data/rules/use_detection_rules';
import { useKibana } from '../../../hooks/use_kibana';
import {
  ACTIONS_LABEL,
  DELETE_LABEL,
  DISCOVER_LABEL,
  IMPACT_LABEL,
  LAST_ACTIVITY_LABEL,
  LAST_ACTIVITY_TOOLTIP,
  MATCHES_LABEL,
  MATCHES_TOOLTIP,
  STATUS_LABEL,
  TITLE_LABEL,
} from './translations';

const RuleActions = ({
  rule,
  discoverHref,
  canManage,
  blocksActivity,
  activityBlockTooltip,
  onDelete,
}: {
  rule: DetectionRule;
  discoverHref?: string;
  canManage: boolean;
  blocksActivity: boolean;
  activityBlockTooltip?: string;
  onDelete: (rule: DetectionRule) => void;
}) => {
  const [isOpen, setOpen] = useState(false);
  return (
    <EuiPopover
      aria-label={ACTIONS_LABEL}
      isOpen={isOpen}
      closePopover={() => setOpen(false)}
      button={
        <EuiToolTip content={ACTIONS_LABEL} disableScreenReaderOutput>
          <EuiButtonIcon
            data-test-subj="nightshiftRuleActionsButton"
            iconType="ellipsis"
            aria-label={ACTIONS_LABEL}
            onClick={() => setOpen(true)}
          />
        </EuiToolTip>
      }
      panelPaddingSize="none"
    >
      <EuiContextMenuPanel
        items={[
          ...(discoverHref
            ? [
                <EuiContextMenuItem
                  key="discover"
                  icon="discoverApp"
                  href={discoverHref}
                  onClick={() => setOpen(false)}
                  {...getEbtProps({
                    action: NIGHTSHIFT_EBT_ACTIONS.OPEN_RULE_IN_DISCOVER,
                    element: NIGHTSHIFT_EBT_ELEMENTS.DETECTION_RULES_TABLE,
                  })}
                >
                  {DISCOVER_LABEL}
                </EuiContextMenuItem>,
              ]
            : []),
          ...(canManage
            ? [
                <EuiContextMenuItem
                  key="delete"
                  icon="trash"
                  color="danger"
                  disabled={blocksActivity}
                  toolTipContent={activityBlockTooltip}
                  onClick={() => {
                    setOpen(false);
                    onDelete(rule);
                  }}
                  {...getEbtProps({
                    action: NIGHTSHIFT_EBT_ACTIONS.DELETE_RULES,
                    element: NIGHTSHIFT_EBT_ELEMENTS.DETECTION_RULES_TABLE,
                  })}
                >
                  {DELETE_LABEL}
                </EuiContextMenuItem>,
              ]
            : []),
        ]}
      />
    </EuiPopover>
  );
};

export const RulesTable = ({
  rules,
  loading,
  selectedRuleId,
  selected,
  canManage,
  blocksActivity,
  activityBlockTooltip,
  timeRange,
  onOpen,
  onDelete,
  onSelectionChange,
  onOpenLinkMount,
}: {
  rules: DetectionRule[];
  loading: boolean;
  selectedRuleId?: string;
  selected: DetectionRule[];
  canManage: boolean;
  blocksActivity: boolean;
  activityBlockTooltip?: string;
  timeRange: TimeRange;
  onOpen: (rule: DetectionRule) => void;
  onDelete: (rule: DetectionRule) => void;
  onSelectionChange: (rules: DetectionRule[]) => void;
  onOpenLinkMount: (id: string, element: HTMLAnchorElement | HTMLButtonElement | null) => void;
}) => {
  const formatTimestamp = useFormatTimestamp();
  const { share } = useKibana().services;
  const locator = share.url.locators.get<DiscoverAppLocatorParams>(DISCOVER_APP_LOCATOR);
  const columns: Array<EuiBasicTableColumn<DetectionRule>> = [
    {
      field: 'query.title',
      name: TITLE_LABEL,
      sortable: (rule) => rule.query.title,
      render: (_title: string, rule: DetectionRule) => (
        <EuiLink
          onClick={() => onOpen(rule)}
          ref={(element) => onOpenLinkMount(rule.query.id, element)}
          data-test-subj={`nightshiftRuleTitle-${rule.query.id}`}
          {...getEbtProps({
            action: NIGHTSHIFT_EBT_ACTIONS.VIEW_RULE,
            element: NIGHTSHIFT_EBT_ELEMENTS.DETECTION_RULES_TABLE,
          })}
        >
          {rule.query.title}
        </EuiLink>
      ),
    },
    {
      field: 'query.severity_score',
      name: IMPACT_LABEL,
      sortable: (rule) => rule.query.severity_score ?? -1,
      render: (_score: number | undefined, rule: DetectionRule) => (
        <SeverityBadge score={rule.query.severity_score} textSize="s" />
      ),
    },
    {
      field: 'lastActivity',
      name: LAST_ACTIVITY_LABEL,
      nameTooltip: { content: LAST_ACTIVITY_TOOLTIP },
      sortable: (rule) => rule.lastActivity ?? -1,
      render: (_lastActivity: number | undefined, rule: DetectionRule) =>
        rule.lastActivity ? formatTimestamp(new Date(rule.lastActivity).toISOString()) : '–',
    },
    {
      name: STATUS_LABEL,
      render: (rule: DetectionRule) => {
        const status = getRuleStatusPresentation(rule.status);
        if (!status) return '–';
        const content = (
          <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiIcon type={status.iconType} color={status.color} aria-hidden={true} />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="s">{status.label}</EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        );
        return status.tooltip ? (
          <EuiToolTip content={status.tooltip}>{content}</EuiToolTip>
        ) : (
          content
        );
      },
    },
    {
      field: 'matches',
      name: MATCHES_LABEL,
      nameTooltip: { content: MATCHES_TOOLTIP },
      sortable: (rule) => rule.matches,
      render: (matches: number) => matches.toLocaleString(i18n.getLocale()),
    },
    ...(locator || canManage
      ? [
          {
            name: ACTIONS_LABEL,
            render: (rule: DetectionRule) => (
              <RuleActions
                rule={rule}
                canManage={canManage}
                blocksActivity={blocksActivity}
                activityBlockTooltip={activityBlockTooltip}
                onDelete={onDelete}
                discoverHref={locator?.getRedirectUrl(
                  buildDiscoverParams(rule.query.esql.query, timeRange)
                )}
              />
            ),
          },
        ]
      : []),
  ];
  return (
    <EuiInMemoryTable<DetectionRule>
      items={rules}
      itemId={(rule) => rule.query.id}
      columns={columns}
      loading={loading}
      sorting={{ sort: { field: 'query.severity_score', direction: 'desc' } }}
      pagination={{ initialPageSize: 25, pageSizeOptions: [10, 25, 50] }}
      selection={canManage ? { selected, onSelectionChange } : undefined}
      rowProps={(rule) => ({ isSelected: rule.query.id === selectedRuleId })}
      data-test-subj="nightshiftDetectionRulesTable"
      tableCaption={i18n.translate('xpack.nightshift.detectionPage.rules.tableCaption', {
        defaultMessage: 'Detection rules',
      })}
    />
  );
};
