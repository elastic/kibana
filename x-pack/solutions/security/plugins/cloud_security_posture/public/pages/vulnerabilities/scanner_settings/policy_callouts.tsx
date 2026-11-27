/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLink, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { KbnInfoCallout, KbnWarningCallout } from '@kbn/ui-callout';
import { pagePathGetters } from '@kbn/fleet-plugin/public';
import type { OnboardingStatus } from '@kbn/cloud-security-posture-common/native_vuln_scanner/types';
import { useKibana } from '../../../common/hooks/use_kibana';
import { getPackDifferenceText } from './translations';
import { SCANNER_SETTINGS_TEST_SUBJECTS } from './test_subjects';

type PolicyList = OnboardingStatus['needsOsqueryIntegration'];

const joinNames = (policies: PolicyList): string => policies.map(({ name }) => name).join(', ');

const AgentsTruncatedCallout = () => (
  <KbnWarningCallout
    announceOnMount={false}
    size="s"
    title={i18n.translate('xpack.csp.nativeVulnScanner.callouts.agentsTruncated', {
      defaultMessage:
        'There are more agents than this page can count, so agent numbers may be lower than the real ones.',
    })}
    data-test-subj={SCANNER_SETTINGS_TEST_SUBJECTS.AGENTS_TRUNCATED_CALLOUT}
  />
);

const NeedsOsqueryCallout = ({ policies }: { policies: PolicyList }) => {
  const { http } = useKibana().services;
  const osqueryManagerPath = pagePathGetters
    .integration_details_overview({ pkgkey: 'osquery_manager' })
    .join('');

  return (
    <KbnWarningCallout
      announceOnMount={false}
      title={i18n.translate('xpack.csp.nativeVulnScanner.callouts.needsOsquery.title', {
        defaultMessage: 'Some policies have no Osquery Manager integration',
      })}
      text={
        <>
          <p>
            {i18n.translate('xpack.csp.nativeVulnScanner.callouts.needsOsquery.description', {
              defaultMessage:
                'These policies cannot be scanned until you add the Osquery Manager integration to them: {policies}.',
              values: { policies: joinNames(policies) },
            })}
          </p>
          <EuiLink
            href={http.basePath.prepend(osqueryManagerPath)}
            data-test-subj={SCANNER_SETTINGS_TEST_SUBJECTS.NEEDS_OSQUERY_LINK}
          >
            {i18n.translate('xpack.csp.nativeVulnScanner.callouts.needsOsquery.link', {
              defaultMessage: 'Add Osquery Manager',
            })}
          </EuiLink>
        </>
      }
      data-test-subj={SCANNER_SETTINGS_TEST_SUBJECTS.NEEDS_OSQUERY_CALLOUT}
    />
  );
};

const AgentlessCallout = ({ policies }: { policies: PolicyList }) => (
  <KbnInfoCallout
    announceOnMount={false}
    title={i18n.translate('xpack.csp.nativeVulnScanner.callouts.agentless.title', {
      defaultMessage: 'Agentless policies are not supported',
    })}
    text={i18n.translate('xpack.csp.nativeVulnScanner.callouts.agentless.description', {
      defaultMessage:
        'Agentless policies cannot run osquery, so these policies are never scanned: {policies}.',
      values: { policies: joinNames(policies) },
    })}
    data-test-subj={SCANNER_SETTINGS_TEST_SUBJECTS.AGENTLESS_CALLOUT}
  />
);

const PackDriftCallout = ({ pack }: { pack: OnboardingStatus['pack'] }) => (
  <KbnWarningCallout
    announceOnMount={false}
    title={i18n.translate('xpack.csp.nativeVulnScanner.callouts.packDrift.title', {
      defaultMessage: 'The software inventory pack was changed',
    })}
    text={
      <>
        <p>
          {i18n.translate('xpack.csp.nativeVulnScanner.callouts.packDrift.description', {
            defaultMessage:
              'The pack differs from what the scanner expects. Enabling the scanner on a policy restores it.',
          })}
        </p>
        <ul>
          {pack.differences.map((difference) => (
            <li key={`${difference.code}-${difference.queryId ?? ''}`}>
              {getPackDifferenceText(difference)}
            </li>
          ))}
        </ul>
      </>
    }
    data-test-subj={SCANNER_SETTINGS_TEST_SUBJECTS.PACK_DRIFT_CALLOUT}
  />
);

export const PolicyCallouts = ({ status }: { status: OnboardingStatus }) => {
  const { agentsTruncated, needsOsqueryIntegration, agentlessPolicies, pack } = status;
  const callouts = [
    agentsTruncated && <AgentsTruncatedCallout key="truncated" />,
    needsOsqueryIntegration.length > 0 && (
      <NeedsOsqueryCallout key="needs-osquery" policies={needsOsqueryIntegration} />
    ),
    agentlessPolicies.length > 0 && (
      <AgentlessCallout key="agentless" policies={agentlessPolicies} />
    ),
    pack.state === 'differs' && <PackDriftCallout key="drift" pack={pack} />,
  ].filter(Boolean);

  return (
    <>
      {callouts.map((callout, index) => (
        <React.Fragment key={index}>
          <EuiSpacer size="m" />
          {callout}
        </React.Fragment>
      ))}
    </>
  );
};
