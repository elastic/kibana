/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  EuiPageHeader,
  EuiPageSection,
  EuiButton,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiCallOut,
  EuiText,
  EuiPanel,
  EuiIcon,
  EuiProgress,
} from '@elastic/eui';
import { css } from '@emotion/react';

const MONO_FONT = "'JetBrains Mono', 'SF Mono', 'Fira Code', monospace";
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import { useSequentApi } from '../api/use_sequent_api';
import { WorkflowDag } from './workflow_dag';
import { RunModal } from './run_modal';
import type { WorkflowVersion } from './run_modal';
import { ExecutionLog } from './execution_log';
import { ExecutionHistory } from './execution_history';
import type { HistoryEntry } from './execution_history';
import type { WorkflowStep, StepStatus } from './step_node';
import type { LogEntry } from './execution_log';

type ExecutionState = 'idle' | 'deploying' | 'running' | 'completed' | 'failed';

const POLL_INTERVAL_MS = 3000;
const HISTORY_STORAGE_KEY = 'sequentWorkflows.executionHistory';
const LAST_STEPS_STORAGE_KEY = 'sequentWorkflows.lastSteps';
const LAST_EXEC_STATE_KEY = 'sequentWorkflows.lastExecState';

const DEFAULT_STEPS: WorkflowStep[] = [
  {
    id: 'healthcheck',
    label: 'Healthcheck',
    description: 'GET /api/v1/healthcheck',
    status: 'pending',
  },
  {
    id: 'execute_sec_loadstar',
    label: 'sec-loadstar',
    description: 'POST /api/v1/execute/sec-loadstar',
    status: 'pending',
  },
  {
    id: 'poll_sec_loadstar',
    label: 'Poll sec-loadstar',
    description: 'Poll GET /api/v1/status/sec-loadstar until completed',
    status: 'pending',
  },
  {
    id: 'horde',
    label: 'horde',
    description: 'Child workflow: execute + poll horde',
    status: 'pending',
  },
  {
    id: 'sep_rally',
    label: 'sep-rally',
    description: 'Child workflow: execute + poll sep-rally',
    status: 'pending',
  },
  {
    id: 'await_children',
    label: 'Await Children',
    description: 'Wait for horde and sep-rally to complete',
    status: 'pending',
  },
  {
    id: 'success',
    label: 'Success',
    description: 'All steps completed successfully',
    status: 'pending',
  },
];

const loadLastSteps = (): WorkflowStep[] => {
  try {
    const raw = localStorage.getItem(LAST_STEPS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as WorkflowStep[];
      if (Array.isArray(parsed) && parsed.length === DEFAULT_STEPS.length) {
        return parsed;
      }
    }
  } catch {
    // noop
  }
  return DEFAULT_STEPS;
};

const saveLastSteps = (steps: WorkflowStep[]) => {
  try {
    localStorage.setItem(LAST_STEPS_STORAGE_KEY, JSON.stringify(steps));
  } catch {
    // noop
  }
};

const loadLastExecState = (): ExecutionState => {
  try {
    const raw = localStorage.getItem(LAST_EXEC_STATE_KEY);
    if (raw === 'completed' || raw === 'failed') return raw;
  } catch {
    // noop
  }
  return 'idle';
};

const saveLastExecState = (state: ExecutionState) => {
  try {
    localStorage.setItem(LAST_EXEC_STATE_KEY, state);
  } catch {
    // noop
  }
};

const now = () => new Date().toLocaleTimeString();

const STEP_ID_MAP: Record<string, string> = {
  healthcheck: 'healthcheck',
  execute_sec_loadstar: 'execute_sec_loadstar',
  poll_sec_loadstar: 'poll_sec_loadstar',
  check_sec_loadstar: 'poll_sec_loadstar',
  wait_poll: 'poll_sec_loadstar',
  wait_sec_loadstar: 'poll_sec_loadstar',
  run_horde: 'horde',
  run_sep_rally: 'sep_rally',
  await_children: 'await_children',
  check_horde_status: '_skip_',
  check_sep_rally_status: '_skip_',
  wait_children_poll: '_skip_',
  success: 'success',
};

