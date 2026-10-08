/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiText, EuiTitle } from '@elastic/eui';
import { CaseStatuses, Status } from '@kbn/cases-components';
import type {
  ResponseState,
  StoryResponse,
} from '../../../../../common/entity_analytics/executive_brief/types';
import { CaseDetailsLink } from '../../../../common/components/links';

export const RESPONSE_STATE_LABEL: Record<ResponseState, string> = {
  unaddressed: 'Unaddressed',
  in_progress: 'Being handled',
  contained: 'Contained',
};

const RESPONSE_STATE_COLOR: Record<ResponseState, 'warning' | 'primary' | 'success'> = {
  unaddressed: 'warning',
  in_progress: 'primary',
  contained: 'success',
};

const CASE_STATUS: Record<'open' | 'in-progress' | 'closed', CaseStatuses> = {
  open: CaseStatuses.open,
  'in-progress': CaseStatuses['in-progress'],
  closed: CaseStatuses.closed,
};

export const ResponseStateBadge: React.FC<{ state: ResponseState }> = ({ state }) => (
  <EuiBadge color={RESPONSE_STATE_COLOR[state]} data-test-subj="executiveBriefResponseState">
    {RESPONSE_STATE_LABEL[state]}
  </EuiBadge>
);

export const ResponseRow: React.FC<{ response: StoryResponse }> = ({ response }) => {
  const { alerts } = response;
  return (
    <div data-test-subj="executiveBriefResponse">
      <EuiTitle size="xxs">
        <h5>{'Response'}</h5>
      </EuiTitle>
      <EuiFlexGroup gutterSize="s" alignItems="center" wrap responsive={false}>
        <EuiFlexItem grow={false}>
          <ResponseStateBadge state={response.state} />
        </EuiFlexItem>
        {response.cases.map((storyCase) => (
          <EuiFlexItem grow={false} key={storyCase.evidenceId}>
            <EuiText size="s">
              <CaseDetailsLink detailName={storyCase.caseId} title={storyCase.title}>
                {storyCase.title}
              </CaseDetailsLink>{' '}
              <Status status={CASE_STATUS[storyCase.status]} />
            </EuiText>
          </EuiFlexItem>
        ))}
        <EuiFlexItem grow={false}>
          <EuiBadge color="hollow">
            {`${alerts.open} open · ${alerts.acknowledged} acknowledged · ${alerts.closed} closed`}
          </EuiBadge>
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
};
