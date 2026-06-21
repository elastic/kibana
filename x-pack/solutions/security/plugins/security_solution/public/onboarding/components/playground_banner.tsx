/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiSteps,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useKibana } from '../../common/lib/kibana/kibana_react';

const LABELS = {
  idleTitle: i18n.translate('xpack.securitySolution.onboarding.playground.idle.title', {
    defaultMessage: 'Explore the Ransomware Kill Chain — instant demo environment',
  }),
  idleBody: i18n.translate('xpack.securitySolution.onboarding.playground.idle.body', {
    defaultMessage:
      'Create a dedicated sample-playground space pre-populated with a full ransomware attack scenario: phishing → C2 beacon → lateral movement → credential theft → file encryption. Includes 7 detection rules with linked alerts.',
  }),
  createButton: i18n.translate('xpack.securitySolution.onboarding.playground.create.button', {
    defaultMessage: 'Create demo space',
  }),
  provisioningTitle: i18n.translate(
    'xpack.securitySolution.onboarding.playground.provisioning.title',
    { defaultMessage: 'Setting up the Ransomware Kill Chain scenario...' }
  ),
  provisioningBody: i18n.translate(
    'xpack.securitySolution.onboarding.playground.provisioning.body',
    {
      defaultMessage:
        'Generating events, detection rules, and alerts. Follow the kill chain unfolding below.',
    }
  ),
  doneTitle: i18n.translate('xpack.securitySolution.onboarding.playground.done.title', {
    defaultMessage: 'Ransomware Kill Chain scenario is ready',
  }),
  viewAlerts: i18n.translate('xpack.securitySolution.onboarding.playground.viewAlerts.button', {
    defaultMessage: 'View demo alerts',
  }),
  deleteButton: i18n.translate('xpack.securitySolution.onboarding.playground.delete.button', {
    defaultMessage: 'Delete demo space',
  }),
  errorTitle: i18n.translate('xpack.securitySolution.onboarding.playground.error.title', {
    defaultMessage: 'Provisioning failed',
  }),
  retryButton: i18n.translate('xpack.securitySolution.onboarding.playground.retry.button', {
    defaultMessage: 'Retry',
  }),
} as const;

// ---------------------------------------------------------------------------
// Constants (duplicated here to avoid cross-plugin imports in a PoC)
// ---------------------------------------------------------------------------

const PROVISION_ROUTE = '/internal/security_playground/provision';
const SPACE_ID = 'sample-playground';

const KILL_CHAIN_PHASES = [
  { phase: 'space', title: 'Create demo space' },
  { phase: 'rules', title: 'Install detection rules (7 rules)' },
  {
    phase: 'initial-access',
    title: 'Initial Access',
    story: 'Phishing email → macro-enabled document',
  },
  {
    phase: 'execution',
    title: 'Execution',
    story: 'WINWORD → cmd → certutil → rundll32 (Cobalt Strike)',
  },
  { phase: 'c2', title: 'Command & Control', story: 'Periodic HTTPS beacons to attacker C2' },
  {
    phase: 'lateral-movement',
    title: 'Lateral Movement',
    story: 'PsExec pivots to file server & domain controller',
  },
  {
    phase: 'credential-access',
    title: 'Credential Access',
    story: 'Mimikatz extracts credentials from LSASS on DC',
  },
  {
    phase: 'impact',
    title: 'Impact',
    story: 'Shadow copies deleted, mass file encryption (.locked)',
  },
] as const;

type PhaseId = (typeof KILL_CHAIN_PHASES)[number]['phase'];

interface ProgressEntry {
  phase: PhaseId | 'alerts' | 'complete' | 'error';
  status: 'start' | 'done' | 'error';
  indexed?: number;
  installed?: number;
  message?: string;
  story?: string;
  bulkError?: string;
  totals?: { events: number; alerts: number; rules: number };
}

type ProvisionState = 'idle' | 'provisioning' | 'done' | 'error';

// ---------------------------------------------------------------------------