const CHILD_STEP_ID_MAP: Record<string, string> = {
  execute_horde: 'execute_horde',
  poll_horde: 'poll_horde',
  check_horde: 'poll_horde',
  wait_horde: 'poll_horde',
  execute_sep_rally: 'execute_sep_rally',
  poll_sep_rally: 'poll_sep_rally',
  check_sep_rally: 'poll_sep_rally',
  wait_sep_rally: 'poll_sep_rally',
  wait_poll: '_skip_',
};

const DAG_STEP_LABELS: Record<string, string> = Object.fromEntries(
  DEFAULT_STEPS.map((s) => [s.id, s.label])
);

const CHILD_STEP_LABELS: Record<string, string> = {
  execute_horde: 'horde / execute',
  poll_horde: 'horde / poll',
  execute_sep_rally: 'sep-rally / execute',
  poll_sep_rally: 'sep-rally / poll',
};

const LOG_HIDDEN_STEPS = new Set(['poll_sec_loadstar', 'poll_horde', 'poll_sep_rally']);

const mapExecutionStatus = (status: string): StepStatus => {
  switch (status) {
    case 'completed':
    case 'skipped':
      return 'completed';
    case 'running':
    case 'waiting':
    case 'waiting_for_input':
    case 'waiting_for_child':
      return 'running';
    case 'failed':
    case 'cancelled':
    case 'timed_out':
      return 'failed';
    case 'pending':
    default:
      return 'pending';
  }
};

const loadHistory = (): HistoryEntry[] => {
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const saveHistory = (entries: HistoryEntry[]) => {
  try {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(entries.slice(0, 50)));
  } catch {
    // noop
  }
};

