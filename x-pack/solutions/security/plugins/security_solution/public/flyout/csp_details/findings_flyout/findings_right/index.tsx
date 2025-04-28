/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { FlyoutPanelProps } from '@kbn/expandable-flyout';
import { EuiFlexGroup, EuiFlexItem, EuiText, EuiSpacer, EuiFlyoutFooter } from '@elastic/eui';
import type {
  FindingMisconfigurationFlyoutContentProps,
  FindingMisconfigurationFlyoutProps,
} from '@kbn/cloud-security-posture';
import { CspEvaluationBadge } from '@kbn/cloud-security-posture';
import { i18n } from '@kbn/i18n';
import { FlyoutNavigation } from '../../../shared/components/flyout_navigation';
import { FlyoutHeader } from '../../../shared/components/flyout_header';
import { useKibana } from '../../../../common/lib/kibana';
import { PreferenceFormattedDate } from '../../../../common/components/formatted_date';
import { FlyoutTitle } from '../../../shared/components/flyout_title';
import { FlyoutBody } from '../../../shared/components/flyout_body';
export interface FindingsMisconfigurationPanelExpandableFlyoutProps extends FlyoutPanelProps {
  key: 'findings-misconfiguration-panel';
  params: FindingMisconfigurationFlyoutProps;
}

export const FindingsMisconfigurationPanel = ({
  resourceId,
  ruleId,
}: FindingMisconfigurationFlyoutProps) => {
  const { cloudSecurityPosture } = useKibana().services;
  const CspFlyout = cloudSecurityPosture.getCloudSecurityPostureMisconfigurationFlyout();

  return (
    <>
      <FlyoutNavigation flyoutIsExpandable={false} />
      <CspFlyout.Component ruleId={ruleId} resourceId={resourceId}>
        {({ finding, createRuleFn }: FindingMisconfigurationFlyoutContentProps) => {
          return (
            <>
              <FlyoutHeader>
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
                  <EuiFlexItem grow={false}>
                    <FlyoutTitle title={finding.rule.name} />
                  </EuiFlexItem>
                </EuiFlexGroup>
                <CspFlyout.Header finding={finding} />
              </FlyoutHeader>
              <FlyoutBody>
                <CspFlyout.Body finding={finding} />
              </FlyoutBody>
              <EuiFlyoutFooter>
                <CspFlyout.Footer createRuleFn={createRuleFn} />
              </EuiFlyoutFooter>
            </>
          );
        }}
      </CspFlyout.Component>
    </>
  );
};

FindingsMisconfigurationPanel.displayName = 'FindingsMisconfigurationPanel';
