/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import useObservable from 'react-use/lib/useObservable';
import {
  EuiBadge,
  EuiCallOut,
  EuiCodeBlock,
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { type AttachmentRenderProps } from '@kbn/agent-builder-browser/attachments';
import type { RuleResponse } from '../../../../common/api/detection_engine/model/rule_schema';
import type { AiRuleCreationService } from '../../../detection_engine/common/ai_rule_creation_store';
import { toSimpleRuleSchedule } from '../../../../common/api/detection_engine/model/rule_schema/to_simple_rule_schedule';
import { FiltersDisplay } from './filters_display';
import { MitreAttackDisplay } from './mitre_display';
import { RuleTypeDetails } from './rule_type_details';
import { parseRuleFromAttachment, getRuleTypeLabel, getQueryLabel } from './helpers';
import type { RuleAttachment } from './helpers';
import {
  INDEX_FIELD_LABEL,
  RULE_TYPE_FIELD_LABEL,
  SAVING_TEXT,
  DESCRIPTION_HEADING,
  SEVERITY_LABEL,
  RISK_SCORE_LABEL,
  TAGS_HEADING,
  MITRE_HEADING,
  INTERVAL_LABEL,
  LOOKBACK_LABEL,
  LIMITATIONS_TITLE,
  LIMITATIONS_BODY,
} from './translations';

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
        <strong>{SEVERITY_LABEL}</strong> {severity.charAt(0).toUpperCase() + severity.slice(1)}
        {riskScore !== undefined && <>{' | '}</>}
      </>
    )}
    {riskScore !== undefined && (
      <>
        <strong>{RISK_SCORE_LABEL}</strong> {riskScore}
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
  const savingAttachmentIds = useObservable(aiRuleCreation.saving$);
  const isSaving = savingAttachmentIds?.has(attachment.id) ?? false;

  const rule = useMemo(() => parseRuleFromAttachment(attachment), [attachment]);

  if (!rule) {
    return null;
  }

  const { query, index, filters, interval, from } = getRuleDisplayFields(rule);
  const schedule = interval
    ? toSimpleRuleSchedule({ interval, from: from ?? `now-${interval}`, to: 'now' })
    : undefined;

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
                {SAVING_TEXT}
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
          <SectionHeading>{DESCRIPTION_HEADING}</SectionHeading>
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

      {[
        'threshold',
        'threat_match',
        'machine_learning',
        'new_terms',
        'saved_query',
        'eql',
      ].includes(rule.type) && (
        <>
          <EuiSpacer size="s" />
          <RuleTypeDetails rule={rule} />
        </>
      )}

      {rule.tags && rule.tags.length > 0 && (
        <>
          <EuiSpacer size="s" />
          <SectionHeading>{TAGS_HEADING}</SectionHeading>
          <EuiSpacer size="xs" />
          <TagsBadgeList tags={rule.tags} />
        </>
      )}

      {rule.threat && rule.threat.length > 0 && (
        <>
          <EuiSpacer size="s" />
          <SectionHeading>{MITRE_HEADING}</SectionHeading>
          <EuiSpacer size="xs" />
          <EuiFlexGrid columns={2} gutterSize="m" responsive={false}>
            {rule.threat.map((entry, threatIndex) => (
              <EuiFlexItem key={threatIndex}>
                <MitreAttackDisplay threat={[entry]} />
              </EuiFlexItem>
            ))}
          </EuiFlexGrid>
        </>
      )}

      <EuiSpacer size="s" />
      <SeverityRiskScore severity={rule.severity} riskScore={rule.risk_score} />

      {interval && (
        <>
          <EuiSpacer size="s" />
          <EuiText size="s">
            <strong>{INTERVAL_LABEL}</strong> {schedule?.interval ?? interval}
            {schedule?.lookback && (
              <>
                {' | '}
                <strong>{LOOKBACK_LABEL}</strong> {schedule.lookback}
              </>
            )}
          </EuiText>
        </>
      )}

      <EuiSpacer size="s" />
      <EuiCallOut size="s" color="primary" iconType="info" title={LIMITATIONS_TITLE}>
        <EuiText size="xs">{LIMITATIONS_BODY}</EuiText>
      </EuiCallOut>
    </EuiPanel>
  );
};
