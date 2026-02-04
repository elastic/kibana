/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState, useMemo } from 'react';
import styled from 'styled-components';
import {
  EuiCallOut,
  EuiFlexGroup,
  EuiIcon,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiHorizontalRule,
  EuiLink,
} from '@elastic/eui';
import { DefendInsightType } from '@kbn/elastic-assistant-common';

import type { SecurityWorkflowInsight } from '../../../../../../../../common/endpoint/types/workflow_insights';
import { WORKFLOW_INSIGHTS_SURVEY_URL } from '../../../../constants';
import { WORKFLOW_INSIGHTS } from '../../../translations';
import { WorkflowInsightsIncompatibleAntivirusResult } from './results/incompatible_antivirus';
import { WorkflowInsightsPolicyResponseFailureResult } from './results/policy_response_failure';
import { useKibana } from '../../../../../../../common/lib/kibana';
interface WorkflowInsightsResultsProps {
  results?: SecurityWorkflowInsight[];
  scanCompleted: boolean;
  endpointId: string;
}

const CustomEuiCallOut = styled(EuiCallOut)`
  & .euiButtonIcon {
    margin-top: 5px; /* Lower the close button */
  }
`;

const ScrollableContainer = styled(EuiPanel)`
  max-height: 500px;
  overflow-y: auto;
  padding: 0;
`;

export const WorkflowInsightsResults = ({
  results,
  scanCompleted,
  endpointId,
}: WorkflowInsightsResultsProps) => {
  const { notifications } = useKibana().services;
  const [showEmptyResultsCallout, setShowEmptyResultsCallout] = useState(false);
  const hideEmptyStateCallout = () => setShowEmptyResultsCallout(false);
  const isFeedbackEnabled = notifications?.feedback?.isEnabled() ?? true;

  useEffect(() => {
    setShowEmptyResultsCallout(results?.length === 0 && scanCompleted);
  }, [results, scanCompleted]);

  const insights = useMemo(() => {
    if (showEmptyResultsCallout) {
      return (
        <CustomEuiCallOut
          onDismiss={hideEmptyStateCallout}
          color={'success'}
          data-test-subj={'workflowInsightsEmptyResultsCallout'}
        >
          {WORKFLOW_INSIGHTS.issues.emptyResults}
        </CustomEuiCallOut>
      );
    } else if (results?.length) {
      return results.flatMap((insight, index) => {
        switch (insight.type) {
          case DefendInsightType.Enum.incompatible_antivirus:
            return (
              <WorkflowInsightsIncompatibleAntivirusResult
                insight={insight}
                index={index}
                endpointId={endpointId}
              />
            );
          case DefendInsightType.Enum.policy_response_failure:
            return <WorkflowInsightsPolicyResponseFailureResult insight={insight} index={index} />;
          default:
            return null;
        }
      });
    }
    return null;
  }, [endpointId, results, showEmptyResultsCallout]);

  const surveyLink = useMemo(() => {
    if (!results?.length || !isFeedbackEnabled) {
      return null;
    }

    return (
      <>
        <EuiSpacer size={'xs'} />
        <EuiFlexGroup
          gutterSize={'xs'}
          alignItems={'center'}
          data-test-subj={'workflowInsightsSurveySection'}
        >
          <EuiIcon type="discuss" size="m" />
          <EuiText size={'xs'} data-test-subj={'workflowInsightsSurveyLink'}>
            <p>
              {WORKFLOW_INSIGHTS.issues.survey.description}
              <EuiLink target="_blank" href={WORKFLOW_INSIGHTS_SURVEY_URL}>
                {WORKFLOW_INSIGHTS.issues.survey.callToAction}
              </EuiLink>
            </p>
          </EuiText>
        </EuiFlexGroup>
      </>
    );
  }, [results, isFeedbackEnabled]);

  const showInsights = !!(showEmptyResultsCallout || results?.length);

  return (
    <>
      {showInsights && (
        <>
          <EuiText size={'s'}>
            <h4>{WORKFLOW_INSIGHTS.issues.title}</h4>
          </EuiText>
          {surveyLink}
          <EuiSpacer size={'s'} />
        </>
      )}
      <ScrollableContainer hasShadow={false}>
        <EuiFlexGroup direction="column" gutterSize="s">
          {insights}
        </EuiFlexGroup>
      </ScrollableContainer>
      {showInsights && <EuiHorizontalRule />}
    </>
  );
};
