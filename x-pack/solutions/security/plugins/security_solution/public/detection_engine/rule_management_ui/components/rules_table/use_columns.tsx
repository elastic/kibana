/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiBasicTableColumn, EuiTableActionsColumnType } from '@elastic/eui';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiText,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import type { GapFillStatus } from '@kbn/alerting-plugin/common';
import { FormattedMessage } from '@kbn/i18n-react';
import { gapFillStatus } from '@kbn/alerting-plugin/common';
import type { GetGapsSummaryByRuleIdsResponseBody } from '@kbn/alerting-plugin/common/routes/gaps/apis/get_gaps_summary_by_rule_ids';
import moment from 'moment';
import React, { useMemo } from 'react';
import { RulesTableEmptyColumnName } from './rules_table_empty_column_name';
import type { SecurityJob } from '../../../../common/components/ml_popover/types';
import {
  DEFAULT_RELATIVE_DATE_THRESHOLD,
  SecurityPageName,
  SHOW_RELATED_INTEGRATIONS_SETTING,
} from '../../../../../common/constants';
import type { RuleExecutionSummary } from '../../../../../common/api/detection_engine/rule_monitoring';
import { isMlRule } from '../../../../../common/machine_learning/helpers';
import { getEmptyTagValue } from '../../../../common/components/empty_value';
import { RuleSnoozeBadge } from '../../../rule_management/components/rule_snooze_badge';
import { FormattedRelativePreferenceDate } from '../../../../common/components/formatted_date';
import { SecuritySolutionLinkAnchor } from '../../../../common/components/links';
import { getRuleDetailsTabUrl } from '../../../../common/components/link_to/redirect_to_detection_engine';
import { PopoverItems } from '../../../../common/components/popover_items';
import { useKibana, useUiSetting$ } from '../../../../common/lib/kibana';
import {
  canEditRuleWithActions,
  explainLackOfPermission,
} from '../../../../common/utils/privileges';
import { IntegrationsPopover } from '../../../common/components/related_integrations/integrations_popover';
import { RuleStatusBadge } from '../../../common/components/rule_execution_status';
import { RuleSwitch } from '../../../common/components/rule_switch';
import { SeverityBadge } from '../../../../common/components/severity_badge';
import * as i18n from '../../../common/translations';
import { RuleDetailTabs } from '../../../rule_details_ui/pages/rule_details/use_rule_details_tabs';
import type { Rule } from '../../../rule_management/logic';
import { PopoverTooltip } from './popover_tooltip';
import { useRulesTableContext } from './rules_table/rules_table_context';
import { TableHeaderTooltipCell } from './table_header_tooltip_cell';
import { useHasActionsPrivileges } from './use_has_actions_privileges';
import { useHasMlPermissions } from './use_has_ml_permissions';
import { useRulesTableActions } from './use_rules_table_actions';
import { MlRuleWarningPopover } from '../ml_rule_warning_popover/ml_rule_warning_popover';
import { getMachineLearningJobId } from '../../../common/helpers';
import type { TimeRange } from '../../../rule_gaps/types';
import {
  GAP_STATUS_HEADER,
  GAP_STATUS_IN_PROGRESS_LABEL,
  GAP_STATUS_UNFILLED_LABEL,
  GAP_STATUS_FILLED_LABEL,
  gapStatusTooltipInProgress,
  gapStatusTooltipUnfilled,
  gapStatusTooltipFilled,
} from './translations';

export type TableColumn = EuiBasicTableColumn<Rule> | EuiTableActionsColumnType<Rule>;

type GapSummaryEntry = GetGapsSummaryByRuleIdsResponseBody['data'][number];

interface ColumnsProps {
  hasCRUDPermissions: boolean;
  isLoadingJobs: boolean;
  mlJobs: SecurityJob[];
  startMlJobs: (jobIds: string[] | undefined) => Promise<void>;
}

interface ActionColumnsProps {
  showExceptionsDuplicateConfirmation: () => Promise<string | null>;
  showManualRuleRunConfirmation: () => Promise<TimeRange | null>;
  confirmDeletion: () => Promise<boolean>;
}

const loadingActionsSet = new Set(['disable', 'enable', 'edit', 'delete', 'run', 'fill_gaps']);

