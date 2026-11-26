/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPageTemplate,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import type { HttpStart } from '@kbn/core/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { KbnInfoCallout } from '@kbn/ui-callout';
import {
  createHttpServiceAccountsApi,
  ensureNightshiftServiceAccount,
} from '@kbn/nightshift-shared';
import { DETECTION_ENGINE_API_PATH } from '../../common/constants';
import type { ReconcileRulesResponse } from '../../common/reconcile';
import type { DetectionEngineEnableBody } from '../../common/service_account';
import type { TickResult } from '../../common/tick';
import type { ActionOutcome, ActionResult } from './result_card';
import { ResultCard } from './result_card';
import type { DiscoverLinks } from './signals_in_discover';
import { SignalsPanel } from './signals/signals_panel';
import { useLiveSignals } from './signals/use_live_signals';

/** One thing the inspector can do; `run` returns the response tagged with the view that shows it. */
interface EngineAction {
  id: string;
  label: string;
  run: (http: HttpStart) => Promise<ActionOutcome>;
}

function getEngineActions({ isServerless }: { isServerless: boolean }): EngineAction[] {
  return [
    {
      id: 'service_account_status',
      label: 'Service account status',
      run: async (http) => ({
        view: 'raw',
        response: await http.get(`${DETECTION_ENGINE_API_PATH}/service_account`),
      }),
    },
    {
      id: 'set_up_space',
      label: 'Set up this space',
      run: async (http) => ({ view: 'raw', response: await setUpSpace({ http, isServerless }) }),
    },
    {
      id: 'tick',
      label: 'Tick',
      run: (http) => tick({ http, skipBacklog: false }),
    },
    {
      id: 'tick_skip_backlog',
      label: 'Tick, skip backlog',
      run: (http) => tick({ http, skipBacklog: true }),
    },
    {
      id: 'reconcile',
      label: 'Reconcile rules',
      run: async (http) => ({
        view: 'reconcile',
        response: await http.post<ReconcileRulesResponse>(
          `${DETECTION_ENGINE_API_PATH}/_reconcile`
        ),
      }),
    },
  ];
}

async function tick({
  http,
  skipBacklog,
}: {
  http: HttpStart;
  skipBacklog: boolean;
}): Promise<ActionOutcome> {
  const response = await http.post<TickResult>(`${DETECTION_ENGINE_API_PATH}/_tick`, {
    body: JSON.stringify({ skip_backlog: skipBacklog }),
  });
  return { view: 'tick', response };
}

/**
 * Finds or creates the deployment's detection service account as the current user, then binds
 * this space to it, the same steps the Scout setup takes. The account's role must already exist.
 */
async function setUpSpace({
  http,
  isServerless,
}: {
  http: HttpStart;
  isServerless: boolean;
}): Promise<unknown> {
  const serviceAccountId = await ensureNightshiftServiceAccount(
    createHttpServiceAccountsApi({
      request: (path, { method, query, body, version }) =>
        http.fetch(path, { method, query, body, version }),
      getStatus: (error) =>
        typeof error === 'object' &&
        error !== null &&
        'response' in error &&
        error.response instanceof Response
          ? error.response.status
          : undefined,
    }),
    { kind: 'detection', isServerless }
  );
  const body: DetectionEngineEnableBody = { serviceAccountId };
  return http.post(`${DETECTION_ENGINE_API_PATH}/service_account/_enable`, {
    body: JSON.stringify(body),
  });
}

/** The route's own error body when it sent one, so setup and busy errors read as the engine says. */
function toErrorResponse(error: unknown): unknown {
  if (typeof error === 'object' && error !== null && 'body' in error && error.body !== undefined) {
    return error.body;
  }
  return { message: error instanceof Error ? error.message : String(error) };
}

interface InspectorPageProps {
  http: HttpStart;
  isServerless: boolean;
  data: DataPublicPluginStart;
  /** The active space, whose signals the page lists. */
  spaceId: string;
  /** Absent when Discover can't be linked to. */
  discoverLinks?: DiscoverLinks;
}

/** The engine inspector: calls the engine's routes in the current space and shows what they return. */
export function InspectorPage({
  http,
  isServerless,
  data,
  spaceId,
  discoverLinks,
}: InspectorPageProps) {
  const engineActions = getEngineActions({ isServerless });
  const [runningActionId, setRunningActionId] = useState<string | null>(null);
  const [results, setResults] = useState<ActionResult[]>([]);
  const [isLive, setIsLive] = useState(true);
  const liveSignals = useLiveSignals({ data, spaceId, isLive });

  const handleRunAction = async (action: EngineAction) => {
    setRunningActionId(action.id);
    const startedAt = new Date();
    const record = (ok: boolean, outcome: ActionOutcome) =>
      setResults((previous) => [
        {
          key: startedAt.getTime(),
          label: action.label,
          startedAt: startedAt.toISOString(),
          durationMs: Date.now() - startedAt.getTime(),
          ok,
          outcome,
        },
        ...previous,
      ]);

    try {
      record(true, await action.run(http));
      // A tick may have written signals; show them without waiting for the next read.
      liveSignals.refresh();
    } catch (error) {
      record(false, { view: 'raw', response: toErrorResponse(error) });
    } finally {
      setRunningActionId(null);
    }
  };

  return (
    <EuiPageTemplate data-test-subj="nightshiftDetectionInspector" restrictWidth={false}>
      <EuiPageTemplate.Header
        pageTitle="Detection engine inspector"
        rightSideItems={
          discoverLinks
            ? [
                <EuiButtonEmpty
                  key="signals"
                  iconType="discoverApp"
                  href={discoverLinks.getSignalsHref({ from: 'now-24h', to: 'now' })}
                  data-test-subj="nightshiftDetectionInspectorSignalsLink"
                >
                  Signals of the last 24 hours in Discover
                </EuiButtonEmpty>,
              ]
            : undefined
        }
      />
      <EuiPageTemplate.Section>
        <KbnInfoCallout
          size="s"
          title="Temporary page for the engine's developers. Ticks and reconciles run as this space's detection service account; the page is deleted before the engine ships on."
        />
        <EuiSpacer />
        <EuiFlexGroup gutterSize="s" wrap responsive={false}>
          {engineActions.map((action) => (
            <EuiFlexItem grow={false} key={action.id}>
              <EuiButton
                data-test-subj={`nightshiftDetectionInspectorAction-${action.id}`}
                isLoading={runningActionId === action.id}
                isDisabled={runningActionId !== null}
                onClick={() => handleRunAction(action)}
              >
                {action.label}
              </EuiButton>
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
        <EuiSpacer />
        <SignalsPanel
          live={liveSignals}
          isLive={isLive}
          onLiveChange={setIsLive}
          discoverLinks={discoverLinks}
        />
        <EuiSpacer />
        {results.length === 0 ? (
          <EuiText color="subdued" size="s">
            <p>Nothing run yet in this session.</p>
          </EuiText>
        ) : (
          results.map((result) => (
            <React.Fragment key={result.key}>
              <ResultCard result={result} getSignalsHref={discoverLinks?.getSignalsHref} />
              <EuiSpacer size="m" />
            </React.Fragment>
          ))
        )}
      </EuiPageTemplate.Section>
    </EuiPageTemplate>
  );
}
