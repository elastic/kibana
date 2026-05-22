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
import type { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import { ENABLE_ESQL } from '@kbn/esql-utils';
import { RULES_UI_EDIT_PRIVILEGE } from '@kbn/security-solution-features/constants';
import { toSimpleRuleSchedule } from '../../../../common/api/detection_engine/model/rule_schema/to_simple_rule_schedule';
import type { RuleResponse } from '../../../../common/api/detection_engine/model/rule_schema';
import type { AiRuleCreationService } from '../../../detection_engine/common/ai_rule_creation_store';
import { RULES_PATH, SecurityAgentBuilderAttachments } from '../../../../common/constants';
import { hasCapabilities } from '../../../common/lib/capabilities';
import { FiltersDisplay } from './filters_display';
import { RuleTypeDetails } from './rule_type_details';

const INDEX_FIELD_LABEL = i18n.translate(
  'xpack.securitySolution.agentBuilder.ruleAttachment.indexPatternsHeading',
  { defaultMessage: 'Index patterns' }
);
const RULE_TYPE_FIELD_LABEL = i18n.translate(
  'xpack.securitySolution.agentBuilder.ruleAttachment.ruleTypeLabel',
  { defaultMessage: 'Rule type' }
);
const QUERY_LABEL = i18n.translate('xpack.securitySolution.detectionEngine.createRule.queryLabel', {
  defaultMessage: 'Custom query',
});
const EQL_QUERY_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.eqlQueryLabel',
  { defaultMessage: 'EQL query' }
);
const ESQL_QUERY_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.esqlQueryLabel',
  { defaultMessage: 'ES|QL query' }
);
const SAVED_QUERY_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.savedQueryLabel',
  { defaultMessage: 'Saved query' }
);
const ML_TYPE_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.mlRuleTypeDescription',
  { defaultMessage: 'Machine Learning' }
);
const EQL_TYPE_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.eqlRuleTypeDescription',
  { defaultMessage: 'Event Correlation' }
);
const QUERY_TYPE_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.queryRuleTypeDescription',
  { defaultMessage: 'Query' }
);
const THRESHOLD_TYPE_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.thresholdRuleTypeDescription',
  { defaultMessage: 'Threshold' }
);
const THREAT_MATCH_TYPE_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.threatMatchRuleTypeDescription',
  { defaultMessage: 'Indicator Match' }
);
const NEW_TERMS_TYPE_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.newTermsRuleTypeDescription',
  { defaultMessage: 'New Terms' }
);
const ESQL_TYPE_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.esqlRuleTypeDescription',
  { defaultMessage: 'ES|QL' }
);

type RuleAttachment = Attachment<string, { text: string; attachmentLabel?: string }>;

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

export const isOnRuleFormPage = (pathname: string): boolean =>
  pathname.includes(RULES_PATH) && (pathname.includes('/create') || pathname.includes('/edit'));

const parseRuleFromAttachment = (attachment: RuleAttachment): RuleResponse | null => {
  try {
    const parsed = JSON.parse(attachment.data.text);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
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

const getRuleTypeLabel = (ruleType: string): string => {
  switch (ruleType) {
    case 'machine_learning':
      return ML_TYPE_DESCRIPTION;
    case 'query':
    case 'saved_query':
      return QUERY_TYPE_DESCRIPTION;
    case 'eql':
      return EQL_TYPE_DESCRIPTION;
    case 'threshold':
      return THRESHOLD_TYPE_DESCRIPTION;
    case 'threat_match':
      return THREAT_MATCH_TYPE_DESCRIPTION;
    case 'new_terms':
      return NEW_TERMS_TYPE_DESCRIPTION;
    case 'esql':
      return ESQL_TYPE_DESCRIPTION;
    default:
      return ruleType;
  }
};

const ScheduleDisplay: React.FC<{ interval: string; from?: string }> = ({ interval, from }) => {
  const schedule = toSimpleRuleSchedule({ interval, from: from ?? `now-${interval}`, to: 'now' });

  return (
    <EuiText size="s">
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

const getQueryLabel = (rule: RuleResponse): string => {
  switch (rule.type) {
    case 'eql':
      return EQL_QUERY_LABEL;
    case 'esql':
      return ESQL_QUERY_LABEL;
    case 'saved_query':
      return SAVED_QUERY_LABEL;
    default:
      return QUERY_LABEL;
  }
};

const IndexPatterns: React.FC<{ patterns: string[] }> = ({ patterns }) => (
  <>
    <SectionHeading>{INDEX_FIELD_LABEL}</SectionHeading>
    <EuiSpacer size="xs" />
    <EuiFlexGroup responsive={false} gutterSize="xs" wrap>
      {patterns.map((pattern) => (
        <EuiFlexItem grow={false} key={pattern}>
          <EuiBadge color="hollow">{pattern}</EuiBadge>
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  </>
);

const SeverityRiskScore: React.FC<{
  severity?: string;
  riskScore?: number;
}> = ({ severity, riskScore }) => (
  <EuiText size="s">
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
        <EuiText size="s">
          <strong>
            {RULE_TYPE_FIELD_LABEL}
            {':'}
          </strong>{' '}
          {getRuleTypeLabel(rule.type)}
        </EuiText>
      )}

      {rule.description && (
        <>
          <EuiSpacer size="s" />
          <SectionHeading>
            {i18n.translate(
              'xpack.securitySolution.agentBuilder.ruleAttachment.descriptionHeading',
              { defaultMessage: 'Description' }
            )}
          </SectionHeading>
          <EuiSpacer size="xs" />
          <EuiText size="s">{rule.description}</EuiText>
        </>
      )}

      {query && (
        <>
          <EuiSpacer size="s" />
          <SectionHeading>{getQueryLabel(rule)}</SectionHeading>
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
        </>
      )}

      {index && index.length > 0 && (
        <>
          <EuiSpacer size="xs" />
          <IndexPatterns patterns={index} />
        </>
      )}

      {filters && filters.length > 0 && (
        <>
          <EuiSpacer size="xs" />
          <FiltersDisplay filters={filters} />
        </>
      )}

      <EuiSpacer size="xs" />
      <RuleTypeDetails rule={rule} />

      {rule.tags && rule.tags.length > 0 && (
        <>
          <EuiSpacer size="xs" />
          <SectionHeading>
            {i18n.translate('xpack.securitySolution.agentBuilder.ruleAttachment.tagsHeading', {
              defaultMessage: 'Tags',
            })}
          </SectionHeading>
          <EuiSpacer size="xs" />
          <TagsBadgeList tags={rule.tags} />
        </>
      )}

      <EuiSpacer size="xs" />
      <SeverityRiskScore severity={rule.severity} riskScore={rule.risk_score} />

      {interval && (
        <>
          <EuiSpacer size="xs" />
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
  uiSettings,
}: {
  attachments: AttachmentServiceStartContract;
  application: ApplicationStart;
  aiRuleCreation: AiRuleCreationService;
  uiSettings: IUiSettingsClient;
}): void => {
  attachments.addAttachmentType(
    SecurityAgentBuilderAttachments.rule,
    createRuleAttachmentDefinition({ application, aiRuleCreation, uiSettings })
  );
};

export const createRuleAttachmentDefinition = ({
  application,
  aiRuleCreation,
  uiSettings,
}: {
  application: ApplicationStart;
  aiRuleCreation: AiRuleCreationService;
  uiSettings: IUiSettingsClient;
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

    if (rule.type === 'esql' && !uiSettings.get(ENABLE_ESQL)) {
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
