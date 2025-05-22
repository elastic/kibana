/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { FindingsVulnerabilityPanelExpandableFlyoutProps } from '@kbn/cloud-security-posture';
import {
  SeverityStatusBadge,
  getNormalizedSeverity,
  type FindingVulnerabilityFullFlyoutContentProps,
} from '@kbn/cloud-security-posture';
import { EuiFlexGroup, EuiFlexItem, EuiFlyoutFooter, EuiSpacer, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import moment from 'moment';
import { SecurityPageName } from '@kbn/deeplinks-security';
import { useGetNavigationUrlParams } from '@kbn/cloud-security-posture/src/hooks/use_get_navigation_url_params';
import { PreferenceFormattedDate } from '../../../../common/components/formatted_date';
import { FlyoutNavigation } from '../../../shared/components/flyout_navigation';
import { useKibana } from '../../../../common/lib/kibana';
import { FlyoutHeader } from '../../../shared/components/flyout_header';
import { FlyoutBody } from '../../../shared/components/flyout_body';
import { FlyoutTitle } from '../../../shared/components/flyout_title';
import { SecuritySolutionLinkAnchor } from '../../../../common/components/links';

export const FindingsVulnerabilityPanel = ({
  vulnerabilityId,
  resourceId,
  packageName,
  packageVersion,
  eventId,
  isPreviewMode,
}: FindingsVulnerabilityPanelExpandableFlyoutProps['params']) => {
  const { cloudSecurityPosture } = useKibana().services;
  const CspVulnerabilityFlyout = cloudSecurityPosture.getCloudSecurityPostureVulnerabilityFlyout();

  const getNavUrlParams = useGetNavigationUrlParams();
  const getVulnerabilityUrlFilteredByVulnerabilityAndResourceId = (
    VulnerabilityId: string | string[],
    ResourceId: string,
    PackageName: string | string[],
    PackageVersion: string | string[]
  ) => {
    const encodedPackageNameArray = Array.isArray(PackageName)
      ? PackageName.map((str) => encodeURIComponent(str))
      : PackageName;
    const encodedPackageVersionArray = Array.isArray(PackageVersion)
      ? PackageVersion.map((str) => encodeURIComponent(str))
      : PackageVersion;
    return getNavUrlParams(
      {
        'vulnerability.id': VulnerabilityId,
        'resource.id': ResourceId,
        'package.name': encodedPackageNameArray,
        'package.version': encodedPackageVersionArray,
      },
      'vulnerabilities'
    );
  };

  return (
    <>
      <FlyoutNavigation flyoutIsExpandable={false} />
      <CspVulnerabilityFlyout.Component
        vulnerabilityId={vulnerabilityId}
        resourceId={resourceId}
        packageName={packageName}
        packageVersion={packageVersion}
        eventId={eventId}
      >
        {({ finding, createRuleFn }: FindingVulnerabilityFullFlyoutContentProps) => {
          const vulnerabilityTitle =
            finding?.vulnerability?.title ??
            i18n.translate('xpack.securitySolution.csp.vulnerabilitiesFlyout.emptyTitleHolder', {
              defaultMessage: 'No title available (open in Findings page)',
            });

          return (
            <>
              <FlyoutHeader>
                <EuiFlexGroup gutterSize="xs" responsive={false} direction="column">
                  <EuiFlexItem>
                    <SeverityStatusBadge
                      severity={getNormalizedSeverity(finding?.vulnerability?.severity)}
                    />
                    <EuiSpacer size="m" />
                  </EuiFlexItem>
                  {finding?.vulnerability?.published_date && (
                    <EuiFlexItem grow={false}>
                      <EuiText size="xs">
                        <b>
                          {i18n.translate(
                            'xpack.securitySolution.csp.vulnerabilitiesFlyout.published',
                            {
                              defaultMessage: 'Published ',
                            }
                          )}
                        </b>
                        {moment(finding?.vulnerability?.published_date).format('LL').toString()}
                        {' | '}
                        <b>
                          {i18n.translate(
                            'xpack.securitySolution.csp.vulnerabilitiesFlyout.firstFound',
                            {
                              defaultMessage: 'First found ',
                            }
                          )}
                        </b>
                        <PreferenceFormattedDate value={new Date(finding['@timestamp'])} />
                        <EuiSpacer size="xs" />
                      </EuiText>
                    </EuiFlexItem>
                  )}
                </EuiFlexGroup>
                {isPreviewMode ? (
                  <SecuritySolutionLinkAnchor
                    deepLinkId={SecurityPageName.cloudSecurityPostureFindings}
                    path={`${getVulnerabilityUrlFilteredByVulnerabilityAndResourceId(
                      vulnerabilityId,
                      resourceId,
                      packageName,
                      packageVersion
                    )}`}
                    target={'_blank'}
                    external={false}
                  >
                    <FlyoutTitle title={vulnerabilityTitle} isLink />
                  </SecuritySolutionLinkAnchor>
                ) : (
                  <FlyoutTitle title={vulnerabilityTitle} />
                )}
                <EuiSpacer size="xs" />
                <CspVulnerabilityFlyout.Header finding={finding} />
              </FlyoutHeader>
              <FlyoutBody>
                <CspVulnerabilityFlyout.Body finding={finding} />
              </FlyoutBody>
              {!isPreviewMode && (
                <EuiFlyoutFooter>
                  <CspVulnerabilityFlyout.Footer createRuleFn={createRuleFn} />
                </EuiFlyoutFooter>
              )}
            </>
          );
        }}
      </CspVulnerabilityFlyout.Component>
    </>
  );
};

FindingsVulnerabilityPanel.displayName = 'FindingsVulnerabilityPanel';