export const WorkflowPage: React.FC = () => {
  const api = useSequentApi();
  const { services } = useKibana<CoreStart>();
  const basePath = services.http.basePath.get();

  const [showModal, setShowModal] = useState(false);
  const [executionState, setExecutionState] = useState<ExecutionState>(loadLastExecState);
  const [steps, setSteps] = useState<WorkflowStep[]>(loadLastSteps);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [deployError, setDeployError] = useState<string | undefined>();
  const [executionId, setExecutionId] = useState<string | undefined>();
  const [mainWorkflowId, setMainWorkflowId] = useState<string | undefined>();
  const [currentRunId, setCurrentRunId] = useState<string | undefined>();
  const [history, setHistory] = useState<HistoryEntry[]>(loadHistory);
  const [showLog, setShowLog] = useState(false);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const loggedStepStatusRef = useRef<Record<string, StepStatus>>({});
  const childWorkflowIdsRef = useRef<Record<string, string>>({});
  const loggedChildStepStatusRef = useRef<Record<string, StepStatus>>({});

  const addLog = useCallback((message: string, level: LogEntry['level'] = 'info') => {
    setLogs((prev) => [...prev, { timestamp: now(), message, level }]);
  }, []);

  const updateStep = useCallback((id: string, patch: Partial<WorkflowStep>) => {
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }, []);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  const updateHistoryEntry = useCallback(
    (runId: string, patch: Partial<HistoryEntry>) => {
      setHistory((prev) => {
        const updated = prev.map((h) => (h.runId === runId ? { ...h, ...patch } : h));
        saveHistory(updated);
        return updated;
      });
    },
    []
  );

  const pollChildWorkflows = useCallback(async (): Promise<LogEntry[]> => {
    const newLogs: LogEntry[] = [];
    const childIds = childWorkflowIdsRef.current;

    for (const [childName, childWorkflowId] of Object.entries(childIds)) {
      try {
        const childResult = await api.getExecutionStatus(childWorkflowId);
        const childStepsPayload = childResult.steps;
        const childStepResults: any[] =
          childStepsPayload?.results ??
          (childStepsPayload as any)?.data ??
          [];

        const childLatest: Record<string, string> = {};
        for (const stepExec of childStepResults) {
          const childStepId = CHILD_STEP_ID_MAP[stepExec.stepId];
          if (!childStepId || childStepId === '_skip_') continue;

          const existing = childLatest[childStepId];
          const isTerminal =
            existing === 'completed' || existing === 'failed' ||
            existing === 'cancelled' || existing === 'timed_out';
          if (isTerminal) continue;

          childLatest[childStepId] = stepExec.status;
        }

        for (const [childStepId, rawStatus] of Object.entries(childLatest)) {
          const mapped = mapExecutionStatus(rawStatus);
          const prevChild = loggedChildStepStatusRef.current[childStepId];
          if (prevChild === mapped) continue;
          loggedChildStepStatusRef.current[childStepId] = mapped;

          if (LOG_HIDDEN_STEPS.has(childStepId)) continue;

          const label = CHILD_STEP_LABELS[childStepId] ?? `${childName} / ${childStepId}`;

          if (mapped === 'completed' && prevChild !== 'completed') {
            newLogs.push({ timestamp: now(), message: `${label} — completed`, level: 'success' });
          } else if (mapped === 'running' && prevChild !== 'running') {
            newLogs.push({ timestamp: now(), message: `${label} — running`, level: 'info' });
          } else if (mapped === 'failed') {
            newLogs.push({ timestamp: now(), message: `${label} — failed`, level: 'error' });
          }
        }
      } catch {
        // child workflow may not have started yet
      }
    }

    return newLogs;
  }, [api]);

  const doPoll = useCallback(
    async (workflowId: string, runId: string): Promise<boolean> => {
      const result = await api.getExecutionStatus(workflowId);

      const executions = result.executions ?? {};
      const stepsPayload = result.steps;
      const stepResults: any[] =
        (executions as any).stepRuns ??
        stepsPayload?.results ??
        (stepsPayload as any)?.data ??
        [];
      const execResults: any[] =
        (executions as any).results ?? (executions as any).data ?? [];

      if (stepResults.length > 0) {
        const latestByDagId: Record<string, string> = {};
        for (const stepExec of stepResults) {
          const dagStepId = STEP_ID_MAP[stepExec.stepId];
          if (!dagStepId || dagStepId === '_skip_') continue;

          const existing = latestByDagId[dagStepId];
          const isTerminal =
            existing === 'completed' || existing === 'failed' ||
            existing === 'cancelled' || existing === 'timed_out';
          if (isTerminal) continue;

          latestByDagId[dagStepId] = stepExec.status;
        }

        const newLogs: LogEntry[] = [];
        const dagOrder = DEFAULT_STEPS.map((s) => s.id);
        for (const dagStepId of dagOrder) {
          const rawStatus = latestByDagId[dagStepId];
          if (!rawStatus) continue;
          const mapped = mapExecutionStatus(rawStatus);
          updateStep(dagStepId, { status: mapped });

          const prev = loggedStepStatusRef.current[dagStepId];
          if (prev === mapped) continue;
          loggedStepStatusRef.current[dagStepId] = mapped;

          if (LOG_HIDDEN_STEPS.has(dagStepId)) continue;

          const label = DAG_STEP_LABELS[dagStepId] ?? dagStepId;

          if (mapped === 'completed' && prev !== 'completed') {
            newLogs.push({ timestamp: now(), message: `${label} — completed`, level: 'success' });
          } else if (mapped === 'running' && prev !== 'running') {
            newLogs.push({ timestamp: now(), message: `${label} — running`, level: 'info' });
          } else if (mapped === 'failed') {
            newLogs.push({ timestamp: now(), message: `${label} — failed`, level: 'error' });
          }
        }

        const childLogs = await pollChildWorkflows();
        newLogs.push(...childLogs);

        if (newLogs.length > 0) {
          setLogs((prev) => [...prev, ...newLogs]);
        }
      }

      const latestExecution = execResults[0];
      if (!latestExecution) return false;

      const overallStatus = latestExecution.status;
      const mainDone =
        overallStatus === 'completed' ||
        overallStatus === 'failed' ||
        overallStatus === 'cancelled' ||
        overallStatus === 'timed_out';

      if (!mainDone) return false;

      const childEntries = Object.entries(childWorkflowIdsRef.current);
      let allChildrenDone = true;
      let anyChildFailed = false;

      const childStatusLogs: LogEntry[] = [];
      for (const [childWfId] of childEntries) {
        const dagId = childWfId.includes('horde')
          ? 'horde'
          : childWfId.includes('sep-rally')
          ? 'sep_rally'
          : undefined;
        try {
          const childRes = await api.getExecutionStatus(childWfId);
          const childExecResults: any[] =
            (childRes.executions as any)?.results ??
            (childRes.executions as any)?.data ??
            [];
          const childExec = childExecResults[0];
          if (!childExec) {
            allChildrenDone = false;
            continue;
          }
          const cs = childExec.status;
          const mapped = mapExecutionStatus(cs);
          if (dagId) {
            updateStep(dagId, { status: mapped });
            const prev = loggedStepStatusRef.current[dagId];
            if (prev !== mapped) {
              loggedStepStatusRef.current[dagId] = mapped;
              const label = DAG_STEP_LABELS[dagId] ?? dagId;
              if (mapped === 'completed' && prev !== 'completed') {
                childStatusLogs.push({ timestamp: now(), message: `${label} — completed`, level: 'success' });
              } else if (mapped === 'failed') {
                childStatusLogs.push({ timestamp: now(), message: `${label} — failed`, level: 'error' });
              }
            }
          }
          if (cs === 'failed' || cs === 'cancelled' || cs === 'timed_out') {
            anyChildFailed = true;
          } else if (cs !== 'completed') {
            allChildrenDone = false;
          }
        } catch {
          allChildrenDone = false;
        }
      }

      const childStepLogs = await pollChildWorkflows();
      const allChildLogs = [...childStatusLogs, ...childStepLogs];
      if (allChildLogs.length > 0) {
        setLogs((prev) => [...prev, ...allChildLogs]);
      }

      if (!allChildrenDone) {
        return false;
      }

      if (overallStatus === 'completed' && !anyChildFailed) {
        updateStep('success', { status: 'completed' });
        setExecutionState('completed');
        saveLastExecState('completed');
        updateHistoryEntry(runId, {
          status: 'completed',
          finishedAt: latestExecution.finishedAt ?? new Date().toISOString(),
        });
        addLog('All steps completed successfully', 'success');
        setSteps((current) => {
          saveLastSteps(current);
          return current;
        });
        return true;
      }

      const failReason = anyChildFailed ? 'child workflow failed' : overallStatus;
      updateStep('success', { status: 'failed' });
      setExecutionState('failed');
      saveLastExecState('failed');
      updateHistoryEntry(runId, {
        status: 'failed',
        finishedAt: latestExecution.finishedAt ?? new Date().toISOString(),
      });
      addLog(`Workflow execution ${failReason}`, 'error');
      setSteps((current) => {
        saveLastSteps(current);
        return current;
      });
      return true;
    },
    [api, addLog, updateStep, updateHistoryEntry, pollChildWorkflows]
  );

  const startPolling = useCallback(
    (workflowId: string, runId: string) => {
      doPoll(workflowId, runId).catch((err) => {
        addLog(`Poll error: ${String(err)}`, 'error');
      });

      pollRef.current = setInterval(async () => {
        try {
          const done = await doPoll(workflowId, runId);
          if (done) {
            stopPolling();
          }
        } catch (err) {
          addLog(`Failed to poll execution status: ${String(err)}`, 'error');
        }
      }, POLL_INTERVAL_MS);
    },
    [doPoll, addLog, stopPolling]
  );

  const handleRun = useCallback(
    async (baseUrl: string, version: WorkflowVersion = 'v2') => {
      setDeployError(undefined);
      setExecutionState('deploying');
      setSteps(DEFAULT_STEPS);
      setLogs([]);
      setShowLog(true);
      loggedStepStatusRef.current = {};
      loggedChildStepStatusRef.current = {};
      childWorkflowIdsRef.current = {};
      addLog(`Creating and running workflow (${version}) with base_url: ${baseUrl}`, 'success');

      try {
        const result =
          version === 'v2'
            ? await api.runWorkflowV2(baseUrl)
            : await api.runWorkflow(baseUrl);
        setExecutionId(result.execution_id);
        setMainWorkflowId(result.main_workflow_id);
        setCurrentRunId(result.run_id);
        setShowModal(false);

        const execId = result.execution_id;
        updateStep('healthcheck', { workflowId: result.main_workflow_id, executionId: execId });
        updateStep('execute_sec_loadstar', { workflowId: result.main_workflow_id, executionId: execId });
        updateStep('poll_sec_loadstar', { workflowId: result.main_workflow_id, executionId: execId });
        updateStep('success', { workflowId: result.main_workflow_id, executionId: execId });

        const childHordeId = Object.keys(result.workflow_ids).find((k) => k.includes('horde'));
        const childSepId = Object.keys(result.workflow_ids).find((k) => k.includes('sep-rally'));
        if (childHordeId) updateStep('horde', { workflowId: childHordeId, executionId: execId });
        if (childSepId) updateStep('sep_rally', { workflowId: childSepId, executionId: execId });

        const childIds: Record<string, string> = {};
        if (childHordeId) childIds[childHordeId] = childHordeId;
        if (childSepId) childIds[childSepId] = childSepId;
        childWorkflowIdsRef.current = childIds;

        const newEntry: HistoryEntry = {
          runId: result.run_id,
          mainWorkflowId: result.main_workflow_id,
          executionId: result.execution_id,
          status: 'running',
          startedAt: new Date().toISOString(),
          workflowIds: result.workflow_ids,
          baseUrl,
        };
        setHistory((prev) => {
          const updated = [newEntry, ...prev];
          saveHistory(updated);
          return updated;
        });

        addLog(`Workflow created — execution: ${result.execution_id}`, 'success');
        addLog(`Main workflow: ${result.main_workflow_id}`, 'success');

        setExecutionState('running');
        addLog('Polling execution status...', 'info');
        startPolling(result.main_workflow_id, result.run_id);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setDeployError(message);
        setExecutionState('failed');
        addLog(`Deploy failed: ${message}`, 'error');
      }
    },
    [api, addLog, updateStep, startPolling]
  );

  const handleReset = useCallback(() => {
    stopPolling();
    setExecutionState('idle');
    setSteps(DEFAULT_STEPS);
    setLogs([]);
    loggedStepStatusRef.current = {};
    loggedChildStepStatusRef.current = {};
    childWorkflowIdsRef.current = {};
    setDeployError(undefined);
    setExecutionId(undefined);
    setMainWorkflowId(undefined);
    setCurrentRunId(undefined);
    setShowLog(false);
    saveLastSteps(DEFAULT_STEPS);
    saveLastExecState('idle');
  }, [stopPolling]);

  const isRunning = executionState === 'deploying' || executionState === 'running';
  const completedCount = steps.filter((s) => s.status === 'completed').length;
  const progressPercent = (completedCount / steps.length) * 100;

  return (
    <>
      <EuiPageSection>
        <EuiPageHeader
          pageTitle={
            <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiIcon type="pipelineApp" size="xl" color="primary" />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>Sequent Workflows</EuiFlexItem>
            </EuiFlexGroup>
          }
          description="Create and run Kibana workflows that orchestrate your workflow-runner service. Each step executes HTTP calls against the runner and reports status in real-time."
          bottomBorder
          paddingSize="none"
          rightSideItems={[
            executionState !== 'idle' ? (
              <EuiButton
                color="text"
                iconType="refresh"
                onClick={handleReset}
                disabled={executionState === 'deploying'}
                size="s"
              >
                Reset
              </EuiButton>
            ) : (
              <span />
            ),
            <EuiButton
              fill
              iconType="playFilled"
              onClick={() => setShowModal(true)}
              isLoading={executionState === 'deploying'}
              disabled={isRunning}
              color="primary"
            >
              Run Workflow
            </EuiButton>,
          ]}
        />

        <EuiSpacer size="l" />
        {/* Progress bar during execution */}
        {isRunning && (
          <>
            <EuiProgress
              value={progressPercent}
              max={100}
              size="s"
              color={executionState === 'deploying' ? 'primary' : 'success'}
              css={css`
                border-radius: 4px;
              `}
            />
            <EuiSpacer size="m" />
          </>
        )}

        {/* Execution status bar */}
        {executionId && (
          <>
            <EuiPanel
              hasBorder
              paddingSize="m"
              css={css`
                border-radius: 10px;
                border-color: #222c39;
                background: #11171f;
              `}
            >
              <EuiFlexGroup
                gutterSize="l"
                alignItems="center"
                responsive={false}
                wrap
              >
                <EuiFlexItem grow={false}>
                  <div>
                    <EuiText
                      size="xs"
                      css={css`
                        font-family: ${MONO_FONT};
                        font-size: 10px;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                        color: #5c6878;
                      `}
                    >
                      Status
                    </EuiText>
                    <EuiText
                      size="s"
                      css={css`
                        font-family: ${MONO_FONT};
                        font-weight: 600;
                        color: ${executionState === 'completed'
                          ? '#3fd97a'
                          : executionState === 'failed'
                          ? '#ff5d62'
                          : '#ffb13b'};
                      `}
                    >
                      {executionState === 'completed'
                        ? '● Completed'
                        : executionState === 'failed'
                        ? '✕ Failed'
                        : executionState === 'deploying'
                        ? '◌ Deploying'
                        : '● Running'}
                    </EuiText>
                  </div>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <div>
                    <EuiText
                      size="xs"
                      css={css`
                        font-family: ${MONO_FONT};
                        font-size: 10px;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                        color: #5c6878;
                      `}
                    >
                      Steps
                    </EuiText>
                    <EuiText
                      size="s"
                      css={css`
                        font-family: ${MONO_FONT};
                        font-weight: 600;
                        color: #e7eef6;
                      `}
                    >
                      {completedCount} / {steps.length}
                    </EuiText>
                  </div>
                </EuiFlexItem>
                {mainWorkflowId && (
                  <EuiFlexItem grow={false}>
                    <div>
                      <EuiText
                        size="xs"
                        css={css`
                          font-family: ${MONO_FONT};
                          font-size: 10px;
                          text-transform: uppercase;
                          letter-spacing: 0.5px;
                          color: #5c6878;
                        `}
                      >
                        Workflow
                      </EuiText>
                      <EuiText
                        size="xs"
                        css={css`
                          font-family: ${MONO_FONT};
                          font-size: 12px;
                          color: #2ee6c4;
                        `}
                      >
                        {mainWorkflowId}
                      </EuiText>
                    </div>
                  </EuiFlexItem>
                )}
              </EuiFlexGroup>
            </EuiPanel>
            <EuiSpacer size="m" />
          </>
        )}

        {/* Workflow DAG */}
        <WorkflowDag steps={steps} executionState={executionState} basePath={basePath} />

        <EuiSpacer size="l" />

        {/* Execution log (collapsible terminal) */}
        {logs.length > 0 && (
          <>
            <EuiPanel
              hasBorder
              paddingSize="none"
              css={css`
                border-radius: 10px;
                border-color: #222c39;
                background: #0a0e13;
                overflow: hidden;
              `}
            >
              <EuiFlexGroup
                alignItems="center"
                gutterSize="s"
                responsive={false}
                onClick={() => setShowLog(!showLog)}
                css={css`
                  cursor: pointer;
                  user-select: none;
                  padding: 10px 14px;
                  background: #11171f;
                  border-bottom: ${showLog ? '1px solid #222c39' : 'none'};
                `}
              >
                <EuiFlexItem grow={false}>
                  <EuiIcon
                    type={showLog ? 'arrowDown' : 'arrowRight'}
                    size="s"
                    color="#5c6878"
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiIcon type="console" color="#2ee6c4" size="s" />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiText
                    size="s"
                    css={css`
                      font-family: ${MONO_FONT};
                      font-weight: 600;
                      color: #e7eef6;
                      font-size: 13px;
                    `}
                  >
                    Execution Log
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <span
                    css={css`
                      font-family: ${MONO_FONT};
                      font-size: 10px;
                      background: #1c2531;
                      padding: 2px 8px;
                      border-radius: 10px;
                      color: #5c6878;
                      border: 1px solid #222c39;
                    `}
                  >
                    {logs.length}
                  </span>
                </EuiFlexItem>
              </EuiFlexGroup>
              {showLog && (
                <div
                  css={css`
                    padding: 0;
                  `}
                >
                  <ExecutionLog logs={logs} />
                </div>
              )}
            </EuiPanel>
            <EuiSpacer size="l" />
          </>
        )}

        {/* Deploy error callout */}
        {executionState === 'failed' && deployError && (
          <>
            <EuiCallOut
              title="Workflow deploy failed"
              color="danger"
              iconType="error"
            >
              <p>{deployError}</p>
            </EuiCallOut>
            <EuiSpacer size="l" />
          </>
        )}

        <div
          css={css`
            height: 1px;
            background: linear-gradient(90deg, transparent, #222c39, transparent);
            margin: 8px 0;
          `}
        />

        {/* Execution history table */}
        <ExecutionHistory history={history} activeRunId={currentRunId} basePath={basePath} />
      </EuiPageSection>

      {showModal && (
        <RunModal
          onClose={() => {
            setShowModal(false);
            if (executionState === 'deploying') {
              setExecutionState('idle');
            }
          }}
          onConfirm={handleRun}
          isLoading={executionState === 'deploying'}
          error={deployError}
        />
      )}
    </>
  );
};
