/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCodeBlock, EuiSpacer, EuiText } from '@elastic/eui';
import type { RuleResponse } from '../../../../common/api/detection_engine/model/rule_schema';
import {
  Threshold as ThresholdDisplay,
  ThreatIndex as ThreatIndexDisplay,
  constructThreatMappingDescription,
  NewTermsFields as NewTermsFieldsDisplay,
} from '../../../detection_engine/rule_management/components/rule_details/rule_definition_section';
import { convertDateMathToDuration } from '../../../common/utils/date_math';
import { DEFAULT_HISTORY_WINDOW_SIZE } from '../../../common/constants';
import {
  EQL_OPTIONS_EVENT_CATEGORY_FIELD_LABEL,
  EQL_OPTIONS_EVENT_TIEBREAKER_FIELD_LABEL,
  EQL_OPTIONS_EVENT_TIMESTAMP_FIELD_LABEL,
} from '../../../detection_engine/rule_creation/components/eql_query_edit/translations';
import {
  THRESHOLD_FIELD_LABEL,
  ANOMALY_THRESHOLD_FIELD_LABEL,
  MACHINE_LEARNING_JOB_ID_FIELD_LABEL,
  THREAT_INDEX_FIELD_LABEL,
  THREAT_MAPPING_FIELD_LABEL,
  NEW_TERMS_FIELDS_FIELD_LABEL,
  HISTORY_WINDOW_SIZE_FIELD_LABEL,
} from '../../../detection_engine/rule_management/components/rule_details/translations';
import {
  SAVED_QUERY_NAME_LABEL,
  THREAT_QUERY_LABEL,
} from '../../../detection_engine/rule_creation_ui/components/description_step/translations';
const SectionHeading: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <EuiText size="s">
    <strong>{children}</strong>
  </EuiText>
);

export const ThresholdDetails: React.FC<{ rule: RuleResponse }> = ({ rule }) => {
  if (rule.type !== 'threshold') {
    return null;
  }

  return (
    <>
      <SectionHeading>{THRESHOLD_FIELD_LABEL}</SectionHeading>
      <EuiSpacer size="xs" />
      <ThresholdDisplay threshold={rule.threshold} />
    </>
  );
};

export const ThreatMatchDetails: React.FC<{ rule: RuleResponse }> = ({ rule }) => {
  if (rule.type !== 'threat_match') {
    return null;
  }

  return (
    <>
      <SectionHeading>{THREAT_INDEX_FIELD_LABEL}</SectionHeading>
      <EuiSpacer size="xs" />
      <ThreatIndexDisplay threatIndex={rule.threat_index} />
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
        {constructThreatMappingDescription(rule.threat_mapping)}
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
      <NewTermsFieldsDisplay newTermsFields={rule.new_terms_fields} />
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
