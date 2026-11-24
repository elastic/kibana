/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPageTemplate,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import type { HttpStart } from '@kbn/core/public';
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
}

/** The engine inspector: calls the engine's routes in the current space and shows what they return. */
export function InspectorPage({ http, isServerless }: InspectorPageProps) {
  const engineActions = getEngineActions({ isServerless });
  const [runningActionId, setRunningActionId] = useState<string | null>(null);
  const [results, setResults] = useState<ActionResult[]>([]);

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
    } catch (error) {
      record(false, { view: 'raw', response: toErrorResponse(error) });
    } finally {
      setRunningActionId(null);
    }
  };

  return (
    <EuiPageTemplate data-test-subj="nightshiftDetectionInspector" restrictWidth={false}>
      <EuiPageTemplate.Header pageTitle="Detection engine inspector" />
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
        {results.length === 0 ? (
          <EuiText color="subdued" size="s">
            <p>Nothing run yet in this session.</p>
          </EuiText>
        ) : (
          results.map((result) => (
            <React.Fragment key={result.key}>
              <ResultCard result={result} />
              <EuiSpacer size="m" />
            </React.Fragment>
          ))
        )}
      </EuiPageTemplate.Section>
    </EuiPageTemplate>
  );
}