export const useEnabledColumn = ({
  hasCRUDPermissions,
  startMlJobs,
}: ColumnsProps): TableColumn => {
  const hasMlPermissions = useHasMlPermissions();
  const hasActionsPrivileges = useHasActionsPrivileges();
  const { loadingRulesAction, loadingRuleIds } = useRulesTableContext().state;

  const loadingIds = useMemo(
    () => (loadingActionsSet.has(loadingRulesAction ?? '') ? loadingRuleIds : []),
    [loadingRuleIds, loadingRulesAction]
  );

  return useMemo(
    () => ({
      field: 'enabled',
      name: i18n.COLUMN_ENABLE,
      render: (_, rule: Rule) => (
        <EuiToolTip
          position="top"
          content={explainLackOfPermission(
            rule,
            hasMlPermissions,
            hasActionsPrivileges,
            hasCRUDPermissions
          )}
        >
          <RuleSwitch
            id={rule.id}
            enabled={rule.enabled}
            startMlJobsIfNeeded={() => startMlJobs(getMachineLearningJobId(rule))}
            isDisabled={
              !canEditRuleWithActions(rule, hasActionsPrivileges) ||
              !hasCRUDPermissions ||
              (isMlRule(rule.type) && !hasMlPermissions)
            }
            isLoading={loadingIds.includes(rule.id)}
            ruleName={rule.name}
          />
        </EuiToolTip>
      ),
      width: '95px',
      sortable: true,
    }),
    [hasMlPermissions, hasActionsPrivileges, hasCRUDPermissions, loadingIds, startMlJobs]
  );
};

const useRuleSnoozeColumn = (): TableColumn => {
  return useMemo(
    () => ({
      field: 'snooze',
      name: i18n.COLUMN_SNOOZE,
      render: (_, rule: Rule) => <RuleSnoozeBadge ruleId={rule.id} />,
      width: '100px',
      sortable: false,
    }),
    []
  );
};

export const RuleLink = ({ name, id }: Pick<Rule, 'id' | 'name'>) => {
  return (
    <EuiToolTip content={name} anchorClassName="eui-textTruncate">
      <SecuritySolutionLinkAnchor
        data-test-subj="ruleName"
        deepLinkId={SecurityPageName.rules}
        path={getRuleDetailsTabUrl(id, RuleDetailTabs.overview)}
      >
        {name}
      </SecuritySolutionLinkAnchor>
    </EuiToolTip>
  );
};

export const RULE_NAME_COLUMN: TableColumn = {
  field: 'name',
  name: i18n.COLUMN_RULE,
  render: (value: Rule['name'], item: Rule) => <RuleLink id={item.id} name={value} />,
  sortable: true,
  truncateText: true,
  width: '38%',
};

export const useRuleExecutionStatusColumn = ({
  sortable,
  width,
  isLoadingJobs,
  mlJobs,
}: {
  sortable: boolean;
  width: string;
  isLoadingJobs: boolean;
  mlJobs: SecurityJob[];
}): TableColumn => {
  return useMemo(
    () => ({
      field: 'execution_summary.last_execution.status',
      name: i18n.COLUMN_LAST_RESPONSE,
      render: (value: RuleExecutionSummary['last_execution']['status'] | undefined, item: Rule) => {
        return (
          <EuiFlexGroup justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>
              <RuleStatusBadge
                status={value}
                message={item.execution_summary?.last_execution.message}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <MlRuleWarningPopover rule={item} loadingJobs={isLoadingJobs} jobs={mlJobs} />
            </EuiFlexItem>
          </EuiFlexGroup>
        );
      },
      sortable,
      truncateText: true,
      width,
    }),
    [isLoadingJobs, mlJobs, sortable, width]
  );
};

const TAGS_COLUMN: TableColumn = {
  field: 'tags',
  name: <RulesTableEmptyColumnName name={i18n.COLUMN_TAGS} />,
  align: 'center',
  render: (tags: Rule['tags']) => {
    if (tags == null || tags.length === 0) {
      return null;
    }

    const renderItem = (tag: string, i: number) => (
      <EuiBadge color="hollow" key={`${tag}-${i}`} data-test-subj="tag">
        {tag}
      </EuiBadge>
    );
    return (
      <PopoverItems
        items={tags}
        popoverTitle={i18n.COLUMN_TAGS}
        popoverButtonTitle={tags.length.toString()}
        popoverButtonIcon="tag"
        dataTestPrefix="tags"
        renderItem={renderItem}
      />
    );
  },
  width: '65px',
  truncateText: true,
};

const INTEGRATIONS_COLUMN: TableColumn = {
  field: 'related_integrations',
  name: <RulesTableEmptyColumnName name={i18n.COLUMN_INTEGRATIONS} />,
  align: 'center',
  render: (integrations: Rule['related_integrations']) => {
    if (integrations == null || integrations.length === 0) {
      return null;
    }

    return <IntegrationsPopover relatedIntegrations={integrations} />;
  },
  width: '70px',
  truncateText: true,
};

