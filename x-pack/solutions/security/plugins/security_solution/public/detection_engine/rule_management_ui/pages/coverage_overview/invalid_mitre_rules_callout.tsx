/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo, useState } from 'react';
import { EuiButton, EuiCallOut, EuiLink, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { THREAT_FRAMEWORK_NAME } from '@kbn/security-mitre-attack-common';
import { useKibana } from '../../../../common/lib/kibana';
import { useCoverageOverviewDashboardContext } from './coverage_overview_dashboard_context';
import { InvalidMitreRulesModal } from './invalid_mitre_rules_modal';
import { filterInvalidlyMappedRulesByFramework } from './helpers';
import * as i18n from './translations';

const CoverageOverviewInvalidMitreRulesCalloutComponent = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { docLinks } = useKibana().services;
  const {
    state: { data, framework, frameworkVersion },
  } = useCoverageOverviewDashboardContext();
  const frameworkLabel = THREAT_FRAMEWORK_NAME[framework];
  // The hook returns the version without the leading 'v', so re-add it at the display site.
  const displayVersion = frameworkVersion ? `v${frameworkVersion}` : undefined;

  const closeModal = useCallback(() => setIsModalOpen(false), []);
  const openModal = useCallback(() => setIsModalOpen(true), []);

  const { enabledRules, disabledRules } = useMemo(
    () => filterInvalidlyMappedRulesByFramework(data?.invalidlyMappedRules, framework),
    [data?.invalidlyMappedRules, framework]
  );
  const invalidCount = enabledRules.length + disabledRules.length;

  // Without a resolved MITRE version there is nothing meaningful to compare against, so stay hidden.
  if (invalidCount === 0 || !displayVersion) {
    return null;
  }

  return (
    <>
      <EuiCallOut
        announceOnMount={false}
        data-test-subj="coverageOverviewInvalidMitreRulesCallout"
        title={i18n.INVALID_MITRE_RULES_CALLOUT_TITLE(frameworkLabel)}
        color="warning"
        iconType="warning"
      >
        <p>
          <FormattedMessage
            id="xpack.securitySolution.coverageOverviewDashboard.invalidMitreRulesCallout.description"
            defaultMessage="You have {count, plural, one {# rule that references} other {# rules that reference}} {framework} IDs not present in the currently supported version ({version}). They may not appear correctly in the coverage matrix. {learnMoreLink}"
            values={{
              count: invalidCount,
              framework: frameworkLabel,
              version: displayVersion,
              learnMoreLink: (
                <EuiLink
                  href={docLinks.links.siem.remapMitreAttack}
                  target="_blank"
                  data-test-subj="coverageOverviewInvalidMitreRulesLearnMoreLink"
                >
                  {i18n.INVALID_MITRE_RULES_CALLOUT_DESCRIPTION_LEARN_MORE}
                </EuiLink>
              ),
            }}
          />
        </p>
        <p>{i18n.INVALID_MITRE_RULES_CALLOUT_PREBUILT_NOTICE(frameworkLabel)}</p>
        <EuiButton
          data-test-subj="coverageOverviewInvalidMitreRulesViewButton"
          color="warning"
          size="s"
          onClick={openModal}
        >
          {i18n.INVALID_MITRE_RULES_VIEW_RULES_BUTTON}
        </EuiButton>
      </EuiCallOut>
      <EuiSpacer size="m" />

      {isModalOpen && (
        <InvalidMitreRulesModal
          enabledRules={enabledRules}
          disabledRules={disabledRules}
          framework={frameworkLabel}
          onClose={closeModal}
        />
      )}
    </>
  );
};

export const CoverageOverviewInvalidMitreRulesCallout = memo(
  CoverageOverviewInvalidMitreRulesCalloutComponent
);
