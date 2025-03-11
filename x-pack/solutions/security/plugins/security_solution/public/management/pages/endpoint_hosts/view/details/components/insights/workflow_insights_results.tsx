/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import styled from 'styled-components';
import {
  EuiButtonIcon,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiToolTip,
  EuiHorizontalRule,
} from '@elastic/eui';
import { ENDPOINT_ARTIFACT_LISTS } from '@kbn/securitysolution-list-constants';
import { useUserPrivileges } from '../../../../../../../common/components/user_privileges';
import { WORKFLOW_INSIGHTS } from '../../../translations';

interface WorkflowInsightsResultsProps {
  results?: SecurityWorkflowInsight[];
  scanCompleted: boolean;
  endpointId: string;
}
import type { WorkflowInsightRouteState } from '../../../../types';
import { getEndpointDetailsPath } from '../../../../../../common/routing';
import { useKibana } from '../../../../../../../common/lib/kibana';
import { APP_PATH, TRUSTED_APPS_PATH } from '../../../../../../../../common/constants';
import type {
  ExceptionListRemediationType,
  SecurityWorkflowInsight,
} from '../../../../../../../../common/endpoint/types/workflow_insights';

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
  const [showEmptyResultsCallout, setShowEmptyResultsCallout] = useState(false);
  const hideEmptyStateCallout = () => setShowEmptyResultsCallout(false);

  const {
    application: { navigateToUrl },
  } = useKibana().services;
  const { canWriteTrustedApplications } = useUserPrivileges().endpointPrivileges;

  useEffect(() => {
    setShowEmptyResultsCallout(results?.length === 0 && scanCompleted);
  }, [results, scanCompleted]);

  const openArtifactCreationPage = useCallback(
    ({ remediation, id }: { remediation: ExceptionListRemediationType; id: string }) => {
      const getUrlBasedOnListId = (listId: string) => {
        switch (listId) {
          case ENDPOINT_ARTIFACT_LISTS.trustedApps.id:
          default:
            return TRUSTED_APPS_PATH;
        }
      };

      const url = `${APP_PATH}${getUrlBasedOnListId(remediation.list_id)}?show=create`;

      const state: WorkflowInsightRouteState = {
        insight: {
          id,
          back_url: `${APP_PATH}${getEndpointDetailsPath({
            name: 'endpointDetails',
            selected_endpoint: endpointId,
          })}`,
          item: {
            comments: [],
            description: remediation.description,
            entries: remediation.entries,
            list_id: remediation.list_id,
            name: remediation.name,
            namespace_type: 'agnostic',
            tags: remediation.tags,
            type: 'simple',
            os_types: remediation.os_types,
          },
        },
      };

      navigateToUrl(url, {
        state,
      });
    },
    [endpointId, navigateToUrl]
  );

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
        return (insight.remediation.exception_list_items ?? []).map((item) => {
          const { ariaLabel, tooltipContent, tooltipNoPermissions } =
            WORKFLOW_INSIGHTS.issues.remediationButton;

          return (
            <EuiPanel
              paddingSize="m"
              hasShadow={false}
              hasBorder
              key={index}
              data-test-subj={`workflowInsightsResult-${index}`}
            >
              <EuiFlexGroup alignItems={'center'} gutterSize={'m'}>
                <EuiFlexItem grow={false}>
                  <EuiIcon type="warning" size="l" color="warning" />
                </EuiFlexItem>

                <EuiFlexItem>
                  <EuiText size="s">
                    <EuiText size={'s'}>
                      <strong>{insight.metadata.display_name || insight.value}</strong>
                    </EuiText>
                    <EuiText size={'s'} color={'subdued'}>
                      {insight.message}
                    </EuiText>
                    <EuiText size={'xs'} color={'subdued'} css={'word-break: break-word'}>
                      {item.entries[0].type === 'match' &&
                        item.entries[0].field === 'process.executable.caseless' &&
                        item.entries[0].value}
                    </EuiText>
                  </EuiText>
                </EuiFlexItem>

                <EuiFlexItem grow={false} style={{ marginLeft: 'auto' }}>
                  <EuiToolTip
                    content={canWriteTrustedApplications ? tooltipContent : tooltipNoPermissions}
                    position={'top'}
                  >
                    <EuiButtonIcon
                      data-test-subj={`workflowInsightsResult-${index}-remediation`}
                      isDisabled={!canWriteTrustedApplications}
                      aria-label={ariaLabel}
                      iconType="popout"
                      href={`${APP_PATH}${TRUSTED_APPS_PATH}?show=create`}
                      onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
                        e.preventDefault();
                        if (insight.id) {
                          openArtifactCreationPage({ remediation: item, id: insight.id });
                        }
                      }}
                    />
                  </EuiToolTip>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiPanel>
          );
        });
      });
    }
    return null;
  }, [canWriteTrustedApplications, openArtifactCreationPage, results, showEmptyResultsCallout]);

  const showInsights = !!(showEmptyResultsCallout || results?.length);

  return (
    <>
      {showInsights && (
        <>
          <EuiText size={'s'}>
            <h4>{WORKFLOW_INSIGHTS.issues.title}</h4>
          </EuiText>
          <EuiSpacer size={'s'} />
        </>
      )}
      <ScrollableContainer hasBorder>{insights}</ScrollableContainer>
      {showInsights && <EuiHorizontalRule />}
    </>
  );
};
