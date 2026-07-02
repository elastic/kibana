/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useState } from 'react';
import { EuiButton, EuiCallOut, EuiLink, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { MITRE_ATTACK_VERSION } from '../../../../../common/detection_engine/mitre/mitre_version';
import { useKibana } from '../../../../common/lib/kibana';
import { useCoverageOverviewDashboardContext } from './coverage_overview_dashboard_context';
import { InvalidMitreRulesModal } from './invalid_mitre_rules_modal';
import * as i18n from './translations';

const CoverageOverviewInvalidMitreRulesCalloutComponent = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { docLinks } = useKibana().services;
  const {
    state: { data },
  } = useCoverageOverviewDashboardContext();

  const closeModal = useCallback(() => setIsModalOpen(false), []);
  const openModal = useCallback(() => setIsModalOpen(true), []);

  const { enabledRules = [], disabledRules = [] } = data?.invalidlyMappedRules ?? {};
  const invalidCount = enabledRules.length + disabledRules.length;

  if (invalidCount === 0) {
    return null;
  }

  return (
    <>
      <EuiCallOut
        announceOnMount={false}
        data-test-subj="coverageOverviewInvalidMitreRulesCallout"
        title={i18n.INVALID_MITRE_RULES_CALLOUT_TITLE}
        color="warning"
        iconType="warning"
      >
        <p>
          <FormattedMessage
            id="xpack.securitySolution.coverageOverviewDashboard.invalidMitreRulesCallout.description"
            defaultMessage="You have {count, plural, one {# rule that references} other {# rules that reference}} MITRE ATT&CK® IDs not present in the currently supported version ({version}). They may not appear correctly in the coverage matrix. {learnMoreLink}"
            values={{
              count: invalidCount,
              version: MITRE_ATTACK_VERSION,
              learnMoreLink: (
                <EuiLink
                  href={docLinks.links.siem.mitreCoverage}
                  target="_blank"
                  data-test-subj="coverageOverviewInvalidMitreRulesLearnMoreLink"
                >
                  {i18n.INVALID_MITRE_RULES_CALLOUT_DESCRIPTION_LEARN_MORE}
                </EuiLink>
              ),
            }}
          />
        </p>
        <p>{i18n.INVALID_MITRE_RULES_CALLOUT_PREBUILT_NOTICE}</p>
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
          onClose={closeModal}
        />
      )}
    </>
  );
};

export const CoverageOverviewInvalidMitreRulesCallout = memo(
  CoverageOverviewInvalidMitreRulesCalloutComponent
);
