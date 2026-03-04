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
import {
  ActionButtonType,
  type AttachmentUIDefinition,
  type AttachmentRenderProps,
} from '@kbn/agent-builder-browser/attachments';
import type { Attachment } from '@kbn/agent-builder-common/attachments';
import type { ApplicationStart } from '@kbn/core-application-browser';
import { toSimpleRuleSchedule } from '../../../common/api/detection_engine/model/rule_schema/to_simple_rule_schedule';
import type { RuleResponse } from '../../../common/api/detection_engine/model/rule_schema';
import { setAiCreatedRule } from '../../detection_engine/common/ai_rule_creation_store';

type RuleAttachment = Attachment<string, { text: string; attachmentLabel?: string }>;

const parseRuleFromAttachment = (attachment: RuleAttachment): RuleResponse | null => {
  console.log('attachment', attachment);
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
  try {
    const parsed = JSON.parse(attachment?.data?.text);
    if (parsed?.name) {
      return parsed.name;
    }
  } catch {
    // ignore
  }
  return undefined;
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

const RuleInlineContent: React.FC<AttachmentRenderProps<RuleAttachment>> = ({ attachment }) => {
  const rule = parseRuleFromAttachment(attachment);

  if (!rule) {
    return <EmptyRuleContent />;
  }

  const query = 'query' in rule ? rule.query : undefined;
  const interval = 'interval' in rule ? rule.interval : undefined;
  const from = 'from' in rule ? rule.from : undefined;

  return (
    <EuiPanel paddingSize="m" hasShadow={false} hasBorder={false}>
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
          <SectionHeading>
            {i18n.translate('xpack.securitySolution.agentBuilder.ruleAttachment.queryHeading', {
              defaultMessage: 'ES|QL Detection Logic',
            })}
          </SectionHeading>
          <EuiSpacer size="xs" />
          <EuiCodeBlock language="esql" fontSize="s" paddingSize="s" overflowHeight={150}>
            {query}
          </EuiCodeBlock>
          <EuiSpacer size="s" />
        </>
      )}

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

export const createRuleAttachmentDefinition = ({
  application,
}: {
  application: ApplicationStart;
}): AttachmentUIDefinition<RuleAttachment> => ({
  getLabel: (attachment) =>
    getRuleName(attachment) ??
    i18n.translate('xpack.securitySolution.agentBuilder.ruleAttachment.label', {
      defaultMessage: 'Security Rule',
    }),
  getIcon: () => 'securityApp',
  renderInlineContent: (props) => <RuleInlineContent {...props} />,
  getActionButtons: ({ attachment }) => {
    const rule = parseRuleFromAttachment(attachment);
    if (!rule) {
      return [];
    }
    return [
      {
        label: i18n.translate(
          'xpack.securitySolution.agentBuilder.ruleAttachment.applyToCreation',
          { defaultMessage: 'Apply to creation' }
        ),
        icon: 'plus',
        type: ActionButtonType.PRIMARY,
        handler: () => {
          setAiCreatedRule(rule);
          application.navigateToApp('securitySolutionUI', {
            path: '/rules/create',
          });
        },
      },
    ];
  },
});
