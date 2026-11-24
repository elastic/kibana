/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiBadge,
  EuiButton,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPageTemplate,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import type { HttpStart } from '@kbn/core/public';
import { KbnInfoCallout } from '@kbn/ui-callout';
import { DETECTION_ENGINE_API_PATH } from '../../common/constants';

/** One engine route the inspector can call, with the body it sends. */
interface EngineAction {
  id: string;
  label: string;
  path: string;
  body?: Record<string, unknown>;
}

const ENGINE_ACTIONS: EngineAction[] = [
  {
    id: 'tick',
    label: 'Tick',
    path: `${DETECTION_ENGINE_API_PATH}/_tick`,
    body: { skip_backlog: false },
  },
  {
    id: 'tick_skip_backlog',
    label: 'Tick, skip backlog',
    path: `${DETECTION_ENGINE_API_PATH}/_tick`,
    body: { skip_backlog: true },
  },
  {
    id: 'reconcile',
    label: 'Reconcile rules',
    path: `${DETECTION_ENGINE_API_PATH}/_reconcile`,
  },
];

/** What one call returned, kept for the session so consecutive runs can be compared. */
interface ActionResult {
  key: number;
  label: string;
  startedAt: string;
  durationMs: number;
  ok: boolean;
  response: unknown;
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
}

/** The engine inspector: calls the engine's routes in the current space and shows what they return. */
export function InspectorPage({ http }: InspectorPageProps) {
  const [runningActionId, setRunningActionId] = useState<string | null>(null);
  const [results, setResults] = useState<ActionResult[]>([]);

  const handleRunAction = async (action: EngineAction) => {
    setRunningActionId(action.id);
    const startedAt = new Date();
    const record = (ok: boolean, response: unknown) =>
      setResults((previous) => [
        {
          key: startedAt.getTime(),
          label: action.label,
          startedAt: startedAt.toISOString(),
          durationMs: Date.now() - startedAt.getTime(),
          ok,
          response,
        },
        ...previous,
      ]);

    try {
      const response = await http.post(action.path, {
        body: action.body ? JSON.stringify(action.body) : undefined,
      });
      record(true, response);
    } catch (error) {
      record(false, toErrorResponse(error));
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
          title="Temporary page for the engine's developers. It runs as this space's detection service account and is deleted before the engine ships on."
        />
        <EuiSpacer />
        <EuiFlexGroup gutterSize="s" wrap responsive={false}>
          {ENGINE_ACTIONS.map((action) => (
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
              <EuiPanel hasBorder data-test-subj="nightshiftDetectionInspectorResult">
                <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                  <EuiFlexItem grow={false}>
                    <EuiTitle size="xs">
                      <h3>{result.label}</h3>
                    </EuiTitle>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiBadge color={result.ok ? 'success' : 'danger'}>
                      {result.ok ? 'ok' : 'error'}
                    </EuiBadge>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiText size="xs" color="subdued">
                      {result.startedAt} · {result.durationMs} ms
                    </EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>
                <EuiSpacer size="s" />
                <EuiCodeBlock language="json" fontSize="s" paddingSize="s" isCopyable>
                  {JSON.stringify(result.response, null, 2)}
                </EuiCodeBlock>
              </EuiPanel>
              <EuiSpacer size="m" />
            </React.Fragment>
          ))
        )}
      </EuiPageTemplate.Section>
    </EuiPageTemplate>
  );
}