const MODIFIED_COLUMN: TableColumn = {
  field: 'rule_source',
  name: <RulesTableEmptyColumnName name={i18n.COLUMN_MODIFIED} />,
  align: 'center',
  render: (ruleSource: Rule['rule_source']) => {
    if (
      ruleSource == null ||
      ruleSource.type === 'internal' ||
      (ruleSource.type === 'external' && ruleSource.is_customized === false)
    ) {
      return null;
    }

    return (
      <EuiToolTip content={i18n.MODIFIED_TOOLTIP}>
        <EuiBadge
          tabIndex={0}
          color="hollow"
          data-test-subj="rulesTableModifiedColumnBadge"
          aria-label={i18n.MODIFIED_LABEL}
        >
          {i18n.MODIFIED_LABEL}
        </EuiBadge>
      </EuiToolTip>
    );
  },
  width: '90px',
  truncateText: true,
};

export const LAST_EXECUTION_COLUMN = {
  field: 'execution_summary.last_execution.date',
  name: i18n.COLUMN_LAST_COMPLETE_RUN,
  render: (value: RuleExecutionSummary['last_execution']['date'] | undefined) => {
    return (
      <EuiFlexGroup data-test-subj="ruleLastRun">
        {value == null ? (
          getEmptyTagValue()
        ) : (
          <FormattedRelativePreferenceDate
            tooltipFieldName={i18n.COLUMN_LAST_COMPLETE_RUN}
            relativeThresholdInHrs={DEFAULT_RELATIVE_DATE_THRESHOLD}
            value={value}
            tooltipAnchorClassName="eui-textTruncate"
          />
        )}
      </EuiFlexGroup>
    );
  },
  sortable: true,
  truncateText: true,
  width: '16%',
};

const useActionsColumn = ({
  showExceptionsDuplicateConfirmation,
  showManualRuleRunConfirmation,
  confirmDeletion,
}: ActionColumnsProps): EuiTableActionsColumnType<Rule> => {
  const actions = useRulesTableActions({
    showExceptionsDuplicateConfirmation,
    showManualRuleRunConfirmation,
    confirmDeletion,
  });

  return useMemo(() => ({ actions, width: '40px' }), [actions]);
};

export interface UseColumnsProps extends ColumnsProps, ActionColumnsProps {}

export const useRulesColumns = ({
  hasCRUDPermissions,
  isLoadingJobs,
  mlJobs,
  startMlJobs,
  showExceptionsDuplicateConfirmation,
  showManualRuleRunConfirmation,
  confirmDeletion,
}: UseColumnsProps): TableColumn[] => {
  const actionsColumn = useActionsColumn({
    showExceptionsDuplicateConfirmation,
    showManualRuleRunConfirmation,
    confirmDeletion,
  });
  const [showRelatedIntegrations] = useUiSetting$<boolean>(SHOW_RELATED_INTEGRATIONS_SETTING);

  const enabledColumn = useEnabledColumn({
    hasCRUDPermissions,
    isLoadingJobs,
    mlJobs,
    startMlJobs,
  });
  const executionStatusColumn = useRuleExecutionStatusColumn({
    sortable: true,
    width: '16%',
    isLoadingJobs,
    mlJobs,
  });
  const snoozeColumn = useRuleSnoozeColumn();

  return useMemo(
    () => [
      RULE_NAME_COLUMN,
      MODIFIED_COLUMN,
      ...(showRelatedIntegrations ? [INTEGRATIONS_COLUMN] : []),
      TAGS_COLUMN,
      {
        field: 'risk_score',
        name: i18n.COLUMN_RISK_SCORE,
        render: (value: Rule['risk_score']) => (
          <EuiText data-test-subj="riskScore" size="s">
            {value}
          </EuiText>
        ),
        sortable: true,
        truncateText: true,
        width: '85px',
      },
      {
        field: 'severity',
        name: i18n.COLUMN_SEVERITY,
        render: (value: Rule['severity']) => <SeverityBadge value={value} />,
        sortable: true,
        truncateText: true,
        width: '12%',
      },
      LAST_EXECUTION_COLUMN,
      executionStatusColumn,
      {
        field: 'updated_at',
        name: i18n.COLUMN_LAST_UPDATE,
        render: (value: Rule['updated_at']) => {
          return value == null ? (
            getEmptyTagValue()
          ) : (
            <FormattedRelativePreferenceDate
              tooltipFieldName={i18n.COLUMN_LAST_UPDATE}
              relativeThresholdInHrs={DEFAULT_RELATIVE_DATE_THRESHOLD}
              value={value}
              tooltipAnchorClassName="eui-textTruncate"
            />
          );
        },
        sortable: true,
        width: '18%',
        truncateText: true,
      },
      snoozeColumn,
      enabledColumn,
      ...(hasCRUDPermissions ? [actionsColumn] : []),
    ],
    [
      showRelatedIntegrations,
      executionStatusColumn,
      snoozeColumn,
      enabledColumn,
      hasCRUDPermissions,
      actionsColumn,
    ]
  );
};

