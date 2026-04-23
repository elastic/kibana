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
import { RULES_UI_EDIT_PRIVILEGE } from '@kbn/security-solution-features/constants';
import { toSimpleRuleSchedule } from '../../../common/api/detection_engine/model/rule_schema/to_simple_rule_schedule';
import type { RuleResponse } from '../../../common/api/detection_engine/model/rule_schema';
import type { AiRuleCreationService } from '../../detection_engine/common/ai_rule_creation_store';
import { RULES_PATH, SecurityAgentBuilderAttachments } from '../../../common/constants';
import { hasCapabilities } from '../../common/lib/capabilities';

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

const RuleInlineContent: React.FC<AttachmentRenderProps<RuleAttachment>> = ({ attachment }) => {
  const rule = parseRuleFromAttachment(attachment);

  if (!rule) {
    return <EmptyRuleContent />;
  }

  const query = 'query' in rule ? rule.query : undefined;
  const index = 'index' in rule ? (rule.index as string[] | undefined) : undefined;
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
          <EuiCodeBlock language="esql" fontSize="s" paddingSize="s" overflowHeight={150}>
            {query}
          </EuiCodeBlock>
          <EuiSpacer size="s" />
        </>
      )}

      {index && index.length > 0 && <IndexPatterns patterns={index} />}

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

      <EuiText size="xs">
        {rule.severity && (
          <>
            <strong>
              {i18n.translate('xpack.securitySolution.agentBuilder.ruleAttachment.severityLabel', {
                defaultMessage: 'Severity:',
              })}
            </strong>{' '}
            {rule.severity.charAt(0).toUpperCase() + rule.severity.slice(1)}
            {rule.risk_score !== undefined && <>{' | '}</>}
          </>
        )}
        {rule.risk_score !== undefined && (
          <>
            <strong>
              {i18n.translate('xpack.securitySolution.agentBuilder.ruleAttachment.riskScoreLabel', {
                defaultMessage: 'Risk Score:',
              })}
            </strong>{' '}
            {rule.risk_score}
          </>
        )}
      </EuiText>

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
