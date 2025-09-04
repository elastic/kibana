/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiAccordion,
  EuiCallOut,
  EuiHorizontalRule,
  EuiLink,
  EuiSpacer,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import React, { useState } from 'react';
import { css } from '@emotion/react';
import { FormattedMessage } from '@kbn/i18n-react';
import { useHasVulnerabilities } from '@kbn/cloud-security-posture/src/hooks/use_has_vulnerabilities';
import { useHasMisconfigurations } from '@kbn/cloud-security-posture/src/hooks/use_has_misconfigurations';
import { i18n } from '@kbn/i18n';
import type { EntityIdentifierFields } from '../../../common/entity_analytics/types';
import { MisconfigurationsPreview } from './misconfiguration/misconfiguration_preview';
import { VulnerabilitiesPreview } from './vulnerabilities/vulnerabilities_preview';
import { AlertsPreview } from './alerts/alerts_preview';
import { useGlobalTime } from '../../common/containers/use_global_time';
import { DETECTION_RESPONSE_ALERTS_BY_STATUS_ID } from '../../overview/components/detection_response/alerts_by_status/types';
import { useNonClosedAlerts } from '../hooks/use_non_closed_alerts';
import type { EntityDetailsPath } from '../../flyout/entity_details/shared/components/left_panel/left_panel_header';

const ENTITY_INSIGHT_CALLOUT_HIDDEN_KEY = 'InsightsCallOutHidden';

export type CloudPostureEntityIdentifier =
  | Extract<
      EntityIdentifierFields,
      | EntityIdentifierFields.hostName
      | EntityIdentifierFields.userName
      | EntityIdentifierFields.generic
    >
  | 'related.entity'; // related.entity is not an entity identifier field, but it includes entity ids which we use to filter for related entities

export const EntityInsight = <T,>({
  value,
  field,
  isPreviewMode,
  isLinkEnabled,
  openDetailsPanel,
}: {
  value: string;
  field: CloudPostureEntityIdentifier;
  isPreviewMode?: boolean;
  isLinkEnabled: boolean;
  openDetailsPanel: (path: EntityDetailsPath) => void;
}) => {
  const { euiTheme } = useEuiTheme();
  const insightContent: React.ReactElement[] = [];

  const {
    hasMisconfigurationFindings: showMisconfigurationsPreview,
    has3PMisconfigurationFindings,
  } = useHasMisconfigurations(field, value);

  const { hasVulnerabilitiesFindings, has3PVulnerabilitiesFindings } = useHasVulnerabilities(
    field,
    value
  );

  const showVulnerabilitiesPreview = hasVulnerabilitiesFindings && field === 'host.name';

  const { to, from } = useGlobalTime();

  const {
    hasNonClosedAlerts: showAlertsPreview,
    filteredAlertsData,
    alertHas3rdPartyData,
  } = useNonClosedAlerts({
    field,
    value,
    to,
    from,
    queryId: DETECTION_RESPONSE_ALERTS_BY_STATUS_ID,
  });

  const [showCallOut, setShowCallOut] = useState(
    localStorage.getItem(ENTITY_INSIGHT_CALLOUT_HIDDEN_KEY) !== 'true'
  );

  const onDismiss = () => {
    setShowCallOut(false);
    localStorage.setItem(ENTITY_INSIGHT_CALLOUT_HIDDEN_KEY, 'true');
  };

  if (showAlertsPreview) {
    insightContent.push(
      <>
        <AlertsPreview
          alertsData={filteredAlertsData}
          isPreviewMode={isPreviewMode}
          isLinkEnabled={isLinkEnabled}
          openDetailsPanel={openDetailsPanel}
        />
        <EuiSpacer size="s" />
      </>
    );
  }

  if (showMisconfigurationsPreview)
    insightContent.push(
      <>
        <MisconfigurationsPreview
          value={value}
          field={field}
          isPreviewMode={isPreviewMode}
          isLinkEnabled={isLinkEnabled}
          openDetailsPanel={openDetailsPanel}
        />
        <EuiSpacer size="s" />
      </>
    );
  if (showVulnerabilitiesPreview)
    insightContent.push(
      <>
        <VulnerabilitiesPreview
          value={value}
          field={field}
          isPreviewMode={isPreviewMode}
          isLinkEnabled={isLinkEnabled}
          openDetailsPanel={openDetailsPanel}
        />
        <EuiSpacer size="s" />
      </>
    );
  return (
    <>
      {insightContent.length > 0 && (
        <>
          <EuiAccordion
            initialIsOpen={true}
            id="entityInsight-accordion"
            data-test-subj="entityInsightTestSubj"
            buttonProps={{
              'data-test-subj': 'entityInsight-accordion-button',
              css: css`
                color: ${euiTheme.colors.primary};
              `,
            }}
            buttonContent={
              <EuiTitle size="xs">
                <h3>
                  <FormattedMessage
                    id="xpack.securitySolution.flyout.entityDetails.insightsTitle"
                    defaultMessage="Insights"
                  />
                </h3>
              </EuiTitle>
            }
          >
            {(has3PMisconfigurationFindings ||
              has3PVulnerabilitiesFindings ||
              alertHas3rdPartyData) &&
            showCallOut ? (
              <>
                <EuiSpacer size="m" />

                <EuiCallOut
                  title={i18n.translate(
                    'xpack.securitySolution.flyout.entityDetails.callOutTitle',
                    {
                      defaultMessage: '3rd party insights',
                    }
                  )}
                  color="success"
                  iconType="cheer"
                  onDismiss={onDismiss}
                >
                  <FormattedMessage
                    id="xpack.securitySolution.flyout.entityDetails.callOutText"
                    defaultMessage="Some insights are from an external cloud security product. {learnMoreLink}"
                    values={{
                      learnMoreLink: (
                        <EuiLink
                          href="https://www.elastic.co/docs/solutions/security/cloud/ingest-third-party-cloud-security-data"
                          target="_blank"
                          external
                        >
                          {'Learn more'}
                        </EuiLink>
                      ),
                    }}
                  />
                </EuiCallOut>

                <EuiSpacer size="m" />
              </>
            ) : (
              <EuiSpacer size="m" />
            )}
            {insightContent}
          </EuiAccordion>
          <EuiHorizontalRule />
        </>
      )}
    </>
  );
};
