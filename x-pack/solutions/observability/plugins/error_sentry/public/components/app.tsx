/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPageTemplate,
  EuiPanel,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { CoreStart, IHttpFetchError } from '@kbn/core/public';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';
import {
  ERROR_SENTRY_APP_TITLE,
  ERROR_SENTRY_CAPTURE_WORKFLOW_ID,
  ERROR_SENTRY_CASE_TAG,
} from '../../common/constants';

const WORKFLOWS_API_VERSION = '2023-10-31';
const CASE_OWNER = 'observability';

function errorMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'body' in err) {
    const body = (err as IHttpFetchError<{ message?: string }>).body;
    if (body && typeof body === 'object' && typeof body.message === 'string') {
      return body.message;
    }
  }
  return err instanceof Error ? err.message : String(err);
}

interface CaseRow {
  id: string;
  title: string;
  severity: string;
  status: string;
  version: string;
}

const severityColor = (s: string) =>
  s === 'critical' ? 'danger' : s === 'high' ? 'warning' : s === 'medium' ? 'primary' : 'hollow';

export const ErrorSentryApp = ({
  core,
  agentBuilder,
}: {
  core: CoreStart;
  agentBuilder?: AgentBuilderPluginStart;
}) => {
  const { http, notifications } = core;
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [patterns, setPatterns] = useState<CaseRow[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const found = await http.get<{ cases: CaseRow[] }>(`/api/cases/_find`, {
        query: {
          tags: ERROR_SENTRY_CASE_TAG,
          perPage: 100,
          sortField: 'createdAt',
          sortOrder: 'desc',
        },
      });
      setPatterns((found.cases ?? []).filter((c) => c.status !== 'closed'));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [http]);

  useEffect(() => {
    void load();
  }, [load]);

  const triggerWorkflow = useCallback(async () => {
    setRunning(true);
    try {
      await http.post(`/api/workflows/test`, {
        version: WORKFLOWS_API_VERSION,
        body: JSON.stringify({ workflowId: ERROR_SENTRY_CAPTURE_WORKFLOW_ID, inputs: {} }),
      });
      notifications.toasts.addSuccess(
        i18n.translate('errorSentry.app.runStarted', {
          defaultMessage: 'Capture workflow started. New patterns will appear here shortly.',
        })
      );
      window.setTimeout(() => void load(), 5000);
    } catch (err) {
      notifications.toasts.addDanger(
        i18n.translate('errorSentry.app.runFailed', {
          defaultMessage: 'Failed to start workflow: {error}',
          values: { error: errorMessage(err) },
        })
      );
    } finally {
      setRunning(false);
    }
  }, [http, notifications, load]);

  const addComment = useCallback(
    async (row: CaseRow, comment: string, successMsg: string) => {
      setBusyId(row.id);
      try {
        await http.post(`/api/cases/${encodeURIComponent(row.id)}/comments`, {
          body: JSON.stringify({ type: 'user', comment, owner: CASE_OWNER }),
        });
        notifications.toasts.addSuccess(successMsg);
      } catch (err) {
        notifications.toasts.addDanger(errorMessage(err));
      } finally {
        setBusyId(null);
      }
    },
    [http, notifications]
  );

  // Open the Agent Builder chat sidebar on a matching agent with an auto-sent prompt. Prefers an
  // agent matching `preferred`, falling back to the Code Researcher agent, then the default agent.
  const openAgentChat = useCallback(
    async (
      row: CaseRow,
      opts: { preferred: RegExp; prompt: string; fallbackComment: string; fallbackToast: string }
    ) => {
      if (!agentBuilder) {
        await addComment(row, opts.fallbackComment, opts.fallbackToast);
        return;
      }
      setBusyId(row.id);
      try {
        const agents = await agentBuilder.agents.list();
        const agent =
          agents.find((a) => opts.preferred.test(a.name)) ??
          agents.find((a) => /code\s*researcher/i.test(a.name));
        agentBuilder.openChat({
          newConversation: true,
          sessionTag: 'error-sentry',
          agentId: agent?.id,
          initialMessage: opts.prompt,
          autoSendInitialMessage: true,
        });
        if (!agent) {
          notifications.toasts.addWarning(
            i18n.translate('errorSentry.app.agentNotFound', {
              defaultMessage: 'No matching agent found — opened the chat with the default agent.',
            })
          );
        }
      } catch (err) {
        notifications.toasts.addDanger(errorMessage(err));
      } finally {
        setBusyId(null);
      }
    },
    [agentBuilder, addComment, notifications]
  );

  const investigate = useCallback(
    (row: CaseRow) => {
      const pattern = row.title.replace(/^\[Kibana Log\]\s*/, '');
      return openAgentChat(row, {
        preferred: /code\s*researcher/i,
        prompt: i18n.translate('errorSentry.app.investigatePrompt', {
          defaultMessage:
            'A recurring error pattern was detected in the Kibana logs and tracked in case {caseId}.\n\nPattern: "{pattern}"\n\nPlease investigate the likely root cause by analyzing the logs and the relevant code. Report your findings — do not change any code.',
          values: { caseId: row.id, pattern },
        }),
        fallbackComment:
          'Investigation requested via Error Sentry. (Agent Builder is not available in this deployment.)',
        fallbackToast: i18n.translate('errorSentry.app.investigateRequested', {
          defaultMessage: 'Investigation requested.',
        }),
      });
    },
    [openAgentChat]
  );

  const fix = useCallback(
    (row: CaseRow) => {
      const pattern = row.title.replace(/^\[Kibana Log\]\s*/, '');
      return openAgentChat(row, {
        preferred: /code\s*researcher|fix/i,
        prompt: i18n.translate('errorSentry.app.fixPrompt', {
          defaultMessage:
            'A recurring error pattern was detected in the Kibana logs and tracked in case {caseId}.\n\nPattern: "{pattern}"\n\nPlease research the code responsible for this error and propose a fix.',
          values: { caseId: row.id, pattern },
        }),
        fallbackComment:
          'Fix requested via Error Sentry. (Agent Builder is not available in this deployment.)',
        fallbackToast: i18n.translate('errorSentry.app.fixRequested', {
          defaultMessage: 'Fix requested.',
        }),
      });
    },
    [openAgentChat]
  );

  const close = useCallback(
    async (row: CaseRow) => {
      setBusyId(row.id);
      try {
        await http.patch(`/api/cases`, {
          body: JSON.stringify({
            cases: [{ id: row.id, version: row.version, status: 'closed' }],
          }),
        });
        notifications.toasts.addSuccess(
          i18n.translate('errorSentry.app.closed', { defaultMessage: 'Case closed.' })
        );
        setPatterns((prev) => prev.filter((c) => c.id !== row.id));
      } catch (err) {
        notifications.toasts.addDanger(errorMessage(err));
      } finally {
        setBusyId(null);
      }
    },
    [http, notifications]
  );

  return (
    <EuiPageTemplate restrictWidth>
      <EuiPageTemplate.Header
        pageTitle={<>{ERROR_SENTRY_APP_TITLE}</>}
        rightSideItems={[
          <EuiButton
            key="run"
            iconType="play"
            fill
            onClick={triggerWorkflow}
            isLoading={running}
            data-test-subj="errorSentryTriggerWorkflow"
          >
            <FormattedMessage
              id="errorSentry.app.triggerWorkflow"
              defaultMessage="Trigger workflow"
            />
          </EuiButton>,
        ]}
      />
      <EuiPageTemplate.Section>
        {error && (
          <>
            <EuiCallOut
              color="danger"
              title={i18n.translate('errorSentry.app.loadError', {
                defaultMessage: 'Could not load patterns',
              })}
            >
              <EuiText size="s">{error}</EuiText>
            </EuiCallOut>
            <EuiSpacer />
          </>
        )}

        {loading ? (
          <EuiFlexGroup justifyContent="center">
            <EuiFlexItem grow={false}>
              <EuiSpacer size="xl" />
              <EuiLoadingSpinner size="xl" />
            </EuiFlexItem>
          </EuiFlexGroup>
        ) : patterns.length === 0 ? (
          <EuiEmptyPrompt
            iconType="inspect"
            title={
              <h2>
                <FormattedMessage
                  id="errorSentry.app.noPatterns"
                  defaultMessage="No patterns found yet"
                />
              </h2>
            }
            body={
              <p>
                <FormattedMessage
                  id="errorSentry.app.noPatternsBody"
                  defaultMessage="Trigger the workflow to detect recurring error patterns and track them here."
                />
              </p>
            }
          />
        ) : (
          patterns.map((row) => (
            <React.Fragment key={row.id}>
              <EuiPanel hasShadow={false} hasBorder paddingSize="m">
                <EuiFlexGroup alignItems="center" gutterSize="m">
                  <EuiFlexItem grow={false}>
                    <EuiBadge color={severityColor(row.severity)}>{row.severity}</EuiBadge>
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiText size="s">
                      <strong>{row.title}</strong>
                    </EuiText>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiFlexGroup gutterSize="s" responsive={false}>
                      <EuiFlexItem grow={false}>
                        <EuiButtonEmpty
                          size="s"
                          iconType="search"
                          isDisabled={busyId === row.id}
                          onClick={() => investigate(row)}
                          data-test-subj="errorSentryInvestigate"
                        >
                          <FormattedMessage
                            id="errorSentry.app.investigate"
                            defaultMessage="Investigate"
                          />
                        </EuiButtonEmpty>
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiButtonEmpty
                          size="s"
                          iconType="wrench"
                          isDisabled={busyId === row.id}
                          onClick={() => fix(row)}
                          data-test-subj="errorSentryFix"
                        >
                          <FormattedMessage id="errorSentry.app.fix" defaultMessage="Fix" />
                        </EuiButtonEmpty>
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiButtonEmpty
                          size="s"
                          color="danger"
                          iconType="cross"
                          isLoading={busyId === row.id}
                          onClick={() => close(row)}
                          data-test-subj="errorSentryClose"
                        >
                          <FormattedMessage id="errorSentry.app.close" defaultMessage="Close" />
                        </EuiButtonEmpty>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiPanel>
              <EuiSpacer size="s" />
            </React.Fragment>
          ))
        )}
      </EuiPageTemplate.Section>
    </EuiPageTemplate>
  );
};
