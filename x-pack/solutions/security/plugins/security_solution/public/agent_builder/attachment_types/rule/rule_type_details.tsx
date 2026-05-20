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
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import type { RuleResponse } from '../../../../common/api/detection_engine/model/rule_schema';
import { convertDateMathToDuration } from '../../../common/utils/date_math';
import { DEFAULT_HISTORY_WINDOW_SIZE } from '../../../common/constants';

const THRESHOLD_FIELD_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.thresholdFieldLabel',
  { defaultMessage: 'Threshold' }
);
const ANOMALY_THRESHOLD_FIELD_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.anomalyThresholdFieldLabel',
  { defaultMessage: 'Anomaly score threshold' }
);
const MACHINE_LEARNING_JOB_ID_FIELD_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.machineLearningJobIdFieldLabel',
  { defaultMessage: 'Machine Learning job' }
);
const THREAT_INDEX_FIELD_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.threatIndexFieldLabel',
  { defaultMessage: 'Indicator index patterns' }
);
const THREAT_MAPPING_FIELD_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.threatMappingFieldLabel',
  { defaultMessage: 'Indicator mapping' }
);
const NEW_TERMS_FIELDS_FIELD_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.newTermsFieldsFieldLabel',
  { defaultMessage: 'Fields' }
);
const HISTORY_WINDOW_SIZE_FIELD_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.historyWindowSizeFieldLabel',
  { defaultMessage: 'History Window Size' }
);
const EQL_OPTIONS_EVENT_CATEGORY_FIELD_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.eqlQueryEdit.eventCategoryFieldLabel',
  { defaultMessage: 'Event category field' }
);
const EQL_OPTIONS_EVENT_TIEBREAKER_FIELD_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.eqlQueryEdit.tiebreakerFieldLabel',
  { defaultMessage: 'Tiebreaker field' }
);
const EQL_OPTIONS_EVENT_TIMESTAMP_FIELD_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.eqlQueryEdit.timestampFieldLabel',
  { defaultMessage: 'Timestamp field' }
);
const SAVED_QUERY_NAME_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.stepAboutRule.savedQueryNameFieldLabel',
  { defaultMessage: 'Saved query name' }
);
const THREAT_QUERY_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.stepDefineRule.fieldThreatQueryLabel',
  { defaultMessage: 'Indicator index query' }
);
const THRESHOLD_RESULTS_ALL = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDescription.thresholdResultsAllDescription',
  { defaultMessage: 'All results' }
);
const THRESHOLD_RESULTS_AGGREGATED_BY = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDescription.thresholdResultsAggregatedByDescription',
  { defaultMessage: 'Results aggregated by' }
);
const THRESHOLD_CARDINALITY = (
  thresholdFieldsGroupedBy: string,
  cardinalityField: string,
  cardinalityValue: string | number
) =>
  i18n.translate(
    'xpack.securitySolution.detectionEngine.ruleDescription.thresholdResultsCardinalityDescription',
    {
      defaultMessage:
        '{thresholdFieldsGroupedBy} when unique values count of {cardinalityField} >= {cardinalityValue}',
      values: { thresholdFieldsGroupedBy, cardinalityField, cardinalityValue },
    }
  );
const SectionHeading: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <EuiText size="s">
    <strong>{children}</strong>
  </EuiText>
);

export const ThresholdDetails: React.FC<{ rule: RuleResponse }> = ({ rule }) => {
  if (rule.type !== 'threshold') {
    return null;
  }

  const { threshold } = rule;
  let description = !threshold.field[0]
    ? `${THRESHOLD_RESULTS_ALL} >= ${threshold.value}`
    : `${THRESHOLD_RESULTS_AGGREGATED_BY} ${
        Array.isArray(threshold.field) ? threshold.field.join(',') : threshold.field
      } >= ${threshold.value}`;

  if (threshold.cardinality && threshold.cardinality.length > 0) {
    description = THRESHOLD_CARDINALITY(
      description,
      threshold.cardinality[0].field,
      threshold.cardinality[0].value
    );
  }

  return (
    <>
      <SectionHeading>{THRESHOLD_FIELD_LABEL}</SectionHeading>
      <EuiSpacer size="xs" />
      <div>{description}</div>
    </>
  );
};

const formatThreatMapping = (
  threatMapping: Array<{ entries: Array<{ field: string; value: string; negate?: boolean }> }>
): string => {
  return threatMapping
    .map((map) =>
      (map.entries ?? [])
        .map(
          (entry) => `${entry.field} ${entry.negate ? 'DOES NOT MATCH' : 'MATCHES'} ${entry.value}`
        )
        .join(' AND ')
    )
    .join(' OR ');
};