export const INDEXING_DURATION_COLUMN = {
  field: 'execution_summary.last_execution.metrics.total_indexing_duration_ms',
  name: (
    <TableHeaderTooltipCell
      title={i18n.COLUMN_INDEXING_TIMES}
      tooltipContent={i18n.COLUMN_INDEXING_TIMES_TOOLTIP}
    />
  ),
  render: (value: number | undefined) => (
    <EuiText data-test-subj="total_indexing_duration_ms" size="s">
      {value != null ? value.toFixed() : getEmptyTagValue()}
    </EuiText>
  ),
  sortable: true,
  truncateText: true,
  width: '16%',
};

export const SEARCH_DURATION_COLUMN = {
  field: 'execution_summary.last_execution.metrics.total_search_duration_ms',
  name: (
    <TableHeaderTooltipCell
      title={i18n.COLUMN_QUERY_TIMES}
      tooltipContent={i18n.COLUMN_QUERY_TIMES_TOOLTIP}
    />
  ),
  render: (value: number | undefined) => (
    <EuiText data-test-subj="total_search_duration_ms" size="s">
      {value != null ? value.toFixed() : getEmptyTagValue()}
    </EuiText>
  ),
  sortable: true,
  truncateText: true,
  width: '14%',
};

export const useGapDurationColumn = () => {
  const docLinks = useKibana().services.docLinks;

  return {
    field: 'execution_summary.last_execution.metrics.execution_gap_duration_s',
    name: (
      <TableHeaderTooltipCell
        title={i18n.COLUMN_GAP}
        customTooltip={
          <div css={{ maxWidth: '20px' }}>
            <PopoverTooltip columnName={i18n.COLUMN_GAP} anchorColor="subdued">
              <EuiText css={{ width: 300 }}>
                <FormattedMessage
                  defaultMessage="Duration of most recent gap in Rule execution. Adjust Rule look-back or {seeDocs} for mitigating gaps."
                  id="xpack.securitySolution.detectionEngine.rules.allRules.columns.gapTooltip"
                  values={{
                    seeDocs: (
                      <EuiLink href={`${docLinks.links.siem.troubleshootGaps}`} target="_blank">
                        {i18n.COLUMN_GAP_TOOLTIP_SEE_DOCUMENTATION}
                      </EuiLink>
                    ),
                  }}
                />
              </EuiText>
            </PopoverTooltip>
          </div>
        }
      />
    ),
    render: (value: number | undefined) => (
      <EuiText data-test-subj="gap" size="s">
        {value != null ? moment.duration(value, 'seconds').humanize() : getEmptyTagValue()}
      </EuiText>
    ),
    sortable: true,
    truncateText: true,
    width: '14%',
  };
};

const GapFillStatusTooltip = ({
  totalInProgressDurationMs,
  totalUnfilledDurationMs,
  totalFilledDurationMs,
}: {
  totalInProgressDurationMs: number;
  totalUnfilledDurationMs: number;
  totalFilledDurationMs: number;
}) => {
  const formatDurationHumanized = (duration: number) => {
    return duration === 0 ? '0 ms' : moment.duration(duration, 'ms').humanize();
  };
  return (
    <div>
      <EuiText size="s">
        {gapStatusTooltipInProgress(formatDurationHumanized(totalInProgressDurationMs ?? 0))}
      </EuiText>
      <EuiText size="s">
        {gapStatusTooltipUnfilled(formatDurationHumanized(totalUnfilledDurationMs ?? 0))}
      </EuiText>
      <EuiText size="s">
        {gapStatusTooltipFilled(formatDurationHumanized(totalFilledDurationMs ?? 0))}
      </EuiText>
    </div>
  );
};

