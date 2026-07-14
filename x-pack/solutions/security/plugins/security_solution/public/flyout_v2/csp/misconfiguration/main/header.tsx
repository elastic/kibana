/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { memo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiText, EuiSpacer } from '@elastic/eui';
import type { CspFinding } from '@kbn/cloud-security-posture-common';
import { CspEvaluationBadge } from '@kbn/cloud-security-posture';
import { i18n } from '@kbn/i18n';
import { useKibana } from '../../../../common/lib/kibana';
import { PreferenceFormattedDate } from '../../../../common/components/formatted_date';
import { FlyoutTitle } from '../../../shared/components/flyout_title';

export interface HeaderProps {
  /**
   * The misconfiguration finding to render the header for.
   */
  finding: CspFinding;
}

/**
 * Header component for the misconfiguration finding flyout.
 */
export const Header: FC<HeaderProps> = memo(({ finding }: HeaderProps) => {
  const { cloudSecurityPosture } = useKibana().services;
  const CspFlyout = cloudSecurityPosture.getCloudSecurityPostureMisconfigurationFlyout();

  return (
    <>
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
    </>
  );
});

Header.displayName = 'Header';
