/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { i18n } from '@kbn/i18n';
import {
  EuiBadge,
  EuiCallOut,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import {
  type AttachmentRenderProps,
  type InlineRenderCallbacks,
} from '@kbn/agent-builder-browser/attachments';
import type { ApplicationStart } from '@kbn/core-application-browser';
import type { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import type { AiRuleCreationService } from '../../../detection_engine/common/ai_rule_creation_store';
import { FiltersDisplay } from './filters_display';
import { RuleTypeDetails } from './rule_type_details';
import { ScheduleDisplay } from './schedule_display';
import { parseRuleFromAttachment, getRuleTypeLabel, getQueryLabel } from './helpers';
import type { RuleAttachment } from './helpers';
import { INDEX_FIELD_LABEL, RULE_TYPE_FIELD_LABEL } from './translations';
import { useRuleActionButtons } from './use_rule_action_buttons';

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

interface RuleInlineContentProps extends AttachmentRenderProps<RuleAttachment> {
  aiRuleCreation: AiRuleCreationService;
  application: ApplicationStart;
  uiSettings: IUiSettingsClient;
  callbacks?: InlineRenderCallbacks;
}

export const RuleInlineContent: React.FC<RuleInlineContentProps> = ({
  attachment,
  aiRuleCreation,
  application,
  uiSettings,
  callbacks,
}) => {
  const isDirty = useObservable(aiRuleCreation.dirty$, false);
  const isSaving = useObservable(aiRuleCreation.saving$, false);
  // Seed from getter so first render sees the real value — useObservable's async subscribe would briefly return null, freezing the wrong label.
  const lastSavedRuleId = useObservable(
    aiRuleCreation.lastSavedRuleId$,
    aiRuleCreation.getLastSavedRuleId()
  );
  const agentBusy = useObservable(aiRuleCreation.agentBusy$, false);

  const rule = useMemo(() => parseRuleFromAttachment(attachment), [attachment]);

  // registerActionButtons is only passed to the latest card — use it as the "is current" proxy.
  const isCurrentAttachment = callbacks?.registerActionButtons !== undefined;
  const showButtons = isCurrentAttachment && !agentBusy;

  useRuleActionButtons({
    rule,
    aiRuleCreation,
    application,
    uiSettings,
    callbacks,
    isDirty,
    isSaving,
    lastSavedRuleId,
    showButtons,
  });

  if (!rule) {
    return null;
  }

  const query = 'query' in rule ? rule.query : undefined;
  const index = 'index' in rule ? (rule.index as string[] | undefined) : undefined;
  const filters = 'filters' in rule ? (rule.filters as unknown[] | undefined) : undefined;
  const interval = 'interval' in rule ? rule.interval : undefined;
  const from = 'from' in rule ? rule.from : undefined;

  return (
    <EuiPanel paddingSize="m" hasShadow={false} hasBorder={false}>
      {isSaving ? (
        <>
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiLoadingSpinner size="s" />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="subdued">
                {i18n.translate('xpack.securitySolution.agentBuilder.ruleAttachment.savingText', {
                  defaultMessage: 'Saving…',
                })}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="s" />
        </>
      ) : (
        !isCurrentAttachment && (
          <>
            <EuiBadge color="warning">
              {i18n.translate('xpack.securitySolution.agentBuilder.ruleAttachment.modifiedBadge', {
                defaultMessage: 'Modified',
              })}
            </EuiBadge>
            <EuiSpacer size="s" />
          </>
        )
      )}
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

      <EuiSpacer size="s" />
      <EuiCallOut
        size="s"
        color="primary"
        iconType="info"
        title={i18n.translate(
          'xpack.securitySolution.agentBuilder.ruleAttachment.limitationsTitle',
          { defaultMessage: 'AI rule creation limitations' }
        )}
      >
        <EuiText size="xs">
          {i18n.translate('xpack.securitySolution.agentBuilder.ruleAttachment.limitationsBody', {
            defaultMessage:
              'Only ES|QL rules are supported. Requires existing index data. Severity and risk score default to Low / 21 — ask the assistant to change them.',
          })}
        </EuiText>
      </EuiCallOut>
    </EuiPanel>
  );
};