export const useGapStatusColumn = (): TableColumn => {
  const { euiTheme } = useEuiTheme();

  return useMemo(
    () => ({
      field: 'gap_info',
      name: GAP_STATUS_HEADER,
      render: (gapInfo: GapSummaryEntry | undefined) => {
        const status = (gapInfo?.gap_fill_status ?? undefined) as GapFillStatus | undefined;
        if (!gapInfo || !status) return getEmptyTagValue();

        const totalInProgressDurationMs = gapInfo.total_in_progress_duration_ms;
        const totalUnfilledDurationMs = gapInfo.total_unfilled_duration_ms;
        const totalFilledDurationMs = gapInfo.total_filled_duration_ms;

        const byStatus: Record<GapFillStatus, { color: string; label: string }> = {
          [gapFillStatus.IN_PROGRESS]: {
            color: euiTheme.colors.backgroundBaseWarning,
            label: GAP_STATUS_IN_PROGRESS_LABEL,
          },
          [gapFillStatus.UNFILLED]: {
            color: euiTheme.colors.backgroundBaseDanger,
            label: GAP_STATUS_UNFILLED_LABEL,
          },
          [gapFillStatus.FILLED]: {
            color: euiTheme.colors.backgroundBaseSuccess,
            label: GAP_STATUS_FILLED_LABEL,
          },
        };

        const color = byStatus[status]?.color;
        const label = byStatus[status]?.label;

        return (
          <EuiToolTip
            position="top"
            content={
              <GapFillStatusTooltip
                totalInProgressDurationMs={totalInProgressDurationMs}
                totalUnfilledDurationMs={totalUnfilledDurationMs}
                totalFilledDurationMs={totalFilledDurationMs}
              />
            }
          >
            <EuiBadge tabIndex={0} color={color} data-test-subj="gapStatusBadge">
              {label}
            </EuiBadge>
          </EuiToolTip>
        );
      },
      sortable: false,
      truncateText: true,
      width: '120px',
    }),
    [
      euiTheme.colors.backgroundBaseWarning,
      euiTheme.colors.backgroundBaseDanger,
      euiTheme.colors.backgroundBaseSuccess,
    ]
  );
};

export const TOTAL_UNFILLED_DURATION_COLUMN = {
  field: 'gap_info.total_unfilled_duration_ms',
  name: (
    <TableHeaderTooltipCell
      title={i18n.COLUMN_TOTAL_UNFILLED_GAPS_DURATION}
      tooltipContent={i18n.COLUMN_TOTAL_UNFILLED_GAPS_DURATION_TOOLTIP}
    />
  ),
  render: (value: number | undefined) => (
    <EuiText data-test-subj="gap_info" size="s">
      {value != null && value > 0 ? moment.duration(value, 'ms').humanize() : getEmptyTagValue()}
    </EuiText>
  ),
  sortable: false,
  truncateText: true,
  width: '14%',
};

export const useMonitoringColumns = ({
  hasCRUDPermissions,
  isLoadingJobs,
  mlJobs,
  startMlJobs,
  showExceptionsDuplicateConfirmation,
  showManualRuleRunConfirmation,
  confirmDeletion,
}: UseColumnsProps): TableColumn[] => {
  const actionsColumn = useActionsColumn({
    showExceptionsDuplicateConfirmation,
    showManualRuleRunConfirmation,
    confirmDeletion,
  });
  const [showRelatedIntegrations] = useUiSetting$<boolean>(SHOW_RELATED_INTEGRATIONS_SETTING);

  const enabledColumn = useEnabledColumn({
    hasCRUDPermissions,
    isLoadingJobs,
    mlJobs,
    startMlJobs,
  });
  const executionStatusColumn = useRuleExecutionStatusColumn({
    sortable: true,
    width: '12%',
    isLoadingJobs,
    mlJobs,
  });
  const gapDurationColumn = useGapDurationColumn();
  const gapStatusColumn = useGapStatusColumn();

  return useMemo(
    () => [
      {
        ...RULE_NAME_COLUMN,
        width: '28%',
      },
      MODIFIED_COLUMN,
      ...(showRelatedIntegrations ? [INTEGRATIONS_COLUMN] : []),
      TAGS_COLUMN,
      INDEXING_DURATION_COLUMN,
      SEARCH_DURATION_COLUMN,
      gapStatusColumn,
      gapDurationColumn,
      TOTAL_UNFILLED_DURATION_COLUMN,
      executionStatusColumn,
      LAST_EXECUTION_COLUMN,
      enabledColumn,
      ...(hasCRUDPermissions ? [actionsColumn] : []),
    ],
    [
      actionsColumn,
      enabledColumn,
      executionStatusColumn,
      gapDurationColumn,
      hasCRUDPermissions,
      showRelatedIntegrations,
      gapStatusColumn,
    ]
  );
};
