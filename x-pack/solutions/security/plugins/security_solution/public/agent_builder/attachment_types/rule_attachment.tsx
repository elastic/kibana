/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiBadge,
  EuiCallOut,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import type {
  AttachmentUIDefinition,
  AttachmentRenderProps,
  AttachmentServiceStartContract,
} from '@kbn/agent-builder-browser/attachments';
import { ActionButtonType } from '@kbn/agent-builder-browser/attachments';
import type { Attachment } from '@kbn/agent-builder-common/attachments';
import type { ApplicationStart } from '@kbn/core-application-browser';
import type { Filter } from '@kbn/es-query';
import { RULES_UI_EDIT_PRIVILEGE } from '@kbn/security-solution-features/constants';
import { toSimpleRuleSchedule } from '../../../common/api/detection_engine/model/rule_schema/to_simple_rule_schedule';
import type { RuleResponse } from '../../../common/api/detection_engine/model/rule_schema';
import type { AiRuleCreationService } from '../../detection_engine/common/ai_rule_creation_store';
import { RULES_PATH, SecurityAgentBuilderAttachments } from '../../../common/constants';
import { hasCapabilities } from '../../common/lib/capabilities';
import {
  Threshold as ThresholdDisplay,
  AnomalyThreshold as AnomalyThresholdDisplay,
  ThreatIndex as ThreatIndexDisplay,
  constructThreatMappingDescription,
  NewTermsFields as NewTermsFieldsDisplay,
  HistoryWindowSize,
} from '../../detection_engine/rule_management/components/rule_details/rule_definition_section';
import {
  EQL_OPTIONS_EVENT_CATEGORY_FIELD_LABEL,
  EQL_OPTIONS_EVENT_TIEBREAKER_FIELD_LABEL,
  EQL_OPTIONS_EVENT_TIMESTAMP_FIELD_LABEL,
} from '../../detection_engine/rule_creation/components/eql_query_edit/translations';
import {
  THRESHOLD_FIELD_LABEL,
  ANOMALY_THRESHOLD_FIELD_LABEL,
  MACHINE_LEARNING_JOB_ID_FIELD_LABEL,
  THREAT_INDEX_FIELD_LABEL,
  THREAT_MAPPING_FIELD_LABEL,
  NEW_TERMS_FIELDS_FIELD_LABEL,
  HISTORY_WINDOW_SIZE_FIELD_LABEL,
} from '../../detection_engine/rule_management/components/rule_details/translations';
import {
  THREAT_QUERY_LABEL,
  FILTERS_LABEL,
} from '../../detection_engine/rule_creation_ui/components/description_step/translations';

type RuleAttachment = Attachment<string, { text: string; attachmentLabel?: string }>;

export const isOnRuleFormPage = (pathname: string): boolean =>
  pathname.includes(RULES_PATH) && (pathname.includes('/create') || pathname.includes('/edit'));

const parseRuleFromAttachment = (attachment: RuleAttachment): RuleResponse | null => {
  try {
    const parsed = JSON.parse(attachment.data.text);
    if (!parsed || !parsed.name) {
      return null;
    }
    return parsed as RuleResponse;
  } catch {
    return null;
  }
};

const getRuleName = (attachment: RuleAttachment): string | undefined => {
  if (attachment?.data?.attachmentLabel) {
    return attachment.data.attachmentLabel;
  }
  return parseRuleFromAttachment(attachment)?.name;
};

const EmptyRuleContent: React.FC = () => (
  <EuiCallOut
    size="s"
    title={i18n.translate('xpack.securitySolution.agentBuilder.ruleAttachment.emptyTitle', {
      defaultMessage: 'New Rule',
    })}
    iconType="info"
    color="primary"
  >
    <EuiText size="xs">
      {i18n.translate('xpack.securitySolution.agentBuilder.ruleAttachment.emptyDescription', {
        defaultMessage: 'Describe the detection rule you want to create.',
      })}
    </EuiText>
  </EuiCallOut>
);

const SectionHeading: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <EuiText size="s">
    <strong>{children}</strong>
  </EuiText>
);

