/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiText, EuiSpacer, EuiFlyoutFooter } from '@elastic/eui';
import type { FindingsMisconfigurationPanelExpandableFlyoutProps } from '@kbn/cloud-security-posture';
import { CspEvaluationBadge } from '@kbn/cloud-security-posture';
import { i18n } from '@kbn/i18n';
import { useGetNavigationUrlParams } from '@kbn/cloud-security-posture/src/hooks/use_get_navigation_url_params';
import { METRIC_TYPE } from '@kbn/analytics';
import {
  uiMetricService,
  NAV_TO_FINDINGS_BY_RULE_NAME_FRPOM_ENTITY_FLYOUT,
} from '@kbn/cloud-security-posture-common/utils/ui_metrics';
import { SecurityPageName } from '@kbn/deeplinks-security';
import { FlyoutNavigation } from '../../../shared/components/flyout_navigation';
import { FlyoutHeader } from '../../../shared/components/flyout_header';
import { useKibana } from '../../../../common/lib/kibana';
import { PreferenceFormattedDate } from '../../../../common/components/formatted_date';
import { FlyoutTitle } from '../../../shared/components/flyout_title';
import { FlyoutBody } from '../../../shared/components/flyout_body';
import { SecuritySolutionLinkAnchor } from '../../../../common/components/links';

export const FindingsMisconfigurationPanel = ({
  resourceId,
  ruleId,
  isPreviewMode,
}: FindingsMisconfigurationPanelExpandableFlyoutProps['params']) => {
  const { cloudSecurityPosture } = useKibana().services;
  const CspFlyout = cloudSecurityPosture.getCloudSecurityPostureMisconfigurationFlyout();

  const getNavUrlParams = useGetNavigationUrlParams();
  const getFindingsPageUrlFilteredByRuleAndResourceId = (
    findingRuleId: string,
    findingResourceId: string
  ) => {
    return getNavUrlParams(
      { 'rule.id': findingRuleId, 'resource.id': findingResourceId },
      'configurations'
    );
  };

  return (
    <>
      <FlyoutNavigation flyoutIsExpandable={false} />
      <CspFlyout.Component ruleId={ruleId} resourceId={resourceId}>
        {({ finding, createRuleFn }) => {
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
                  <EuiFlexItem>
                    {isPreviewMode ? (
                      <SecuritySolutionLinkAnchor
                        deepLinkId={SecurityPageName.cloudSecurityPostureFindings}
                        path={`${getFindingsPageUrlFilteredByRuleAndResourceId(
                          finding.rule.id,
                          finding.resource.id
                        )}`}
                        target={'_blank'}
                        external={false}
                        onClick={() => {
                          uiMetricService.trackUiMetric(
                            METRIC_TYPE.CLICK,
                            NAV_TO_FINDINGS_BY_RULE_NAME_FRPOM_ENTITY_FLYOUT
                          );
                        }}
                      >
                        <FlyoutTitle title={finding.rule.name} isLink />
                      </SecuritySolutionLinkAnchor>
                    ) : (
                      <FlyoutTitle title={finding.rule.name} />
                    )}
                  </EuiFlexItem>
                </EuiFlexGroup>
                <CspFlyout.Header finding={finding} />
              </FlyoutHeader>
              <FlyoutBody>
                <CspFlyout.Body finding={finding} />
              </FlyoutBody>
              {!isPreviewMode ? (
                <EuiFlyoutFooter>
                  <CspFlyout.Footer createRuleFn={createRuleFn} />
                </EuiFlyoutFooter>
              ) : (
                <></>
              )}
            </>
          );
        }}
      </CspFlyout.Component>
    </>
  );
};

FindingsMisconfigurationPanel.displayName = 'FindingsMisconfigurationPanel';
