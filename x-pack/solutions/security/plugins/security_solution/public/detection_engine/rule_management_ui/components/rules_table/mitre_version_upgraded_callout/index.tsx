/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { EuiCallOut, EuiLink, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { SecurityPageName } from '../../../../../../common/constants';
import { useKibana } from '../../../../../common/lib/kibana';
import { useGetSecuritySolutionUrl } from '../../../../../common/components/link_to';
import { useIsExperimentalFeatureEnabled } from '../../../../../common/hooks/use_experimental_features';
import { useMitreConfiguration } from '../../../../../common/hooks/mitre/use_mitre_configuration';
import {
  MITRE_VERSION_UPGRADED_CALLOUT_TITLE,
  MITRE_VERSION_UPGRADED_CALLOUT_LEARN_MORE,
} from './translations';

/**
 * One-time notice shown on the Rules Management page to inform users that the
 * active MITRE ATT&CK® dataset was upgraded. The dismissal key is derived from
 * the resolved framework version so each version bump automatically re-surfaces
 * the callout. The component renders nothing when the resolved version is
 * unavailable or when the fetch has errored.
 */
export const MitreVersionUpgradedCallout = React.memo(() => {
  const isMitreAttackUpdatesUIEnabled = useIsExperimentalFeatureEnabled(
    'mitreAttackUpdatesUIEnabled'
  );
  const { docLinks } = useKibana().services;
  const getSecuritySolutionUrl = useGetSecuritySolutionUrl();
  const coverageOverviewHref = getSecuritySolutionUrl({
    deepLinkId: SecurityPageName.coverageOverview,
  });
  // Request only tactics — the smallest possible payload — because this component needs
  // only framework_version, which the hook returns regardless of the types filter.
  // The dismissal key is derived from the resolved version, so the hook cannot be
  // skipped until after the version is known; narrowing the payload is the practical
  // optimisation available here.
  const { frameworkVersion, isError: isMitreError } = useMitreConfiguration({
    types: ['tactic'],
  });

  // Normalize: the managed adapter strips the leading 'v', so re-add it at the
  // display site. When frameworkVersion is absent the callout does not render.
  const displayVersion = frameworkVersion ? `v${frameworkVersion}` : undefined;

  // Keyed by the display form (v-prefixed) so dismissals already stored under
  // NEW_FEATURES_TOUR_STORAGE_KEYS.MITRE_VERSION_UPGRADED_CALLOUT stay valid. Keep this
  // format in step with that entry, which blanket-dismiss tooling relies on.
  const dismissalKey = displayVersion
    ? `securitySolution.rulesManagementPage.mitreVersionUpgradedCallout.${displayVersion}`
    : undefined;

  // Default to true so there is no flash before the effect resolves.
  const [isDismissed, setIsDismissed] = useState(true);

  useEffect(() => {
    if (!dismissalKey) return;
    setIsDismissed(localStorage.getItem(dismissalKey) === 'true');
  }, [dismissalKey]);

  const handleDismiss = useCallback(() => {
    if (!dismissalKey) return;
    localStorage.setItem(dismissalKey, 'true');
    setIsDismissed(true);
  }, [dismissalKey]);

  if (!isMitreAttackUpdatesUIEnabled || isMitreError || !displayVersion || isDismissed) {
    return null;
  }

  return (
    <>
      <EuiCallOut
        announceOnMount={false}
        data-test-subj="mitreVersionUpgradedCallout"
        title={MITRE_VERSION_UPGRADED_CALLOUT_TITLE(displayVersion)}
        color="primary"
        iconType="info"
        onDismiss={handleDismiss}
      >
        <p>
          <FormattedMessage
            id="xpack.securitySolution.rulesManagement.mitreVersionUpgradedCallout.body"
            defaultMessage="The MITRE ATT&CK® dataset bundled with Kibana was updated to {version}. Rules that reference IDs no longer present in {version} are flagged on the {coverageLink} and on the rule edit form. {learnMoreLink}"
            values={{
              version: displayVersion,
              coverageLink: (
                <EuiLink
                  href={coverageOverviewHref}
                  data-test-subj="mitreVersionUpgradedCalloutCoverageLink"
                >
                  <FormattedMessage
                    id="xpack.securitySolution.rulesManagement.mitreVersionUpgradedCallout.coverageLink"
                    defaultMessage="MITRE ATT&CK® coverage page"
                  />
                </EuiLink>
              ),
              learnMoreLink: (
                <EuiLink
                  href={docLinks.links.siem.remapMitreAttack}
                  target="_blank"
                  data-test-subj="mitreVersionUpgradedCalloutLearnMoreLink"
                >
                  {MITRE_VERSION_UPGRADED_CALLOUT_LEARN_MORE}
                </EuiLink>
              ),
            }}
          />
        </p>
      </EuiCallOut>
      <EuiSpacer size="s" />
    </>
  );
});
MitreVersionUpgradedCallout.displayName = 'MitreVersionUpgradedCallout';
