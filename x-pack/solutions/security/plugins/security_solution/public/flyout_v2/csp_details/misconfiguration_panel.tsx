/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiSpacer,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiEmptyPrompt,
  EuiLoadingSpinner,
} from '@elastic/eui';
import { CspEvaluationBadge } from '@kbn/cloud-security-posture';
import type { CspFinding } from '@kbn/cloud-security-posture-common';
import { useMisconfigurationFinding } from '@kbn/cloud-security-posture/src/hooks/use_misconfiguration_finding';
import { createMisconfigurationFindingsQuery } from '@kbn/cloud-security-posture-common/utils/findings_query_builders';
import { i18n } from '@kbn/i18n';
import { useKibana } from '../../common/lib/kibana';
import { PreferenceFormattedDate } from '../../common/components/formatted_date';
import { FlyoutTitle } from '../shared/components/flyout_title';
import { FlyoutBody } from '../../flyout/shared/components/flyout_body';

export interface MisconfigurationPanelProps {
  resourceId: string;
  ruleId: string;
  /** Dev override: supply finding data directly, bypassing Elasticsearch query. */
  mockFinding?: CspFinding;
}

/**
 * V2 system-flyout compatible misconfiguration finding panel.
 * This is a simplified version that doesn't use expandable flyout components.
 */
export const MisconfigurationPanel = ({
  resourceId,
  ruleId,
  mockFinding,
}: MisconfigurationPanelProps) => {
  const { cloudSecurityPosture } = useKibana().services;
  const CspFlyout = cloudSecurityPosture.getCloudSecurityPostureMisconfigurationFlyout();

  const hasMockData = mockFinding != null;

  const { data, isLoading, isError } = useMisconfigurationFinding({
    query: createMisconfigurationFindingsQuery(resourceId, ruleId),
    enabled: !hasMockData,
    pageSize: 1,
  });

  const finding = hasMockData ? mockFinding : data?.result.hits[0]?._source;

  if (isLoading && !hasMockData) {
    return (
      <EuiFlyoutBody>
        <EuiEmptyPrompt
          icon={<EuiLoadingSpinner size="xl" />}
          title={
            <h2>
              {i18n.translate('xpack.securitySolution.flyout.csp.misconfiguration.loading', {
                defaultMessage: 'Loading finding details...',
              })}
            </h2>
          }
        />
      </EuiFlyoutBody>
    );
  }

  if ((isError && !hasMockData) || !finding) {
    return (
      <EuiFlyoutBody>
        <EuiEmptyPrompt
          iconType="warning"
          color="danger"
          title={
            <h2>
              {i18n.translate('xpack.securitySolution.flyout.csp.misconfiguration.notFound', {
                defaultMessage: 'Finding not found',
              })}
            </h2>
          }
          body={
            <p>
              {i18n.translate(
                'xpack.securitySolution.flyout.csp.misconfiguration.notFoundDescription',
                {
                  defaultMessage:
                    'The misconfiguration finding could not be retrieved. It may have been deleted or the data is not available.',
                }
              )}
            </p>
          }
        />
      </EuiFlyoutBody>
    );
  }

  return (
    <>
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup gutterSize="xs" responsive={false} direction="column">
          <EuiFlexItem grow={false}>
            <CspEvaluationBadge type={finding?.result?.evaluation} />
          </EuiFlexItem>
          {finding['@timestamp'] && (
            <EuiFlexItem grow={false}>
              <EuiText size="xs">
                <b>
                  {i18n.translate('xpack.securitySolution.csp.findingsFlyout.evaluatedAt', {
                    defaultMessage: 'Evaluated at ',
                  })}
                </b>
                <PreferenceFormattedDate value={new Date(finding['@timestamp'])} />
                <EuiSpacer size="xs" />
              </EuiText>
            </EuiFlexItem>
          )}
          <EuiFlexItem>
            <FlyoutTitle title={finding.rule.name} />
          </EuiFlexItem>
        </EuiFlexGroup>
        <CspFlyout.Header finding={finding} />
      </EuiFlyoutHeader>
      <FlyoutBody>
        <CspFlyout.Body finding={finding} />
      </FlyoutBody>
    </>
  );
};

MisconfigurationPanel.displayName = 'MisconfigurationPanel';