export const ThreatMatchDetails: React.FC<{ rule: RuleResponse }> = ({ rule }) => {
  if (rule.type !== 'threat_match') {
    return null;
  }

  return (
    <>
      <SectionHeading>{THREAT_INDEX_FIELD_LABEL}</SectionHeading>
      <EuiSpacer size="xs" />
      <EuiFlexGroup responsive={false} gutterSize="xs" wrap>
        {rule.threat_index.map((idx) => (
          <EuiFlexItem grow={false} key={idx}>
            <EuiBadge color="hollow">{idx}</EuiBadge>
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
      {rule.threat_query && (
        <>
          <EuiSpacer size="xs" />
          <SectionHeading>{THREAT_QUERY_LABEL}</SectionHeading>
          <EuiSpacer size="xs" />
          <EuiCodeBlock fontSize="s" paddingSize="s" overflowHeight={100} isCopyable>
            {rule.threat_query}
          </EuiCodeBlock>
        </>
      )}
      <EuiSpacer size="xs" />
      <EuiText size="s">
        <strong>
          {THREAT_MAPPING_FIELD_LABEL}
          {':'}
        </strong>{' '}
        {formatThreatMapping(rule.threat_mapping)}
      </EuiText>
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
      <EuiText size="s">
        <strong>
          {MACHINE_LEARNING_JOB_ID_FIELD_LABEL}
          {':'}
        </strong>{' '}
        {jobIds.join(', ')}
      </EuiText>
      <EuiSpacer size="xs" />
      <EuiText size="s">
        <strong>
          {ANOMALY_THRESHOLD_FIELD_LABEL}
          {':'}
        </strong>{' '}
        {rule.anomaly_threshold}
      </EuiText>
    </>
  );
};

export const NewTermsDetails: React.FC<{ rule: RuleResponse }> = ({ rule }) => {
  if (rule.type !== 'new_terms') {
    return null;
  }

  return (
    <>
      <SectionHeading>{NEW_TERMS_FIELDS_FIELD_LABEL}</SectionHeading>
      <EuiSpacer size="xs" />
      <EuiFlexGroup responsive={false} gutterSize="xs" wrap>
        {rule.new_terms_fields.map((field) => (
          <EuiFlexItem grow={false} key={field}>
            <EuiBadge color="hollow">{field}</EuiBadge>
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
      <EuiSpacer size="xs" />
      <EuiText size="s">
        <strong>
          {HISTORY_WINDOW_SIZE_FIELD_LABEL}
          {':'}
        </strong>{' '}
        {rule.history_window_start
          ? convertDateMathToDuration(rule.history_window_start)
          : DEFAULT_HISTORY_WINDOW_SIZE}
      </EuiText>
    </>
  );
};

export const SavedQueryDetails: React.FC<{ rule: RuleResponse }> = ({ rule }) => {
  if (rule.type !== 'saved_query') {
    return null;
  }

  return (
    <EuiText size="s">
      <strong>
        {SAVED_QUERY_NAME_LABEL}
        {':'}
      </strong>{' '}
      {rule.saved_id}
    </EuiText>
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
        <EuiText size="s">
          <strong>
            {EQL_OPTIONS_EVENT_CATEGORY_FIELD_LABEL}
            {':'}
          </strong>{' '}
          {event_category_override}
        </EuiText>
      )}
      {tiebreaker_field && (
        <EuiText size="s">
          <strong>
            {EQL_OPTIONS_EVENT_TIEBREAKER_FIELD_LABEL}
            {':'}
          </strong>{' '}
          {tiebreaker_field}
        </EuiText>
      )}
      {timestamp_field && (
        <EuiText size="s">
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

export const RuleTypeDetails: React.FC<{ rule: RuleResponse }> = ({ rule }) => {
  switch (rule.type) {
    case 'threshold':
      return <ThresholdDetails rule={rule} />;
    case 'threat_match':
      return <ThreatMatchDetails rule={rule} />;
    case 'machine_learning':
      return <MachineLearningDetails rule={rule} />;
    case 'new_terms':
      return <NewTermsDetails rule={rule} />;
    case 'saved_query':
      return <SavedQueryDetails rule={rule} />;
    case 'eql':
      return <EqlDetails rule={rule} />;
    default:
      return null;
  }
};
