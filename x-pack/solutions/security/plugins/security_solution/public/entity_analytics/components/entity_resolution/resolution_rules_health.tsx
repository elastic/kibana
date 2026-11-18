/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import type { CriteriaWithPagination, EuiBasicTableColumn } from '@elastic/eui';
import {
  EuiBadge,
  EuiBasicTable,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiCopy,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSkeletonText,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import { useResolutionRulesHealth } from './hooks/use_resolution_rules_health';
import { useSetResolutionRuleEnabled } from './hooks/use_set_resolution_rule_enabled';
import { useCanModifyResolution } from './hooks/use_can_modify_resolution';
import type {
  ResolutionRuleHealth,
  ResolutionRuleHealthStatus,
} from './hooks/use_resolution_rules_health';
import {
  RULES_HEALTH_ALL_WORKING,
  RULES_HEALTH_COLUMN_DETAILS,
  RULES_HEALTH_COLUMN_ENABLED,
  RULES_HEALTH_COLUMN_RULE,
  RULES_HEALTH_COPY_LABEL,
  RULES_HEALTH_FILTER_FAILING_LABEL,
  RULES_HEALTH_SHOW_ALL_RULES,
  RULES_HEALTH_COLUMN_STATUS,
  RULES_HEALTH_ERROR,
  RULES_HEALTH_FAILING,
  RULES_HEALTH_LAST_RUN,
  RULES_HEALTH_NO_RUN,
  RULES_HEALTH_OFF_DETAILS,
  RULES_HEALTH_STATUS_LABELS,
  RULES_HEALTH_TABLE_CAPTION,
  RULES_HEALTH_TOGGLE_LABEL,
  RULES_HEALTH_TITLE,
  RULE_CHECK_FAILURE_DETAILS,
  RULE_CHECK_PROTOTYPE_BADGE,
} from './translations';
import { getRuleFailureHint } from './rule_failure_hint';
import { buildRuleFailureReport } from './rule_failure_report';
import { RESOLUTION_RULES_HEALTH_TEST_ID } from './test_ids';

const PAGE_SIZE_OPTIONS = [5, 10, 25];

const STATUS_COLORS: Record<ResolutionRuleHealthStatus, string> = {
  failing: 'danger',
  healthy: 'success',
  not_run_yet: 'hollow',
  off: 'default',
};

const getDetails = ({ status, failure, last_run: lastRun }: ResolutionRuleHealth): string => {
  if (status === 'off') {
    return RULES_HEALTH_OFF_DETAILS;
  }
  if (failure) {
    return RULE_CHECK_FAILURE_DETAILS(
      failure.consecutive_failures,
      failure.next_attempt_at ?? '-',
      failure.last_error ?? '-'
    );
  }
  return lastRun
    ? RULES_HEALTH_LAST_RUN(
        lastRun.links_created,
        lastRun.skipped_ambiguous,
        lastRun.skipped_oversized
      )
    : RULES_HEALTH_NO_RUN;
};

const getColumns = ({
  canToggle,
  onToggle,
}: {
  canToggle: boolean;
  onToggle: (ruleId: string, enabled: boolean) => void;
}): Array<EuiBasicTableColumn<ResolutionRuleHealth>> => [
  {
    field: 'rule_id',
    name: RULES_HEALTH_COLUMN_RULE,
    width: '45%',
    render: (ruleId: string, { description }: ResolutionRuleHealth) => (
      <div>
        <EuiText size="s">
          <strong>{ruleId}</strong>
        </EuiText>
        <EuiText size="xs" color="subdued">
          {description}
        </EuiText>
      </div>
    ),
  },
  {
    field: 'status',
    name: RULES_HEALTH_COLUMN_STATUS,
    width: '120px',
    render: (status: ResolutionRuleHealthStatus) => (
      <EuiBadge color={STATUS_COLORS[status]}>{RULES_HEALTH_STATUS_LABELS[status]}</EuiBadge>
    ),
  },
  {
    field: 'enabled',
    name: RULES_HEALTH_COLUMN_ENABLED,
    width: '90px',
    render: (enabled: boolean, { rule_id: ruleId }: ResolutionRuleHealth) => (
      <EuiSwitch
        showLabel={false}
        label={RULES_HEALTH_TOGGLE_LABEL(ruleId)}
        checked={enabled}
        disabled={!canToggle}
        onChange={(event) => onToggle(ruleId, event.target.checked)}
        data-test-subj={`${RESOLUTION_RULES_HEALTH_TEST_ID}Toggle-${ruleId}`}
      />
    ),
  },
  {
    name: RULES_HEALTH_COLUMN_DETAILS,
    render: (rule: ResolutionRuleHealth) => (
      <EuiFlexGroup gutterSize="s" alignItems="flexStart" responsive={false}>
        <EuiFlexItem>
          <EuiText size="xs" color={rule.status === 'failing' ? 'danger' : 'subdued'}>
            {getDetails(rule)}
          </EuiText>
          {rule.failure && getRuleFailureHint(rule.failure.last_error) && (
            <EuiText size="xs" color="subdued">
              {getRuleFailureHint(rule.failure.last_error)}
            </EuiText>
          )}
        </EuiFlexItem>
        {rule.failure && (
          <EuiFlexItem grow={false}>
            <EuiCopy textToCopy={buildRuleFailureReport(rule)}>
              {(copy) => (
                <EuiToolTip content={RULES_HEALTH_COPY_LABEL} disableScreenReaderOutput>
                  <EuiButtonIcon
                    iconType="copy"
                    size="xs"
                    aria-label={RULES_HEALTH_COPY_LABEL}
                    onClick={copy}
                    data-test-subj={`${RESOLUTION_RULES_HEALTH_TEST_ID}Copy-${rule.rule_id}`}
                  />
                </EuiToolTip>
              )}
            </EuiCopy>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    ),
  },
];

/**
 * PROTOTYPE, not for merge: one row per resolution rule on the Entity resolution settings tab,
 * so a rule that keeps failing is visible without opening an entity.
 */
export const ResolutionRulesHealth: React.FC = () => {
  const { data, isLoading, isError } = useResolutionRulesHealth();
  const { canModify } = useCanModifyResolution();
  const { mutate, isLoading: isToggling } = useSetResolutionRuleEnabled();
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);
  const [onlyFailing, setOnlyFailing] = useState(false);
  // Failing rules first, so pagination can never hide one on a later page.
  const visibleRules = useMemo(() => {
    const rules = [...(data?.rules ?? [])].sort(
      (a, b) => Number(b.status === 'failing') - Number(a.status === 'failing')
    );
    return onlyFailing ? rules.filter(({ status }) => status === 'failing') : rules;
  }, [data, onlyFailing]);
  const columns = useMemo(
    () =>
      getColumns({
        canToggle: canModify && !isToggling,
        onToggle: (ruleId, enabled) => mutate({ ruleId, enabled }),
      }),
    [canModify, isToggling, mutate]
  );

  return (
    <EuiPanel hasBorder paddingSize="m" data-test-subj={RESOLUTION_RULES_HEALTH_TEST_ID}>
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiTitle size="xs">
            <h3>{RULES_HEALTH_TITLE}</h3>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiBadge color="hollow">{RULE_CHECK_PROTOTYPE_BADGE}</EuiBadge>
        </EuiFlexItem>
        {data && (
          <EuiFlexItem grow={false}>
            {data.failing > 0 ? (
              <EuiBadge
                color="danger"
                onClick={() => {
                  setOnlyFailing(true);
                  setPageIndex(0);
                }}
                onClickAriaLabel={RULES_HEALTH_FILTER_FAILING_LABEL}
              >
                {RULES_HEALTH_FAILING(data.failing)}
              </EuiBadge>
            ) : (
              <EuiBadge color="success">{RULES_HEALTH_ALL_WORKING}</EuiBadge>
            )}
          </EuiFlexItem>
        )}
        {onlyFailing && (
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              size="xs"
              onClick={() => {
                setOnlyFailing(false);
                setPageIndex(0);
              }}
            >
              {RULES_HEALTH_SHOW_ALL_RULES}
            </EuiButtonEmpty>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      {isLoading && <EuiSkeletonText lines={4} />}
      {isError && (
        <EuiText size="s" color="danger">
          {RULES_HEALTH_ERROR}
        </EuiText>
      )}
      {data && (
        <EuiBasicTable<ResolutionRuleHealth>
          tableCaption={RULES_HEALTH_TABLE_CAPTION}
          items={visibleRules.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize)}
          pagination={{
            pageIndex,
            pageSize,
            totalItemCount: visibleRules.length,
            pageSizeOptions: PAGE_SIZE_OPTIONS,
          }}
          onChange={({ page }: CriteriaWithPagination<ResolutionRuleHealth>) => {
            if (page) {
              setPageIndex(page.index);
              setPageSize(page.size);
            }
          }}
          columns={columns}
        />
      )}
    </EuiPanel>
  );
};
