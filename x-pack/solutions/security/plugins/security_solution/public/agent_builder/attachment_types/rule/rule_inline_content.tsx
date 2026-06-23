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
import { type AttachmentRenderProps } from '@kbn/agent-builder-browser/attachments';
import type {
  RuleResponse,
  ThreatArray,
} from '../../../../common/api/detection_engine/model/rule_schema';
import type { AiRuleCreationService } from '../../../detection_engine/common/ai_rule_creation_store';
import { FiltersDisplay } from './filters_display';
import { RuleTypeDetails } from './rule_type_details';
import { ScheduleDisplay } from './schedule_display';
import {
  parseRuleFromAttachment,
  getRuleTypeLabel,
  getQueryLabel,
  getRuleAttachmentIntent,
} from './helpers';
import type { RuleAttachment } from './helpers';
import { INDEX_FIELD_LABEL, RULE_TYPE_FIELD_LABEL } from './translations';

const EMPTY_SAVED_VERSIONS: ReadonlySet<string> = new Set();

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

const MitreMappings: React.FC<{ threat: ThreatArray }> = ({ threat }) => (
  <EuiFlexGroup responsive={false} gutterSize="s" wrap>
    {threat.map((entry) => (
      <EuiFlexItem grow={false} key={entry.tactic.id}>
        <EuiFlexGroup responsive={false} gutterSize="xs" wrap>
          <EuiFlexItem grow={false}>
            <EuiBadge color="hollow">{entry.tactic.name}</EuiBadge>
          </EuiFlexItem>
          {entry.technique &&
            entry.technique.map((technique) => (
              <EuiFlexItem grow={false} key={technique.id}>
                <EuiBadge color="hollow">{technique.name}</EuiBadge>
              </EuiFlexItem>
            ))}
        </EuiFlexGroup>
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

const getRuleDisplayFields = (rule: RuleResponse) => ({
  query: 'query' in rule ? rule.query : undefined,
  index: 'index' in rule ? (rule.index as string[] | undefined) : undefined,
  filters: 'filters' in rule ? (rule.filters as unknown[] | undefined) : undefined,
  interval: 'interval' in rule ? rule.interval : undefined,
  from: 'from' in rule ? rule.from : undefined,
});

interface RuleInlineContentProps extends AttachmentRenderProps<RuleAttachment> {
  aiRuleCreation: AiRuleCreationService;
}

export const RuleInlineContent: React.FC<RuleInlineContentProps> = ({
  attachment,
  aiRuleCreation,
}) => {
  const isSaving = useObservable(aiRuleCreation.saving$, false);
  const savedCreateVersions = useObservable(
    aiRuleCreation.savedCreateVersions$,
    EMPTY_SAVED_VERSIONS
  );

  const rule = useMemo(() => parseRuleFromAttachment(attachment), [attachment]);

  const intent = getRuleAttachmentIntent(attachment);

  // The label is frozen per version, so a saved rule's create card keeps saying "Create rule".
  // Warn that clicking it again duplicates the rule. The guard is keyed on (attachmentId, version)
  // so saving card A-v1 never triggers the warning on card B-v1.
  const willDuplicateOnSave =
    intent === 'create' &&
    attachment.version !== undefined &&
    savedCreateVersions.has(`${attachment.id}:${attachment.version}`);

  if (!rule) {
    return null;
  }

  const { query, index, filters, interval, from } = getRuleDisplayFields(rule);

  return (
    <EuiPanel paddingSize="m" hasShadow={false} hasBorder={false}>
      {isSaving && (
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
          <EuiSpacer size="s" />
          <IndexPatterns patterns={index} />
        </>
      )}

      {filters && filters.length > 0 && (
        <>
          <EuiSpacer size="s" />
          <FiltersDisplay filters={filters} />
        </>
      )}

      <EuiSpacer size="s" />
      <RuleTypeDetails rule={rule} />

      {rule.tags && rule.tags.length > 0 && (
        <>
          <EuiSpacer size="s" />
          <SectionHeading>
            {i18n.translate('xpack.securitySolution.agentBuilder.ruleAttachment.tagsHeading', {
              defaultMessage: 'Tags',
            })}
          </SectionHeading>
          <EuiSpacer size="xs" />
          <TagsBadgeList tags={rule.tags} />
        </>
      )}

      {rule.threat && rule.threat.length > 0 && (
        <>
          <EuiSpacer size="s" />
          <SectionHeading>
            {i18n.translate('xpack.securitySolution.agentBuilder.ruleAttachment.mitreHeading', {
              defaultMessage: 'MITRE ATT&CK',
            })}
          </SectionHeading>
          <EuiSpacer size="xs" />
          <MitreMappings threat={rule.threat} />
        </>
      )}

      <EuiSpacer size="s" />
      <SeverityRiskScore severity={rule.severity} riskScore={rule.risk_score} />

      {interval && (
        <>
          <EuiSpacer size="s" />
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

      {willDuplicateOnSave && (
        <>
          <EuiSpacer size="s" />
          <EuiCallOut
            announceOnMount
            size="s"
            color="warning"
            iconType="copyClipboard"
            title={i18n.translate(
              'xpack.securitySolution.agentBuilder.ruleAttachment.alreadySavedTitle',
              { defaultMessage: 'This rule has already been saved' }
            )}
          >
            <EuiText size="xs">
              {i18n.translate(
                'xpack.securitySolution.agentBuilder.ruleAttachment.alreadySavedBody',
                {
                  defaultMessage:
                    'Clicking "Create rule" again will save a separate, duplicate rule.',
                }
              )}
            </EuiText>
          </EuiCallOut>
        </>
      )}
    </EuiPanel>
  );
};
