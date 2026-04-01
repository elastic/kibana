/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExecutionStatus } from '@kbn/workflows';

import type { AggregatedWorkflowExecution } from '../../../../types';
import type { BuildDiagnosticReportParams } from '.';
import { buildDiagnosticReport } from '.';

const makeAggregatedExecution = (
  overrides: Partial<AggregatedWorkflowExecution> = {}
): AggregatedWorkflowExecution => ({
  status: ExecutionStatus.FAILED,
  steps: [],
  workflowExecutions: null,
  ...overrides,
});

const makeStep = (overrides: Partial<AggregatedWorkflowExecution['steps'][0]> = {}) => ({
  executionTimeMs: 500,
  finishedAt: '2024-01-01T00:00:01Z',
  globalExecutionIndex: 0,
  id: 'step-exec-1',
  isTestRun: false,
  pipelinePhase: 'generate_discoveries',
  scopeStack: [],
  startedAt: '2024-01-01T00:00:00Z',
  status: ExecutionStatus.COMPLETED,
  stepExecutionIndex: 0,
  stepId: 'step-1',
  stepType: 'ai.prompt',
  topologicalIndex: 0,
  workflowId: 'wf-gen-1',
  workflowName: 'Generation Workflow',
  workflowRunId: 'run-gen-1',
  ...overrides,
});

const defaultParams: BuildDiagnosticReportParams = {
  aggregatedExecution: makeAggregatedExecution(),
};

