/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import type { ReactNode } from 'react';
import { css } from '@emotion/react';
import {
  EuiBadge,
  EuiBadgeGroup,
  EuiButtonIcon,
  EuiCallOut,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSkeletonText,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type {
  ClassicRuleAction,
  CreateRuleFlyoutProps,
  MigratedRule,
} from '@kbn/alerting-v2-plugin/public';
import { DASHBOARD_ARTIFACT_TYPE, RUNBOOK_ARTIFACT_TYPE } from '@kbn/alerting-v2-constants';
import type { OriginalRuleQueryLanguage } from './get_original_rule_summary';
import { getOriginalRuleSummary } from './get_original_rule_summary';

export interface OriginalRule {
  name: string;
  tags: string[];
  enabled: boolean;
  schedule: { interval: string };
  params: Record<string, unknown>;
  alertDelay?: { active: number } | null;
  actions: ClassicRuleAction[];
  artifacts?: {
    dashboards?: Array<{ id: string }>;
    investigation_guide?: { blob: string };
  } | null;
}

export interface RuleMigrationState {
  loading: boolean;
  error?: Error;
  rule?: MigratedRule;
}

/** Rows pair a classic field with the Universal field it maps to, so both sides line up. */
const ROW_KEYS = [
  'query',
  'schedule',
  'timeWindow',
  'timeField',
  'alertDelay',
  'runbook',
  'dashboards',
  'groupBy',
  'recovery',
  'noData',
  'status',
] as const;

type RowKey = (typeof ROW_KEYS)[number];

export type RuleFormStepId = NonNullable<CreateRuleFlyoutProps['stepRequest']>['stepId'];

/** The form step where each Universal field is edited. */
const ROW_STEPS: Record<RowKey, RuleFormStepId> = {
  query: 'alertCondition',
  schedule: 'alertCondition',
  timeWindow: 'alertCondition',
  timeField: 'alertCondition',
  groupBy: 'alertCondition',
  alertDelay: 'outcome',
  recovery: 'outcome',
  noData: 'outcome',
  runbook: 'details',
  dashboards: 'details',
  status: 'details',
};

interface Field {
  label: string;
  value: ReactNode;
}

type Fields = Partial<Record<RowKey, Field>>;

type RecoveryStrategy = NonNullable<MigratedRule['recovery']>['strategy'];
type NoDataStrategy = NonNullable<MigratedRule['no_data']>['strategy'];

const LABELS = {
  nameAndTags: i18n.translate('xpack.observabilityAlerting.migrateRule.comparison.nameAndTags', {
    defaultMessage: 'name and tags',
  }),
  query: (language: string) =>
    i18n.translate('xpack.observabilityAlerting.migrateRule.comparison.query', {
      defaultMessage: 'Query ({language})',
      values: { language },
    }),
  schedule: i18n.translate('xpack.observabilityAlerting.migrateRule.comparison.schedule', {
    defaultMessage: 'Runs every',
  }),
  timeWindow: i18n.translate('xpack.observabilityAlerting.migrateRule.comparison.timeWindow', {
    defaultMessage: 'Time window',
  }),
  lookback: i18n.translate('xpack.observabilityAlerting.migrateRule.comparison.lookback', {
    defaultMessage: 'Lookback',
  }),
  timeField: i18n.translate('xpack.observabilityAlerting.migrateRule.comparison.timeField', {
    defaultMessage: 'Time field',
  }),
  alertDelay: i18n.translate('xpack.observabilityAlerting.migrateRule.comparison.alertDelay', {
    defaultMessage: 'Alert after',
  }),
  investigationGuide: i18n.translate(
    'xpack.observabilityAlerting.migrateRule.comparison.investigationGuide',
    { defaultMessage: 'Investigation guide' }
  ),
  runbook: i18n.translate('xpack.observabilityAlerting.migrateRule.comparison.runbook', {
    defaultMessage: 'Runbook',
  }),
  dashboards: i18n.translate('xpack.observabilityAlerting.migrateRule.comparison.dashboards', {
    defaultMessage: 'Dashboards',
  }),
  groupBy: i18n.translate('xpack.observabilityAlerting.migrateRule.comparison.groupBy', {
    defaultMessage: 'Group by',
  }),
  recovery: i18n.translate('xpack.observabilityAlerting.migrateRule.comparison.recovery', {
    defaultMessage: 'Recovers',
  }),
  noData: i18n.translate('xpack.observabilityAlerting.migrateRule.comparison.noData', {
    defaultMessage: 'No data',
  }),
  status: i18n.translate('xpack.observabilityAlerting.migrateRule.comparison.status', {
    defaultMessage: 'Status',
  }),
};

const QUERY_LANGUAGE_LABELS: Record<OriginalRuleQueryLanguage, string> = {
  esql: i18n.translate('xpack.observabilityAlerting.migrateRule.comparison.queryLanguage.esql', {
    defaultMessage: 'ES|QL',
  }),
  dsl: i18n.translate('xpack.observabilityAlerting.migrateRule.comparison.queryLanguage.dsl', {
    defaultMessage: 'Query DSL',
  }),
  kql: i18n.translate('xpack.observabilityAlerting.migrateRule.comparison.queryLanguage.kql', {
    defaultMessage: 'KQL',
  }),
  lucene: i18n.translate(
    'xpack.observabilityAlerting.migrateRule.comparison.queryLanguage.lucene',
    { defaultMessage: 'Lucene' }
  ),
};

const CODE_BLOCK_LANGUAGES: Record<OriginalRuleQueryLanguage, string> = {
  esql: 'esql',
  dsl: 'json',
  kql: 'text',
  lucene: 'text',
};

const RECOVERY_LABELS: Record<RecoveryStrategy, string> = {
  no_breach: i18n.translate(
    'xpack.observabilityAlerting.migrateRule.comparison.recovery.noBreach',
    { defaultMessage: 'When the alert condition is no longer met' }
  ),
  condition: i18n.translate(
    'xpack.observabilityAlerting.migrateRule.comparison.recovery.condition',
    { defaultMessage: 'Recovery condition' }
  ),
  query: i18n.translate('xpack.observabilityAlerting.migrateRule.comparison.recovery.query', {
    defaultMessage: 'Recovery query',
  }),
  manual: i18n.translate('xpack.observabilityAlerting.migrateRule.comparison.recovery.manual', {
    defaultMessage: 'Manual',
  }),
};

const NO_DATA_LABELS: Record<NoDataStrategy, string> = {
  ignore: i18n.translate('xpack.observabilityAlerting.migrateRule.comparison.noData.ignore', {
    defaultMessage: 'Ignore',
  }),
  keep_last: i18n.translate('xpack.observabilityAlerting.migrateRule.comparison.noData.keepLast', {
    defaultMessage: 'Keep last status',
  }),
  resolve: i18n.translate('xpack.observabilityAlerting.migrateRule.comparison.noData.resolve', {
    defaultMessage: 'Recover',
  }),
  alert: i18n.translate('xpack.observabilityAlerting.migrateRule.comparison.noData.alert', {
    defaultMessage: 'Alert',
  }),
};

const NOT_IN_CLASSIC = i18n.translate(
  'xpack.observabilityAlerting.migrateRule.comparison.notInClassic',
  { defaultMessage: 'Not available in classic rules' }
);

const NOT_CARRIED_OVER = i18n.translate(
  'xpack.observabilityAlerting.migrateRule.comparison.notCarriedOver',
  { defaultMessage: 'Not carried over' }
);

const INCLUDED = i18n.translate('xpack.observabilityAlerting.migrateRule.comparison.included', {
  defaultMessage: 'Included',
});

const NONE = i18n.translate('xpack.observabilityAlerting.migrateRule.comparison.none', {
  defaultMessage: 'None',
});

const getConsecutiveMatches = (count: number) =>
  i18n.translate('xpack.observabilityAlerting.migrateRule.comparison.consecutiveMatches', {
    defaultMessage: '{count, plural, one {# consecutive match} other {# consecutive matches}}',
    values: { count },
  });

const QueryBlock = ({
  language,
  query,
  testSubj,
}: {
  language: string;
  query: string;
  testSubj: string;
}) => (
  <EuiCodeBlock
    language={language}
    fontSize="s"
    paddingSize="s"
    isCopyable
    data-test-subj={testSubj}
  >
    {query}
  </EuiCodeBlock>
);

const getClassicFields = (rule: OriginalRule): Fields => {
  const { query, timeField, timeWindow } = getOriginalRuleSummary(rule.params);
  const hasInvestigationGuide = Boolean(rule.artifacts?.investigation_guide?.blob.trim());

  return {
    ...(query
      ? {
          query: {
            label: LABELS.query(QUERY_LANGUAGE_LABELS[query.language]),
            value: (
              <QueryBlock
                language={CODE_BLOCK_LANGUAGES[query.language]}
                query={query.query}
                testSubj="migrateRuleOriginalRuleQuery"
              />
            ),
          },
        }
      : {}),
    schedule: { label: LABELS.schedule, value: rule.schedule.interval },
    ...(timeWindow ? { timeWindow: { label: LABELS.timeWindow, value: timeWindow } } : {}),
    ...(timeField ? { timeField: { label: LABELS.timeField, value: timeField } } : {}),
    alertDelay: {
      label: LABELS.alertDelay,
      value: getConsecutiveMatches(Math.max(rule.alertDelay?.active ?? 1, 1)),
    },
    runbook: {
      label: LABELS.investigationGuide,
      value: hasInvestigationGuide ? INCLUDED : NONE,
    },
    dashboards: {
      label: LABELS.dashboards,
      value: String(rule.artifacts?.dashboards?.length ?? 0),
    },
    status: {
      label: LABELS.status,
      value: rule.enabled
        ? i18n.translate('xpack.observabilityAlerting.migrateRule.comparison.enabled', {
            defaultMessage: 'Enabled',
          })
        : i18n.translate('xpack.observabilityAlerting.migrateRule.comparison.disabled', {
            defaultMessage: 'Disabled',
          }),
    },
  };
};

const getUniversalFields = (rule: MigratedRule): Fields => {
  const { schedule, query, grouping, recovery, no_data: noData, artifacts } = rule;
  const breachSegment = query.breach?.segment.trim();
  const countArtifacts = (type: string) =>
    artifacts?.filter((artifact) => artifact.type === type).length ?? 0;

  return {
    ...(query.base.trim()
      ? {
          query: {
            label: LABELS.query(QUERY_LANGUAGE_LABELS.esql),
            value: (
              <>
                <QueryBlock
                  language="esql"
                  query={query.base}
                  testSubj="migrateRuleNewRuleBaseQuery"
                />
                {breachSegment && (
                  <>
                    <EuiSpacer size="s" />
                    <EuiText size="xs" color="subdued">
                      {i18n.translate(
                        'xpack.observabilityAlerting.migrateRule.comparison.alertCondition',
                        { defaultMessage: 'Alert condition' }
                      )}
                    </EuiText>
                    <EuiSpacer size="xs" />
                    <QueryBlock
                      language="esql"
                      query={breachSegment}
                      testSubj="migrateRuleNewRuleAlertCondition"
                    />
                  </>
                )}
              </>
            ),
          },
        }
      : {}),
    schedule: { label: LABELS.schedule, value: schedule.every },
    ...(schedule.lookback
      ? { timeWindow: { label: LABELS.lookback, value: schedule.lookback } }
      : {}),
    timeField: { label: LABELS.timeField, value: rule.time_field },
    alertDelay: {
      label: LABELS.alertDelay,
      value: getConsecutiveMatches((rule.state_transition?.pending?.count ?? 0) + 1),
    },
    runbook: {
      label: LABELS.runbook,
      value: countArtifacts(RUNBOOK_ARTIFACT_TYPE) > 0 ? INCLUDED : NONE,
    },
    dashboards: {
      label: LABELS.dashboards,
      value: String(countArtifacts(DASHBOARD_ARTIFACT_TYPE)),
    },
    ...(grouping?.fields.length
      ? { groupBy: { label: LABELS.groupBy, value: grouping.fields.join(', ') } }
      : {}),
    ...(recovery
      ? { recovery: { label: LABELS.recovery, value: RECOVERY_LABELS[recovery.strategy] } }
      : {}),
    ...(noData ? { noData: { label: LABELS.noData, value: NO_DATA_LABELS[noData.strategy] } } : {}),
  };
};

const FieldCell = ({
  field,
  pairedLabel,
  missingText,
}: {
  field?: Field;
  pairedLabel?: string;
  missingText: string;
}) => (
  <>
    <EuiTitle size="xxxs">
      <h3>{field?.label ?? pairedLabel}</h3>
    </EuiTitle>
    <EuiSpacer size="xs" />
    {field ? (
      <EuiText size="s">{field.value}</EuiText>
    ) : (
      <EuiText size="s" color="subdued">
        <em>{missingText}</em>
      </EuiText>
    )}
  </>
);

const EditableCell = ({
  label,
  onEdit,
  testSubj,
  className,
  children,
}: {
  label: string;
  onEdit?: () => void;
  testSubj: string;
  className?: string;
  children: ReactNode;
}) => {
  const editLabel = i18n.translate('xpack.observabilityAlerting.migrateRule.comparison.editField', {
    defaultMessage: 'Edit {field}',
    values: { field: label },
  });
  return (
    <div className={className} data-test-subj={testSubj}>
      {children}
      {onEdit && (
        <span data-edit-button>
          <EuiToolTip content={editLabel} disableScreenReaderOutput>
            <EuiButtonIcon
              iconType="pencil"
              size="xs"
              onClick={onEdit}
              aria-label={editLabel}
              data-test-subj={`${testSubj}-edit`}
            />
          </EuiToolTip>
        </span>
      )}
    </div>
  );
};

const ColumnHeader = ({
  title,
  badge,
  action,
}: {
  title: string;
  badge: string;
  action?: ReactNode;
}) => (
  <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
    <EuiFlexItem grow={false}>
      <EuiTitle size="xs">
        <h2>{title}</h2>
      </EuiTitle>
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiBadge color="hollow">{badge}</EuiBadge>
    </EuiFlexItem>
    {action && (
      <>
        <EuiFlexItem />
        <EuiFlexItem grow={false}>{action}</EuiFlexItem>
      </>
    )}
  </EuiFlexGroup>
);

const RuleIdentity = ({
  name,
  tags,
  testSubj,
}: {
  name: string;
  tags?: string[];
  testSubj: string;
}) => (
  <>
    <EuiText size="m">
      <strong data-test-subj={testSubj}>{name}</strong>
    </EuiText>
    {tags && tags.length > 0 && (
      <>
        <EuiSpacer size="s" />
        <EuiBadgeGroup gutterSize="xs">
          {tags.map((tag) => (
            <EuiBadge key={tag} color="hollow">
              {tag}
            </EuiBadge>
          ))}
        </EuiBadgeGroup>
      </>
    )}
  </>
);

const UniversalPlaceholder = ({ migration }: { migration: RuleMigrationState }) => {
  if (migration.loading) {
    return <EuiSkeletonText lines={2} data-test-subj="migrateRuleNewRuleLoading" />;
  }
  if (migration.error) {
    return (
      <EuiCallOut
        announceOnMount
        size="s"
        color="danger"
        iconType="error"
        title={i18n.translate(
          'xpack.observabilityAlerting.migrateRule.comparison.conversionError',
          { defaultMessage: 'Unable to convert the rule' }
        )}
        data-test-subj="migrateRuleNewRuleError"
      >
        {migration.error.message}
      </EuiCallOut>
    );
  }
  return (
    <EuiCallOut
      announceOnMount
      size="s"
      color="warning"
      iconType="warning"
      title={i18n.translate('xpack.observabilityAlerting.migrateRule.comparison.notConvertible', {
        defaultMessage: 'This rule cannot be converted automatically',
      })}
      data-test-subj="migrateRuleNewRuleNotConvertible"
    />
  );
};

export const RuleComparison = ({
  originalRule,
  migration,
  newRuleActions,
  onEditField,
}: {
  originalRule: OriginalRule;
  migration: RuleMigrationState;
  /** Rendered beside the new rule heading. */
  newRuleActions?: ReactNode;
  /** Opens the form on the step that owns a field; edit icons are hidden when omitted. */
  onEditField?: (stepId: RuleFormStepId) => void;
}) => {
  const { euiTheme } = useEuiTheme();
  const { rule: migratedRule } = migration;

  const classicFields = useMemo(() => getClassicFields(originalRule), [originalRule]);
  const universalFields = useMemo(
    () => (migratedRule ? getUniversalFields(migratedRule) : undefined),
    [migratedRule]
  );

  const gridCss = css`
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    column-gap: ${euiTheme.size.xl};
  `;
  const cellCss = css`
    padding: ${euiTheme.size.m} 0;
    border-bottom: ${euiTheme.border.thin};
  `;
  const editableCellCss = css`
    position: relative;
    padding-inline-end: ${euiTheme.size.xl};

    [data-edit-button] {
      position: absolute;
      inset-block-start: ${euiTheme.size.s};
      inset-inline-end: 0;
      opacity: 0;
    }

    &:hover [data-edit-button],
    &:focus-within [data-edit-button] {
      opacity: 1;
    }
  `;

  const rowKeys = ROW_KEYS.filter((key) => classicFields[key] || universalFields?.[key]);

  return (
    <div css={gridCss} data-test-subj="migrateRuleComparison">
      <div css={cellCss}>
        <ColumnHeader
          title={i18n.translate('xpack.observabilityAlerting.migrateRule.comparison.classicTitle', {
            defaultMessage: 'Original rule',
          })}
          badge={i18n.translate('xpack.observabilityAlerting.migrateRule.comparison.classicBadge', {
            defaultMessage: 'Classic',
          })}
        />
      </div>
      <div css={cellCss}>
        <ColumnHeader
          title={i18n.translate(
            'xpack.observabilityAlerting.migrateRule.comparison.universalTitle',
            { defaultMessage: 'New rule' }
          )}
          badge={i18n.translate(
            'xpack.observabilityAlerting.migrateRule.comparison.universalBadge',
            { defaultMessage: 'Universal' }
          )}
          action={newRuleActions}
        />
      </div>
      <div css={cellCss}>
        <RuleIdentity
          name={originalRule.name}
          tags={originalRule.tags}
          testSubj="migrateRuleOriginalRuleName"
        />
      </div>
      {migratedRule ? (
        <EditableCell
          css={[cellCss, editableCellCss]}
          label={LABELS.nameAndTags}
          onEdit={onEditField && (() => onEditField('details'))}
          testSubj="migrateRuleNewRule-identity"
        >
          <RuleIdentity
            name={migratedRule.metadata.name}
            tags={migratedRule.metadata.tags}
            testSubj="migrateRuleNewRuleName"
          />
        </EditableCell>
      ) : (
        <div css={cellCss}>
          <UniversalPlaceholder migration={migration} />
        </div>
      )}
      {rowKeys.map((key) => {
        const classicField = classicFields[key];
        const universalField = universalFields?.[key];
        return (
          <React.Fragment key={key}>
            <div css={cellCss} data-test-subj={`migrateRuleOriginalRule-${key}`}>
              <FieldCell
                field={classicField}
                pairedLabel={universalField?.label}
                missingText={NOT_IN_CLASSIC}
              />
            </div>
            {universalFields ? (
              <EditableCell
                css={[cellCss, editableCellCss]}
                label={universalField?.label ?? classicField?.label ?? ''}
                onEdit={onEditField && (() => onEditField(ROW_STEPS[key]))}
                testSubj={`migrateRuleNewRule-${key}`}
              >
                <FieldCell
                  field={universalField}
                  pairedLabel={classicField?.label}
                  missingText={NOT_CARRIED_OVER}
                />
              </EditableCell>
            ) : (
              <div css={cellCss} data-test-subj={`migrateRuleNewRule-${key}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};