export const PlaygroundBanner: React.FC = () => {
  const { http, application } = useKibana().services;
  const [provisionState, setProvisionState] = useState<ProvisionState>('idle');
  const [phaseProgress, setPhaseProgress] = useState<Partial<Record<string, ProgressEntry>>>({});
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  const [totals, setTotals] = useState<ProgressEntry['totals']>();

  // ---------------------------------------------------------------------------
  // Provision — consumes streaming NDJSON response
  // ---------------------------------------------------------------------------
  const handleProvision = useCallback(async () => {
    setProvisionState('provisioning');
    setPhaseProgress({});
    setErrorMessage(undefined);
    setTotals(undefined);

    try {
      // rawResponse:true skips body parsing so the stream stays unread.
      // The native fetch Response lives on raw.response (not raw.body).
      const raw = await http.post(PROVISION_ROUTE, {
        asResponse: true,
        rawResponse: true,
      });

      const reader = raw.response?.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let buf = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop() ?? '';

        for (const line of lines.filter((l) => l.trim())) {
          try {
            const entry = JSON.parse(line) as ProgressEntry;
            setPhaseProgress((prev) => ({ ...prev, [entry.phase]: entry }));
            if (entry.phase === 'complete' && entry.totals) {
              setTotals(entry.totals);
              setProvisionState('done');
            } else if (entry.phase === 'error' || entry.status === 'error') {
              setErrorMessage(entry.message ?? 'Provisioning failed');
              setProvisionState('error');
            }
          } catch {
            // Ignore malformed JSON lines
          }
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setErrorMessage(message);
      setProvisionState('error');
    }
  }, [http]);

  // ---------------------------------------------------------------------------
  // Delete
  // ---------------------------------------------------------------------------
  const handleDelete = useCallback(async () => {
    setProvisionState('idle');
    setPhaseProgress({});
    setTotals(undefined);
    try {
      await http.delete(PROVISION_ROUTE);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : String(err));
      setProvisionState('error');
    }
  }, [http]);

  // ---------------------------------------------------------------------------
  // Navigate to sample-playground space alerts page
  // ---------------------------------------------------------------------------
  const handleViewAlerts = useCallback(() => {
    application.navigateToUrl(`/s/${SPACE_ID}/app/security/alerts`);
  }, [application]);

  // ---------------------------------------------------------------------------
  // Steps derived from streaming progress
  // ---------------------------------------------------------------------------
  const steps = KILL_CHAIN_PHASES.map(({ phase, title, ...rest }) => {
    const progress = phaseProgress[phase];
    const story = progress?.story ?? ('story' in rest ? rest.story : undefined);

    let status: 'incomplete' | 'loading' | 'complete' | 'warning' | 'danger' = 'incomplete';
    if (progress?.status === 'done') status = 'complete';
    else if (progress?.status === 'error') status = 'danger';
    else if (provisionState === 'provisioning' && !progress) {
      // Highlight the first pending step as "loading"
      const firstPending = KILL_CHAIN_PHASES.find((p) => !phaseProgress[p.phase]);
      if (firstPending?.phase === phase) status = 'loading';
    }

    return {
      title:
        title +
        (progress?.indexed != null ? ` (${progress.indexed} docs)` : '') +
        (progress?.installed != null ? ` (${progress.installed})` : ''),
      status,
      children:
        story || progress?.bulkError ? (
          <EuiText size="s" color={progress?.bulkError ? 'danger' : 'subdued'}>
            {story && <div>{story}</div>}
            {progress?.bulkError && <div>{`ES error: ${progress.bulkError}`}</div>}
          </EuiText>
        ) : undefined,
    };
  });

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  if (provisionState === 'done') {
    return (
      <EuiCallOut title={LABELS.doneTitle} color="success" iconType="check">
        <EuiText size="s">
          {totals && (
            <p>
              <FormattedMessage
                id="xpack.securitySolution.onboarding.playground.done.body"
                defaultMessage="Provisioned {events} events, {alerts} alerts, and {rules} detection rules into the {space} space."
                values={{
                  events: totals.events,
                  alerts: totals.alerts,
                  rules: totals.rules,
                  space: <strong>{SPACE_ID}</strong>,
                }}
              />
            </p>
          )}
          <p>
            <FormattedMessage
              id="xpack.securitySolution.onboarding.playground.done.discoverTip"
              defaultMessage="{label} In the demo space, open Discover and switch to {em} mode (toggle in the toolbar) to get the time-filter picker. Raw event indices are cluster-wide and visible in all spaces."
              values={{
                label: <strong>{'Discover tip:'}</strong>,
                em: <em>{'Data view'}</em>,
              }}
            />
          </p>
        </EuiText>
        <EuiSpacer size="s" />
        <EuiFlexGroup gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButton color="success" onClick={handleViewAlerts} size="s">
              {LABELS.viewAlerts}
            </EuiButton>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty color="danger" onClick={handleDelete} size="s">
              {LABELS.deleteButton}
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiCallOut>
    );
  }

  if (provisionState === 'error') {
    return (
      <EuiCallOut title={LABELS.errorTitle} color="danger" iconType="error">
        <EuiText size="s">
          <p>{errorMessage}</p>
        </EuiText>
        <EuiSpacer size="s" />
        <EuiButton color="danger" onClick={handleProvision} size="s">
          {LABELS.retryButton}
        </EuiButton>
      </EuiCallOut>
    );
  }

  if (provisionState === 'provisioning') {
    return (
      <EuiCallOut title={LABELS.provisioningTitle} color="primary" iconType="clock">
        <EuiText size="s">
          <p>{LABELS.provisioningBody}</p>
        </EuiText>
        <EuiSpacer size="m" />
        <EuiSteps steps={steps} titleSize="xs" />
      </EuiCallOut>
    );
  }

  // idle
  return (
    <EuiCallOut title={LABELS.idleTitle} color="primary" iconType="securityApp">
      <EuiText size="s">
        <p>{LABELS.idleBody}</p>
      </EuiText>
      <EuiSpacer size="s" />
      <EuiFlexGroup gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiButton color="primary" onClick={handleProvision} size="s">
            {LABELS.createButton}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiCallOut>
  );
};