const TagsBadgeList: React.FC<{ tags: string[] }> = ({ tags }) => (
  <EuiFlexGroup responsive={false} gutterSize="xs" wrap>
    {tags.map((tag) => (
      <EuiFlexItem grow={false} key={tag}>
        <EuiBadge color="hollow">{tag}</EuiBadge>
      </EuiFlexItem>
    ))}
  </EuiFlexGroup>
);

const ScheduleDisplay: React.FC<{ interval: string; from?: string }> = ({ interval, from }) => {
  const schedule = toSimpleRuleSchedule({ interval, from: from ?? `now-${interval}`, to: 'now' });

  return (
    <EuiText size="xs">
      <strong>
        {i18n.translate('xpack.securitySolution.agentBuilder.ruleAttachment.intervalLabel', {
          defaultMessage: 'Interval:',
        })}
      </strong>{' '}
      {schedule?.interval ?? interval}
      {schedule?.lookback && (
        <>
          {' | '}
          <strong>
            {i18n.translate('xpack.securitySolution.agentBuilder.ruleAttachment.lookbackLabel', {
              defaultMessage: 'Lookback time:',
            })}
          </strong>{' '}
          {schedule.lookback}
        </>
      )}
    </EuiText>
  );
};

const QUERY_LANGUAGE_LABELS: Record<string, string> = {
  esql: 'ES|QL',
  eql: 'EQL',
  kuery: 'KQL',
  lucene: 'Lucene',
};

const RULE_TYPE_LABELS: Record<string, string> = {
  esql: 'ES|QL',
  eql: 'EQL',
  query: 'Query',
  saved_query: 'Saved Query',
  threshold: 'Threshold',
  threat_match: 'Indicator Match',
  machine_learning: 'Machine Learning',
  new_terms: 'New Terms',
};

const getQueryHeading = (rule: RuleResponse): string => {
  const language = 'language' in rule ? (rule.language as string) : undefined;
  const languageLabel = language ? QUERY_LANGUAGE_LABELS[language] : undefined;
  const typeLabel = RULE_TYPE_LABELS[rule.type] ?? rule.type;

  if (languageLabel) {
    return `${languageLabel} Detection Logic`;
  }
  return `${typeLabel} Detection Logic`;
};

