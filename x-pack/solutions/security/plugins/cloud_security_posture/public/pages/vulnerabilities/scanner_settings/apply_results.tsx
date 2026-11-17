/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSpacer, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { KbnInfoCallout } from '@kbn/ui-callout';
import type { LiveQueryResult, PackStepResult, ApplyOnboardingResult } from './apply_onboarding';
import { getPinOutcomeLabel, getRefusalText } from './translations';
import { SCANNER_SETTINGS_TEST_SUBJECTS, getApplyPolicyTestSubject } from './test_subjects';

const getPackText = ({ status, message }: PackStepResult): string => {
  switch (status) {
    case 'created':
      return i18n.translate('xpack.csp.nativeVulnScanner.applyResults.pack.created', {
        defaultMessage: 'The inventory pack was created and assigned to the selected policies.',
      });
    case 'updated':
      return i18n.translate('xpack.csp.nativeVulnScanner.applyResults.pack.updated', {
        defaultMessage: 'The inventory pack was updated and assigned to the selected policies.',
      });
    case 'unchanged':
      return i18n.translate('xpack.csp.nativeVulnScanner.applyResults.pack.unchanged', {
        defaultMessage: 'The inventory pack was already set up. Nothing to change.',
      });
    case 'failed':
      return i18n.translate('xpack.csp.nativeVulnScanner.applyResults.pack.failed', {
        defaultMessage: 'The inventory pack could not be saved: {message}',
        values: {
          message:
            message ??
            i18n.translate('xpack.csp.nativeVulnScanner.applyResults.unknownError', {
              defaultMessage: 'unknown error',
            }),
        },
      });
    default:
      return i18n.translate('xpack.csp.nativeVulnScanner.applyResults.pack.notRun', {
        defaultMessage: 'The inventory pack was not changed because no policy could be pinned.',
      });
  }
};

const getLiveQueryText = ({ status, message }: LiveQueryResult): string => {
  switch (status) {
    case 'started':
      return i18n.translate('xpack.csp.nativeVulnScanner.applyResults.liveQuery.started', {
        defaultMessage: 'The first inventory was requested from the online agents.',
      });
    case 'no_agents':
      return i18n.translate('xpack.csp.nativeVulnScanner.applyResults.liveQuery.noAgents', {
        defaultMessage: 'No online agents yet; the daily pack will pick them up.',
      });
    case 'skipped':
      return i18n.translate('xpack.csp.nativeVulnScanner.applyResults.liveQuery.skipped', {
        defaultMessage:
          'The first inventory could not be requested now. It arrives with the daily schedule.',
      });
    case 'failed':
      return i18n.translate('xpack.csp.nativeVulnScanner.applyResults.liveQuery.failed', {
        defaultMessage:
          'The first inventory request failed: {message}. It arrives with the daily schedule.',
        values: {
          message:
            message ??
            i18n.translate('xpack.csp.nativeVulnScanner.applyResults.unknownError', {
              defaultMessage: 'unknown error',
            }),
        },
      });
    default:
      return i18n.translate('xpack.csp.nativeVulnScanner.applyResults.liveQuery.notRun', {
        defaultMessage: 'The first inventory was not requested.',
      });
  }
};

export const ApplyResults = ({ result }: { result: ApplyOnboardingResult }) => {
  const { policies, pack, liveQuery } = result;

  return (
    <KbnInfoCallout
      announceOnMount
      title={i18n.translate('xpack.csp.nativeVulnScanner.applyResults.title', {
        defaultMessage: 'Onboarding result',
      })}
      data-test-subj={SCANNER_SETTINGS_TEST_SUBJECTS.APPLY_RESULTS}
      text={
        <>
          <ul>
            {policies.map((policy) => {
              const label = getPinOutcomeLabel(policy.outcome);
              const detail =
                policy.outcome === 'refused' || policy.outcome === 'not_found'
                  ? getRefusalText(policy.reason, policy.key)
                  : policy.message;
              return (
                <li key={policy.id} data-test-subj={getApplyPolicyTestSubject(policy.id)}>
                  {i18n.translate('xpack.csp.nativeVulnScanner.applyResults.policy', {
                    defaultMessage: '{name}: {outcome}',
                    values: { name: policy.name ?? policy.id, outcome: label },
                  })}
                  {detail ? ` — ${detail}` : null}
                </li>
              );
            })}
          </ul>
          <EuiSpacer size="s" />
          <EuiText size="s" data-test-subj={SCANNER_SETTINGS_TEST_SUBJECTS.APPLY_PACK_RESULT}>
            <p>{getPackText(pack)}</p>
          </EuiText>
          <EuiText size="s" data-test-subj={SCANNER_SETTINGS_TEST_SUBJECTS.APPLY_LIVE_QUERY_RESULT}>
            <p>{getLiveQueryText(liveQuery)}</p>
          </EuiText>
        </>
      }
    />
  );
};