describe('buildDiagnosticReport', () => {
  describe('report structure', () => {
    it('always includes the report title', () => {
      const report = buildDiagnosticReport(defaultParams);

      expect(report).toContain('# Attack Discovery Diagnostic Report');
    });

    it('always includes the execution summary section', () => {
      const report = buildDiagnosticReport(defaultParams);

      expect(report).toContain('## Execution Summary');
    });

    it('includes the overall status in the execution summary', () => {
      const report = buildDiagnosticReport({
        ...defaultParams,
        aggregatedExecution: makeAggregatedExecution({ status: ExecutionStatus.FAILED }),
      });

      expect(report).toContain('failed');
    });
  });

  describe('environment section', () => {
    it('omits the environment section when environmentContext is undefined', () => {
      const report = buildDiagnosticReport(defaultParams);

      expect(report).not.toContain('## Environment');
    });

    it('includes the environment section when environmentContext is provided', () => {
      const report = buildDiagnosticReport({
        ...defaultParams,
        environmentContext: { kibanaVersion: '8.14.0', spaceId: 'default' },
      });

      expect(report).toContain('## Environment');
    });

    it('includes kibana version when provided', () => {
      const report = buildDiagnosticReport({
        ...defaultParams,
        environmentContext: { kibanaVersion: '8.14.0' },
      });

      expect(report).toContain('8.14.0');
    });

    it('includes space ID when provided', () => {
      const report = buildDiagnosticReport({
        ...defaultParams,
        environmentContext: { spaceId: 'my-space' },
      });

      expect(report).toContain('my-space');
    });

    it('omits the environment section when all fields are undefined', () => {
      const report = buildDiagnosticReport({
        ...defaultParams,
        environmentContext: {},
      });

      expect(report).not.toContain('## Environment');
    });
  });

  describe('execution summary section', () => {
    it('includes connectorName when provided', () => {
      const report = buildDiagnosticReport({
        ...defaultParams,
        connectorName: 'My GPT Connector',
      });

      expect(report).toContain('My GPT Connector');
    });

    it('includes executionUuid when provided', () => {
      const report = buildDiagnosticReport({
        ...defaultParams,
        executionUuid: 'uuid-abc-123',
      });

      expect(report).toContain('uuid-abc-123');
    });

    it('includes generationStatus when provided', () => {
      const report = buildDiagnosticReport({
        ...defaultParams,
        generationStatus: 'failed',
      });

      expect(report).toContain('Generation Status');
    });

    it('includes alertsContextCount when provided', () => {
      const report = buildDiagnosticReport({
        ...defaultParams,
        alertsContextCount: 42,
      });

      expect(report).toContain('42');
    });

    it('includes discoveriesCount when provided', () => {
      const report = buildDiagnosticReport({
        ...defaultParams,
        discoveriesCount: 7,
      });

      expect(report).toContain('7');
    });

    it('includes error category from failureClassification when provided', () => {
      const report = buildDiagnosticReport({
        ...defaultParams,
        failureClassification: {
          actions: [],
          category: 'connector_error',
          summary: 'A connector error occurred.',
        },
      });

      expect(report).toContain('connector_error');
    });

    it('omits connector when not provided', () => {
      const report = buildDiagnosticReport(defaultParams);

      expect(report).not.toContain('Connector |');
    });

    it('omits alertsContextCount when null', () => {
      const report = buildDiagnosticReport({
        ...defaultParams,
        alertsContextCount: null,
      });

      expect(report).not.toContain('Alerts Context Count');
    });

    it('omits discoveriesCount when null', () => {
      const report = buildDiagnosticReport({
        ...defaultParams,
        discoveriesCount: null,
      });

      expect(report).not.toContain('Discoveries Count');
    });
  });

  describe('failure details section', () => {
    it('omits the failure details section when failureReason and failureClassification are absent', () => {
      const report = buildDiagnosticReport(defaultParams);

      expect(report).not.toContain('## Failure Details');
    });

    it('includes the failure details section when failureReason is provided', () => {
      const report = buildDiagnosticReport({
        ...defaultParams,
        failureReason: 'connector error: timeout',
      });

      expect(report).toContain('## Failure Details');
      expect(report).toContain('connector error: timeout');
    });

    it('includes the failure classification summary', () => {
      const report = buildDiagnosticReport({
        ...defaultParams,
        failureClassification: {
          actions: [],
          category: 'timeout',
          summary: 'The workflow timed out before completing.',
        },
      });

      expect(report).toContain('The workflow timed out before completing.');
    });

    it('includes the failure category in failure details', () => {
      const report = buildDiagnosticReport({
        ...defaultParams,
        failureClassification: {
          actions: [],
          category: 'timeout',
          summary: 'The workflow timed out.',
        },
      });

      expect(report).toContain('`timeout`');
    });
  });

  describe('pipeline timeline section', () => {
    it('omits the pipeline timeline section when steps array is empty', () => {
      const report = buildDiagnosticReport(defaultParams);

      expect(report).not.toContain('## Pipeline Timeline');
    });

    it('includes the pipeline timeline section when steps are present', () => {
      const report = buildDiagnosticReport({
        ...defaultParams,
        aggregatedExecution: makeAggregatedExecution({ steps: [makeStep()] }),
      });

      expect(report).toContain('## Pipeline Timeline');
    });

    it('groups steps by workflowRunId and shows one row per group', () => {
      const steps = [
        makeStep({ workflowRunId: 'run-1', stepId: 'a' }),
        makeStep({ workflowRunId: 'run-1', stepId: 'b' }),
        makeStep({ workflowRunId: 'run-2', stepId: 'c' }),
      ];

      const report = buildDiagnosticReport({
        ...defaultParams,
        aggregatedExecution: makeAggregatedExecution({ steps }),
      });

      // Isolate only the Pipeline Timeline section
      const afterTimeline = report.split('## Pipeline Timeline')[1];
      const timelineSection = afterTimeline.split('##')[0];
      const tableRows = timelineSection
        .split('\n')
        .filter(
          (line) => line.startsWith('|') && !line.startsWith('| Phase') && !line.startsWith('|---')
        );

      expect(tableRows).toHaveLength(2);
    });

    it('shows the pipeline phase in the timeline', () => {
      const report = buildDiagnosticReport({
        ...defaultParams,
        aggregatedExecution: makeAggregatedExecution({
          steps: [makeStep({ pipelinePhase: 'retrieve_alerts' })],
        }),
      });

      expect(report).toContain('retrieve_alerts');
    });

    it('shows the workflow ID in the timeline', () => {
      const report = buildDiagnosticReport({
        ...defaultParams,
        aggregatedExecution: makeAggregatedExecution({
          steps: [makeStep({ workflowId: 'wf-abc' })],
        }),
      });

      expect(report).toContain('wf-abc');
    });

    it('shows the error category for failed phases', () => {
      const report = buildDiagnosticReport({
        ...defaultParams,
        aggregatedExecution: makeAggregatedExecution({
          steps: [
            makeStep({
              error: { message: 'connector error: invalid API key', type: 'ConnectorError' },
              status: ExecutionStatus.FAILED,
            }),
          ],
        }),
      });

      expect(report).toContain('connector_error');
    });

    it('sums duration across steps in the same group', () => {
      const steps = [
        makeStep({ executionTimeMs: 300, stepId: 'a', workflowRunId: 'run-1' }),
        makeStep({ executionTimeMs: 400, stepId: 'b', workflowRunId: 'run-1' }),
      ];

      const report = buildDiagnosticReport({
        ...defaultParams,
        aggregatedExecution: makeAggregatedExecution({ steps }),
      });

      expect(report).toContain('700 ms');
    });
  });

  describe('step execution details section', () => {
    it('omits the step execution details section when steps array is empty', () => {
      const report = buildDiagnosticReport(defaultParams);

      expect(report).not.toContain('## Step Execution Details');
    });

    it('includes the step execution details section when steps are present', () => {
      const report = buildDiagnosticReport({
        ...defaultParams,
        aggregatedExecution: makeAggregatedExecution({ steps: [makeStep()] }),
      });

      expect(report).toContain('## Step Execution Details');
    });

    it('shows step ID, type, and status for each step', () => {
      const report = buildDiagnosticReport({
        ...defaultParams,
        aggregatedExecution: makeAggregatedExecution({
          steps: [
            makeStep({
              stepId: 'my-step',
              stepType: 'ai.prompt',
              status: ExecutionStatus.COMPLETED,
            }),
          ],
        }),
      });

      expect(report).toContain('my-step');
      expect(report).toContain('ai.prompt');
      expect(report).toContain('completed');
    });

    it('shows workflowName when available, otherwise workflowId', () => {
      const withName = buildDiagnosticReport({
        ...defaultParams,
        aggregatedExecution: makeAggregatedExecution({
          steps: [makeStep({ workflowId: 'wf-1', workflowName: 'My Workflow' })],
        }),
      });

      const withoutName = buildDiagnosticReport({
        ...defaultParams,
        aggregatedExecution: makeAggregatedExecution({
          steps: [makeStep({ workflowId: 'wf-1', workflowName: undefined })],
        }),
      });

      expect(withName).toContain('My Workflow');
      expect(withoutName).toContain('wf-1');
    });

    it('shows error message when step has an error', () => {
      const report = buildDiagnosticReport({
        ...defaultParams,
        aggregatedExecution: makeAggregatedExecution({
          steps: [
            makeStep({
              error: { message: 'step failed with timeout', type: 'TimeoutError' },
              status: ExecutionStatus.FAILED,
            }),
          ],
        }),
      });

      expect(report).toContain('step failed with timeout');
    });
  });

  describe('error details section', () => {
    it('omits the error details section when no steps have errors', () => {
      const report = buildDiagnosticReport({
        ...defaultParams,
        aggregatedExecution: makeAggregatedExecution({ steps: [makeStep()] }),
      });

      expect(report).not.toContain('## Error Details');
    });

    it('includes the error details section when a step has an error', () => {
      const report = buildDiagnosticReport({
        ...defaultParams,
        aggregatedExecution: makeAggregatedExecution({
          steps: [
            makeStep({
              error: { message: 'connector error: invalid key', type: 'ConnectorError' },
              status: ExecutionStatus.FAILED,
            }),
          ],
        }),
      });

      expect(report).toContain('## Error Details');
      expect(report).toContain('ConnectorError');
      expect(report).toContain('connector error: invalid key');
    });

    it('includes error details as a JSON block when details are present', () => {
      const report = buildDiagnosticReport({
        ...defaultParams,
        aggregatedExecution: makeAggregatedExecution({
          steps: [
            makeStep({
              error: {
                details: { code: 429, retryAfter: 60 },
                message: 'rate limit exceeded',
                type: 'RateLimitError',
              },
              status: ExecutionStatus.FAILED,
            }),
          ],
        }),
      });

      expect(report).toContain('```json');
      expect(report).toContain('"code": 429');
    });

    it('does not include a JSON block when error has no details', () => {
      const report = buildDiagnosticReport({
        ...defaultParams,
        aggregatedExecution: makeAggregatedExecution({
          steps: [
            makeStep({
              error: { message: 'something failed', type: 'GenericError' },
              status: ExecutionStatus.FAILED,
            }),
          ],
        }),
      });

      expect(report).not.toContain('```json');
    });
  });

  describe('configured workflows section', () => {
    it('omits the configured workflows section when workflowExecutions is null', () => {
      const report = buildDiagnosticReport(defaultParams);

      expect(report).not.toContain('## Configured Workflows');
    });

    it('includes the configured workflows section when workflowExecutions is provided', () => {
      const report = buildDiagnosticReport({
        ...defaultParams,
        aggregatedExecution: makeAggregatedExecution({
          workflowExecutions: {
            alertRetrieval: [{ workflowId: 'wf-retrieval', workflowRunId: 'run-r1' }],
            generation: { workflowId: 'wf-gen', workflowRunId: 'run-g1' },
            validation: { workflowId: 'wf-val', workflowRunId: 'run-v1' },
          },
        }),
      });

      expect(report).toContain('## Configured Workflows');
    });

    it('shows alert retrieval workflows', () => {
      const report = buildDiagnosticReport({
        ...defaultParams,
        aggregatedExecution: makeAggregatedExecution({
          workflowExecutions: {
            alertRetrieval: [
              { workflowId: 'wf-r1', workflowRunId: 'run-r1' },
              { workflowId: 'wf-r2', workflowRunId: 'run-r2' },
            ],
          },
        }),
      });

      expect(report).toContain('Alert Retrieval');
      expect(report).toContain('wf-r1');
      expect(report).toContain('wf-r2');
    });

    it('shows generation workflow', () => {
      const report = buildDiagnosticReport({
        ...defaultParams,
        aggregatedExecution: makeAggregatedExecution({
          workflowExecutions: {
            generation: { workflowId: 'wf-gen', workflowRunId: 'run-gen' },
          },
        }),
      });

      expect(report).toContain('Generation');
      expect(report).toContain('wf-gen');
    });

    it('shows validation workflow', () => {
      const report = buildDiagnosticReport({
        ...defaultParams,
        aggregatedExecution: makeAggregatedExecution({
          workflowExecutions: {
            validation: { workflowId: 'wf-val', workflowRunId: 'run-val' },
          },
        }),
      });

      expect(report).toContain('Validation');
      expect(report).toContain('wf-val');
    });
  });

  describe('section ordering', () => {
    it('renders Failure Details before Execution Summary', () => {
      const report = buildDiagnosticReport({
        ...defaultParams,
        failureReason: 'connector timeout',
      });

      const failureIdx = report.indexOf('## Failure Details');
      const summaryIdx = report.indexOf('## Execution Summary');

      expect(failureIdx).toBeLessThan(summaryIdx);
    });

    it('renders Environment as the last section', () => {
      const report = buildDiagnosticReport({
        ...defaultParams,
        aggregatedExecution: makeAggregatedExecution({
          workflowExecutions: {
            generation: { workflowId: 'wf-gen', workflowRunId: 'run-gen' },
          },
        }),
        environmentContext: { kibanaVersion: '8.14.0', spaceId: 'default' },
        failureReason: 'connector timeout',
      });

      const environmentIdx = report.indexOf('## Environment');
      const configuredWorkflowsIdx = report.indexOf('## Configured Workflows');
      const failureIdx = report.indexOf('## Failure Details');

      expect(environmentIdx).toBeGreaterThan(configuredWorkflowsIdx);
      expect(environmentIdx).toBeGreaterThan(failureIdx);
    });

    it('renders Configured Workflows before Environment', () => {
      const report = buildDiagnosticReport({
        ...defaultParams,
        aggregatedExecution: makeAggregatedExecution({
          workflowExecutions: {
            generation: { workflowId: 'wf-gen', workflowRunId: 'run-gen' },
          },
        }),
        environmentContext: { kibanaVersion: '8.14.0' },
      });

      const configuredWorkflowsIdx = report.indexOf('## Configured Workflows');
      const environmentIdx = report.indexOf('## Environment');

      expect(configuredWorkflowsIdx).toBeLessThan(environmentIdx);
    });
  });

  describe('sanitizeErrorMessage in error details', () => {
    it('strips stack trace lines from error messages in the Error Details section', () => {
      const errorMessage = [
        'Something failed',
        '    at Object.foo (/Users/john/file.ts:10:5)',
      ].join('\n');

      const report = buildDiagnosticReport({
        ...defaultParams,
        aggregatedExecution: makeAggregatedExecution({
          steps: [
            makeStep({
              error: { message: errorMessage, type: 'GenericError' },
              status: ExecutionStatus.FAILED,
            }),
          ],
        }),
      });

      expect(report).toContain('Something failed');
      expect(report).not.toContain('at Object.foo');
    });

    it('strips file paths from error messages in the Error Details section', () => {
      const errorMessage = 'Error reading /Users/john/config.json';

      const report = buildDiagnosticReport({
        ...defaultParams,
        aggregatedExecution: makeAggregatedExecution({
          steps: [
            makeStep({
              error: { message: errorMessage, type: 'IOError' },
              status: ExecutionStatus.FAILED,
            }),
          ],
        }),
      });

      expect(report).not.toContain('/Users/');
    });
  });

  describe('privacy guarantees', () => {
    it('does not include any input/output step data', () => {
      const report = buildDiagnosticReport({
        ...defaultParams,
        aggregatedExecution: makeAggregatedExecution({
          steps: [
            makeStep({
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              input: { prompt: 'secret prompt text about user data' } as any,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              output: { result: 'LLM generated discovery about PII' } as any,
            }),
          ],
        }),
      });

      expect(report).not.toContain('secret prompt text about user data');
      expect(report).not.toContain('LLM generated discovery about PII');
    });

    it('does not include state data from steps', () => {
      const report = buildDiagnosticReport({
        ...defaultParams,
        aggregatedExecution: makeAggregatedExecution({
          steps: [
            makeStep({
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              state: { anonymizationReplacement: 'John Doe -> USER_1' } as any,
            }),
          ],
        }),
      });

      expect(report).not.toContain('John Doe');
      expect(report).not.toContain('anonymizationReplacement');
    });
  });

  describe('graceful handling of missing optional fields', () => {
    it('generates a report with only required fields', () => {
      const report = buildDiagnosticReport({
        aggregatedExecution: makeAggregatedExecution({ status: ExecutionStatus.COMPLETED }),
      });

      expect(report).toContain('# Attack Discovery Diagnostic Report');
      expect(report).toContain('## Execution Summary');
      expect(report).toContain('completed');
    });

    it('handles steps with no workflowRunId (unknown group)', () => {
      const report = buildDiagnosticReport({
        ...defaultParams,
        aggregatedExecution: makeAggregatedExecution({
          steps: [makeStep({ workflowRunId: undefined })],
        }),
      });

      expect(report).toContain('## Pipeline Timeline');
      expect(report).not.toContain('__unknown__');
    });

    it('handles steps with no executionTimeMs gracefully', () => {
      const report = buildDiagnosticReport({
        ...defaultParams,
        aggregatedExecution: makeAggregatedExecution({
          steps: [makeStep({ executionTimeMs: undefined })],
        }),
      });

      // Duration cell should show dash
      expect(report).toContain('| - |');
    });

    it('escapes pipe characters in cell values', () => {
      const report = buildDiagnosticReport({
        ...defaultParams,
        connectorName: 'Name | With | Pipes',
      });

      expect(report).toContain('Name \\| With \\| Pipes');
    });
  });

  describe('pre-execution checks section', () => {
    const mockDiagnosticsContext = {
      config: {
        alertRetrievalMode: 'default_esql',
        alertRetrievalWorkflowCount: 1,
        connectorType: '.gen-ai',
        hasCustomValidation: false,
      },
      preExecutionChecks: [
        { check: 'Connector availability', message: 'Connector is reachable', passed: true },
        { check: 'API key validity', message: 'API key is invalid', passed: false },
      ],
      workflowIntegrity: {
        repaired: [],
        status: 'all_intact' as const,
        unrepairableErrors: [],
      },
    };

    it('omits the pre-execution checks section when diagnosticsContext is undefined', () => {
      const report = buildDiagnosticReport(defaultParams);

      expect(report).not.toContain('## Pre-Execution Checks');
    });

    it('includes the pre-execution checks section when diagnosticsContext is provided', () => {
      const report = buildDiagnosticReport({
        ...defaultParams,
        diagnosticsContext: mockDiagnosticsContext,
      });

      expect(report).toContain('## Pre-Execution Checks');
    });

    it('renders ✅ for passed checks and ❌ for failed checks', () => {
      const report = buildDiagnosticReport({
        ...defaultParams,
        diagnosticsContext: mockDiagnosticsContext,
      });

      expect(report).toContain('| Connector availability | ✅ |');
      expect(report).toContain('| API key validity | ❌ |');
    });

    it('includes the workflow integrity row with all_intact status as ✅', () => {
      const report = buildDiagnosticReport({
        ...defaultParams,
        diagnosticsContext: mockDiagnosticsContext,
      });

      expect(report).toContain('| Workflow Integrity | ✅ |');
      expect(report).toContain('All required workflows intact');
    });

    it('renders repaired workflow integrity status as ✅ with repaired keys', () => {
      const report = buildDiagnosticReport({
        ...defaultParams,
        diagnosticsContext: {
          ...mockDiagnosticsContext,
          workflowIntegrity: {
            repaired: [{ key: 'generation', workflowId: 'wf-gen' }],
            status: 'repaired' as const,
            unrepairableErrors: [],
          },
        },
      });

      expect(report).toContain('| Workflow Integrity | ✅ |');
      expect(report).toContain('Repaired: generation');
    });

    it('renders repair_failed workflow integrity status as ❌ with error keys', () => {
      const report = buildDiagnosticReport({
        ...defaultParams,
        diagnosticsContext: {
          ...mockDiagnosticsContext,
          workflowIntegrity: {
            repaired: [],
            status: 'repair_failed' as const,
            unrepairableErrors: [{ error: 'not found', key: 'validation', workflowId: 'wf-val' }],
          },
        },
      });

      expect(report).toContain('| Workflow Integrity | ❌ |');
      expect(report).toContain('Repair failed: validation');
    });

    it('applies sanitizeErrorMessage to check messages', () => {
      const longMessage = 'Error: '.repeat(200);
      const report = buildDiagnosticReport({
        ...defaultParams,
        diagnosticsContext: {
          ...mockDiagnosticsContext,
          preExecutionChecks: [{ check: 'Test check', message: longMessage, passed: false }],
        },
      });

      // Should render without throwing and with truncated/sanitized message
      expect(report).toContain('## Pre-Execution Checks');
      expect(report).toContain('Test check');
    });

    it('appears after Execution Summary and before Pipeline Timeline', () => {
      const report = buildDiagnosticReport({
        ...defaultParams,
        aggregatedExecution: makeAggregatedExecution({
          steps: [makeStep()],
        }),
        diagnosticsContext: mockDiagnosticsContext,
      });

      const summaryPos = report.indexOf('## Execution Summary');
      const preExecPos = report.indexOf('## Pre-Execution Checks');
      const timelinePos = report.indexOf('## Pipeline Timeline');

      expect(summaryPos).toBeGreaterThan(-1);
      expect(preExecPos).toBeGreaterThan(summaryPos);
      expect(timelinePos).toBeGreaterThan(preExecPos);
    });
  });
});