const IndexPatterns: React.FC<{ patterns: string[] }> = ({ patterns }) => (
  <>
    <SectionHeading>
      {i18n.translate('xpack.securitySolution.agentBuilder.ruleAttachment.indexPatternsHeading', {
        defaultMessage: 'Index Patterns',
      })}
    </SectionHeading>
    <EuiSpacer size="xs" />
    <EuiFlexGroup responsive={false} gutterSize="xs" wrap>
      {patterns.map((pattern) => (
        <EuiFlexItem grow={false} key={pattern}>
          <EuiBadge color="hollow">{pattern}</EuiBadge>
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
    <EuiSpacer size="s" />
  </>
);

const formatRangeFilter = (key: string, params: Record<string, unknown>): string => {
  const parts: string[] = [];
  if (params.gte !== undefined || params.gt !== undefined) {
    parts.push(`>= ${params.gte ?? params.gt}`);
  }
  if (params.lte !== undefined || params.lt !== undefined) {
    parts.push(`<= ${params.lte ?? params.lt}`);
  }
  return `${key}: ${parts.join(' AND ')}`;
};

const resolveParamValue = (params: Filter['meta']['params']): string => {
  if (params == null) return '';
  if (typeof params === 'string' || typeof params === 'number' || typeof params === 'boolean') {
    return String(params);
  }
  if (Array.isArray(params)) return params.join(', ');
  if (typeof params === 'object' && 'query' in params) return String(params.query);
  return JSON.stringify(params);
};

const formatPhraseFilter = (
  key: string,
  value: Filter['meta']['value'],
  params: Filter['meta']['params']
): string => {
  const display = typeof value === 'string' ? value : resolveParamValue(params);
  return `${key}: ${display}`;
};

export const getFilterLabel = (filter: Filter): string => {
  if (filter.meta?.alias) {
    return filter.meta.alias;
  }
  const { key, negate, type, params, value } = filter.meta ?? {};
  const prefix = negate ? 'NOT ' : '';

  if (!key) {
    return `${prefix}${JSON.stringify(filter.query ?? filter)}`;
  }

  if (type === 'exists') {
    return `${prefix}${key}: exists`;
  }

  if (type === 'phrase' || type === 'phrases') {
    return `${prefix}${formatPhraseFilter(key, value, params)}`;
  }

  if (type === 'range' && params && typeof params === 'object' && !Array.isArray(params)) {
    return `${prefix}${formatRangeFilter(key, params as Record<string, unknown>)}`;
  }

  const displayValue = typeof value === 'string' ? value : resolveParamValue(params);
  return displayValue ? `${prefix}${key}: ${displayValue}` : `${prefix}${key}`;
};

export const FiltersDisplay: React.FC<{ filters: unknown[] }> = ({ filters }) => {
  const validFilters = filters.filter(
    (f): f is Filter => f != null && typeof f === 'object' && 'meta' in f
  );
  if (validFilters.length === 0) {
    return null;
  }

  return (
    <>
      <SectionHeading>{FILTERS_LABEL}</SectionHeading>
      <EuiSpacer size="xs" />
      <EuiFlexGroup responsive={false} gutterSize="xs" wrap>
        {validFilters.map((filter, idx) => (
          <EuiFlexItem grow={false} key={idx}>
            <EuiBadge color={filter.meta?.negate ? 'danger' : 'hollow'}>
              {getFilterLabel(filter)}
            </EuiBadge>
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
      <EuiSpacer size="s" />
    </>
  );
};

export const ThresholdDetails: React.FC<{ rule: RuleResponse }> = ({ rule }) => {
  if (rule.type !== 'threshold') {
    return null;
  }

  return (
    <>
      <SectionHeading>{THRESHOLD_FIELD_LABEL}</SectionHeading>
      <EuiSpacer size="xs" />
      <EuiText size="xs">
        <ThresholdDisplay threshold={rule.threshold} />
      </EuiText>
      <EuiSpacer size="s" />
    </>
  );
};

export const ThreatMatchDetails: React.FC<{ rule: RuleResponse }> = ({ rule }) => {
  if (rule.type !== 'threat_match') {
    return null;
  }

  return (
    <>
      <EuiText size="xs">
        <strong>{THREAT_INDEX_FIELD_LABEL}</strong>
      </EuiText>
      <EuiSpacer size="xs" />
      <ThreatIndexDisplay threatIndex={rule.threat_index} />
      <EuiSpacer size="xs" />
      {rule.threat_query && (
        <>
          <EuiText size="xs">
            <strong>{THREAT_QUERY_LABEL}</strong>
          </EuiText>
          <EuiSpacer size="xs" />
          <EuiCodeBlock fontSize="s" paddingSize="s" overflowHeight={100} isCopyable>
            {rule.threat_query}
          </EuiCodeBlock>
          <EuiSpacer size="xs" />
        </>
      )}
      <EuiText size="xs">
        <strong>{THREAT_MAPPING_FIELD_LABEL}</strong>
      </EuiText>
      <EuiSpacer size="xs" />
      <EuiText size="xs">{constructThreatMappingDescription(rule.threat_mapping)}</EuiText>
      <EuiSpacer size="s" />
    </>
  );
};

export const MachineLearningDetails: React.FC<{ rule: RuleResponse }> = ({ rule }) => {
  if (rule.type !== 'machine_learning') {
    return null;
  }
  const jobIds = Array.isArray(rule.machine_learning_job_id)
    ? rule.machine_learning_job_id
    : [rule.machine_learning_job_id];

  return (
    <>
      <EuiText size="xs">
        <strong>{MACHINE_LEARNING_JOB_ID_FIELD_LABEL}</strong>
      </EuiText>
      <EuiSpacer size="xs" />
      <TagsBadgeList tags={jobIds} />
      <EuiSpacer size="xs" />
      <EuiText size="xs">
        <strong>{ANOMALY_THRESHOLD_FIELD_LABEL}</strong>
      </EuiText>
      <EuiSpacer size="xs" />
      <AnomalyThresholdDisplay anomalyThreshold={rule.anomaly_threshold} />
      <EuiSpacer size="s" />
    </>
  );
};

export const NewTermsDetails: React.FC<{ rule: RuleResponse }> = ({ rule }) => {
  if (rule.type !== 'new_terms') {
    return null;
  }

  return (
    <>
      <EuiText size="xs">
        <strong>{NEW_TERMS_FIELDS_FIELD_LABEL}</strong>
      </EuiText>
      <EuiSpacer size="xs" />
      <NewTermsFieldsDisplay newTermsFields={rule.new_terms_fields} />
      <EuiSpacer size="xs" />
      <EuiText size="xs">
        <strong>{HISTORY_WINDOW_SIZE_FIELD_LABEL}</strong>
      </EuiText>
      <EuiSpacer size="xs" />
      <HistoryWindowSize historyWindowStart={rule.history_window_start} />
      <EuiSpacer size="s" />
    </>
  );
};

export const EqlDetails: React.FC<{ rule: RuleResponse }> = ({ rule }) => {
  if (rule.type !== 'eql') {
    return null;
  }
  const { event_category_override, tiebreaker_field, timestamp_field } = rule;
  if (!event_category_override && !tiebreaker_field && !timestamp_field) {
    return null;
  }

  return (
    <>
      {event_category_override && (
        <EuiText size="xs">
          <strong>
            {EQL_OPTIONS_EVENT_CATEGORY_FIELD_LABEL}
            {':'}
          </strong>{' '}
          {event_category_override}
        </EuiText>
      )}
      {tiebreaker_field && (
        <EuiText size="xs">
          <strong>
            {EQL_OPTIONS_EVENT_TIEBREAKER_FIELD_LABEL}
            {':'}
          </strong>{' '}
          {tiebreaker_field}
        </EuiText>
      )}
      {timestamp_field && (
        <EuiText size="xs">
          <strong>
            {EQL_OPTIONS_EVENT_TIMESTAMP_FIELD_LABEL}
            {':'}
          </strong>{' '}
          {timestamp_field}
        </EuiText>
      )}
      <EuiSpacer size="s" />
    </>
  );
};

const RuleTypeDetails: React.FC<{ rule: RuleResponse }> = ({ rule }) => {
  switch (rule.type) {
    case 'threshold':
      return <ThresholdDetails rule={rule} />;
    case 'threat_match':
      return <ThreatMatchDetails rule={rule} />;
    case 'machine_learning':
      return <MachineLearningDetails rule={rule} />;
    case 'new_terms':
      return <NewTermsDetails rule={rule} />;
    case 'eql':
      return <EqlDetails rule={rule} />;
    default:
      return null;
  }
};

const SeverityRiskScore: React.FC<{ severity?: string; riskScore?: number }> = ({
  severity,
  riskScore,
}) => (
  <EuiText size="xs">
    {severity && (
      <>
        <strong>
          {i18n.translate('xpack.securitySolution.agentBuilder.ruleAttachment.severityLabel', {
            defaultMessage: 'Severity:',
          })}
        </strong>{' '}
        {severity.charAt(0).toUpperCase() + severity.slice(1)}
        {riskScore !== undefined && <>{' | '}</>}
      </>
    )}
    {riskScore !== undefined && (
      <>
        <strong>
          {i18n.translate('xpack.securitySolution.agentBuilder.ruleAttachment.riskScoreLabel', {
            defaultMessage: 'Risk Score:',
          })}
        </strong>{' '}
        {riskScore}
      </>
    )}
  </EuiText>
);

const RuleInlineContent: React.FC<AttachmentRenderProps<RuleAttachment>> = ({ attachment }) => {
  const rule = parseRuleFromAttachment(attachment);

  if (!rule) {
    return <EmptyRuleContent />;
  }

  const query = 'query' in rule ? rule.query : undefined;
  const index = 'index' in rule ? (rule.index as string[] | undefined) : undefined;
  const filters = 'filters' in rule ? (rule.filters as unknown[] | undefined) : undefined;
  const interval = 'interval' in rule ? rule.interval : undefined;
  const from = 'from' in rule ? rule.from : undefined;

  return (
    <EuiPanel paddingSize="m" hasShadow={false} hasBorder={false}>
      {rule.type && (
        <>
          <EuiText size="xs">
            <strong>
              {i18n.translate('xpack.securitySolution.agentBuilder.ruleAttachment.ruleTypeLabel', {
                defaultMessage: 'Rule Type:',
              })}
            </strong>{' '}
            {RULE_TYPE_LABELS[rule.type] ?? rule.type}
          </EuiText>
          <EuiSpacer size="s" />
        </>
      )}

      {rule.description && (
        <>
          <SectionHeading>
            {i18n.translate(
              'xpack.securitySolution.agentBuilder.ruleAttachment.descriptionHeading',
              { defaultMessage: 'Description' }
            )}
          </SectionHeading>
          <EuiSpacer size="xs" />
          <EuiText size="xs">{rule.description}</EuiText>
          <EuiSpacer size="s" />
        </>
      )}

      {query && (
        <>
          <SectionHeading>{getQueryHeading(rule)}</SectionHeading>
          <EuiSpacer size="xs" />
          <EuiCodeBlock
            language="esql"
            fontSize="s"
            paddingSize="s"
            overflowHeight={150}
            isCopyable
          >
            {query}
          </EuiCodeBlock>
          <EuiSpacer size="s" />
        </>
      )}

      {index && index.length > 0 && <IndexPatterns patterns={index} />}

      {filters && filters.length > 0 && <FiltersDisplay filters={filters} />}

      <RuleTypeDetails rule={rule} />

      {rule.tags && rule.tags.length > 0 && (
        <>
          <SectionHeading>
            {i18n.translate('xpack.securitySolution.agentBuilder.ruleAttachment.tagsHeading', {
              defaultMessage: 'Tags',
            })}
          </SectionHeading>
          <EuiSpacer size="xs" />
          <TagsBadgeList tags={rule.tags} />
          <EuiSpacer size="s" />
        </>
      )}

      <SeverityRiskScore severity={rule.severity} riskScore={rule.risk_score} />

      {interval && (
        <>
          <EuiSpacer size="s" />
          <ScheduleDisplay interval={interval} from={from} />
        </>
      )}
    </EuiPanel>
  );
};

export const registerRuleAttachment = ({
  attachments,
  application,
  aiRuleCreation,
}: {
  attachments: AttachmentServiceStartContract;
  application: ApplicationStart;
  aiRuleCreation: AiRuleCreationService;
}): void => {
  attachments.addAttachmentType(
    SecurityAgentBuilderAttachments.rule,
    createRuleAttachmentDefinition({ application, aiRuleCreation })
  );
};

export const createRuleAttachmentDefinition = ({
  application,
  aiRuleCreation,
}: {
  application: ApplicationStart;
  aiRuleCreation: AiRuleCreationService;
}): AttachmentUIDefinition<RuleAttachment> => ({
  getLabel: (attachment) =>
    getRuleName(attachment) ??
    i18n.translate('xpack.securitySolution.agentBuilder.ruleAttachment.label', {
      defaultMessage: 'Security Rule',
    }),
  getIcon: () => 'securityApp',
  renderInlineContent: (props) => <RuleInlineContent {...props} />,
  getActionButtons: ({ attachment, openSidebarConversation }) => {
    const rule = parseRuleFromAttachment(attachment);
    const canEditRules = hasCapabilities(application.capabilities, RULES_UI_EDIT_PRIVILEGE);
    if (!rule || !canEditRules) {
      return [];
    }

    const onRuleForm = isOnRuleFormPage(window.location.pathname);

    return [
      {
        label: onRuleForm
          ? i18n.translate('xpack.securitySolution.agentBuilder.ruleAttachment.buildRule', {
              defaultMessage: 'Update rule',
            })
          : i18n.translate('xpack.securitySolution.agentBuilder.ruleAttachment.applyToCreation', {
              defaultMessage: 'Apply to creation',
            }),
        icon: 'plus',
        type: ActionButtonType.PRIMARY,
        handler: () => {
          aiRuleCreation.setAiCreatedRule(rule);
          if (!onRuleForm) {
            application.navigateToApp('securitySolutionUI', {
              path: '/rules/create',
            });
            openSidebarConversation?.();
          }
        },
      },
    ];
  },
});
