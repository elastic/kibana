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

    it('includes Workflow Name column header in the pipeline timeline section', () => {
      const report = buildDiagnosticReport({
        ...defaultParams,
        aggregatedExecution: makeAggregatedExecution({ steps: [makeStep()] }),
      });

      expect(report).toContain('Workflow Name');
    });

    it('shows the workflow name in the pipeline timeline when available', () => {
      const report = buildDiagnosticReport({
        ...defaultParams,
        aggregatedExecution: makeAggregatedExecution({
          steps: [makeStep({ workflowId: 'wf-gen-1', workflowName: 'Generation Workflow' })],
        }),
      });

      expect(report).toContain('Generation Workflow');
    });

    it('shows dash for workflow name when workflowName is undefined in the pipeline timeline', () => {
      const report = buildDiagnosticReport({
        ...defaultParams,
        aggregatedExecution: makeAggregatedExecution({
          steps: [makeStep({ workflowName: undefined })],
        }),
      });

      // Isolate the Pipeline Timeline section to check the workflow name cell is a dash
      const afterTimeline = report.split('## Pipeline Timeline')[1];
      const timelineSection = afterTimeline.split('##')[0];
      const dataRows = timelineSection
        .split('\n')
        .filter(
          (line) => line.startsWith('|') && !line.startsWith('| Phase') && !line.startsWith('|---')
        );

      expect(dataRows[0]).toContain('| - |');
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

  describe('configuration section', () => {
    const mockDiagnosticsContextWithConfig = {
      config: {
        alertRetrievalMode: 'default_esql',
        alertRetrievalWorkflowCount: 2,
        connectorType: '.gen-ai',
        hasCustomValidation: true,
      },
      preExecutionChecks: [],
      workflowIntegrity: {
        repaired: [],
        status: 'all_intact' as const,
        unrepairableErrors: [],
      },
    };

    it('omits the configuration section when diagnosticsContext is undefined', () => {
      const report = buildDiagnosticReport(defaultParams);

      expect(report).not.toContain('## Configuration');
    });

    it('includes the configuration section header when diagnosticsContext is provided', () => {
      const report = buildDiagnosticReport({
        ...defaultParams,
        diagnosticsContext: mockDiagnosticsContextWithConfig,
      });

      expect(report).toContain('## Configuration');
    });

    it('shows alertRetrievalMode in the configuration section', () => {
      const report = buildDiagnosticReport({
        ...defaultParams,
        diagnosticsContext: mockDiagnosticsContextWithConfig,
      });

      expect(report).toContain('default_esql');
    });

    it('shows alertRetrievalWorkflowCount in the configuration section', () => {
      const report = buildDiagnosticReport({
        ...defaultParams,
        diagnosticsContext: mockDiagnosticsContextWithConfig,
      });

      expect(report).toContain('Alert Retrieval Workflow Count');
    });

    it('shows connectorType in the configuration section', () => {
      const report = buildDiagnosticReport({
        ...defaultParams,
        diagnosticsContext: mockDiagnosticsContextWithConfig,
      });

      expect(report).toContain('.gen-ai');
    });

    it('shows hasCustomValidation as true in the configuration section', () => {
      const report = buildDiagnosticReport({
        ...defaultParams,
        diagnosticsContext: mockDiagnosticsContextWithConfig,
      });

      expect(report).toContain('true');
    });

    it('shows hasCustomValidation as false in the configuration section', () => {
      const report = buildDiagnosticReport({
        ...defaultParams,
        diagnosticsContext: {
          ...mockDiagnosticsContextWithConfig,
          config: { ...mockDiagnosticsContextWithConfig.config, hasCustomValidation: false },
        },
      });

      expect(report).toContain('false');
    });

    it('appears after Pre-Execution Checks and before Pipeline Timeline', () => {
      const report = buildDiagnosticReport({
        ...defaultParams,
        aggregatedExecution: makeAggregatedExecution({ steps: [makeStep()] }),
        diagnosticsContext: mockDiagnosticsContextWithConfig,
      });

      const preExecPos = report.indexOf('## Pre-Execution Checks');
      const configPos = report.indexOf('## Configuration');
      const timelinePos = report.indexOf('## Pipeline Timeline');

      expect(configPos).toBeGreaterThan(preExecPos);
      expect(configPos).toBeLessThan(timelinePos);
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

    it('shows workflow description in the step execution details when available', () => {
      const report = buildDiagnosticReport({
        ...defaultParams,
        aggregatedExecution: makeAggregatedExecution({
          steps: [
            makeStep({
              workflowDescription: 'Retrieves alerts for analysis',
            }),
          ],
        }),
      });

      expect(report).toContain('Retrieves alerts for analysis');
    });

    it('does not include workflowDescription text when workflowDescription is undefined', () => {
      const report = buildDiagnosticReport({
        ...defaultParams,
        aggregatedExecution: makeAggregatedExecution({
          steps: [
            makeStep({
              workflowDescription: undefined,
              workflowName: 'My Workflow',
            }),
          ],
        }),
      });

      // The workflow cell should just show the name without any description separator
      const afterDetails = report.split('## Step Execution Details')[1];
      const detailsSection = afterDetails.split('##')[0];
      const dataRows = detailsSection
        .split('\n')
        .filter(
          (line) =>
            line.startsWith('|') && !line.startsWith('| Step ID') && !line.startsWith('|---')
        );

      expect(dataRows[0]).not.toContain('—');
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

    it('includes Workflow Name column header in the configured workflows section', () => {
      const report = buildDiagnosticReport({
        ...defaultParams,
        aggregatedExecution: makeAggregatedExecution({
          workflowExecutions: {
            generation: { workflowId: 'wf-gen', workflowRunId: 'run-gen' },
          },
        }),
      });

      // Isolate the Configured Workflows section
      const afterSection = report.split('## Configured Workflows')[1];
      const sectionContent = afterSection.split('##')[0];

      expect(sectionContent).toContain('Workflow Name');
    });

    it('shows resolved workflow name for alert retrieval in configured workflows', () => {
      const report = buildDiagnosticReport({
        ...defaultParams,
        aggregatedExecution: makeAggregatedExecution({
          steps: [
            makeStep({ workflowId: 'wf-retrieval', workflowName: 'Alert Retrieval Workflow' }),
          ],
          workflowExecutions: {
            alertRetrieval: [{ workflowId: 'wf-retrieval', workflowRunId: 'run-r1' }],
          },
        }),
      });

      expect(report).toContain('Alert Retrieval Workflow');
    });

    it('shows resolved workflow name for generation in configured workflows', () => {
      const report = buildDiagnosticReport({
        ...defaultParams,
        aggregatedExecution: makeAggregatedExecution({
          steps: [makeStep({ workflowId: 'wf-gen', workflowName: 'Generation Workflow' })],
          workflowExecutions: {
            generation: { workflowId: 'wf-gen', workflowRunId: 'run-gen' },
          },
        }),
      });

      expect(report).toContain('Generation Workflow');
    });

    it('shows resolved workflow name for validation in configured workflows', () => {
      const report = buildDiagnosticReport({
        ...defaultParams,
        aggregatedExecution: makeAggregatedExecution({
          steps: [makeStep({ workflowId: 'wf-val', workflowName: 'Validation Workflow' })],
          workflowExecutions: {
            validation: { workflowId: 'wf-val', workflowRunId: 'run-val' },
          },
        }),
      });

      expect(report).toContain('Validation Workflow');
    });

    it('shows dash for workflow name in configured workflows when workflowId is not found in steps', () => {
      const report = buildDiagnosticReport({
        ...defaultParams,
        aggregatedExecution: makeAggregatedExecution({
          steps: [],
          workflowExecutions: {
            generation: { workflowId: 'wf-gen-unknown', workflowRunId: 'run-gen' },
          },
        }),
      });

      // Isolate the Configured Workflows section to check the name cell
      const afterSection = report.split('## Configured Workflows')[1];
      const sectionContent = afterSection.split('##')[0];
      const dataRows = sectionContent
        .split('\n')
        .filter(
          (line) => line.startsWith('|') && !line.startsWith('| Role') && !line.startsWith('|---')
        );

      expect(dataRows[0]).toContain('| - |');
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

  describe('execution summary — new rows', () => {
    it('includes Connector Type row when connectorActionTypeId is provided', () => {
      const report = buildDiagnosticReport({
        ...defaultParams,
        connectorActionTypeId: '.gen-ai',
      });

      expect(report).toContain('Connector Type');
    });

    it('shows the connectorActionTypeId value in the Connector Type row', () => {
      const report = buildDiagnosticReport({
        ...defaultParams,
        connectorActionTypeId: '.gen-ai',
      });

      expect(report).toContain('.gen-ai');
    });

    it('omits Connector Type row when connectorActionTypeId is undefined', () => {
      const report = buildDiagnosticReport(defaultParams);

      expect(report).not.toContain('Connector Type');
    });

    it('includes Connector Model row when connectorModel is provided', () => {
      const report = buildDiagnosticReport({
        ...defaultParams,
        connectorModel: 'gpt-4o',
      });

      expect(report).toContain('Connector Model');
    });

    it('shows the connectorModel value in the Connector Model row', () => {
      const report = buildDiagnosticReport({
        ...defaultParams,
        connectorModel: 'gpt-4o',
      });

      expect(report).toContain('gpt-4o');
    });

    it('omits Connector Model row when connectorModel is undefined', () => {
      const report = buildDiagnosticReport(defaultParams);

      expect(report).not.toContain('Connector Model');
    });

    it('includes Average Successful Duration row when averageSuccessfulDurationMs is provided', () => {
      const report = buildDiagnosticReport({
        ...defaultParams,
        averageSuccessfulDurationMs: 12345,
      });

      expect(report).toContain('Average Successful Duration');
    });

    it('shows the averageSuccessfulDurationMs value formatted as ms', () => {
      const report = buildDiagnosticReport({
        ...defaultParams,
        averageSuccessfulDurationMs: 12345,
      });

      expect(report).toContain('12345 ms');
    });

    it('omits Average Successful Duration row when averageSuccessfulDurationMs is undefined', () => {
      const report = buildDiagnosticReport(defaultParams);

      expect(report).not.toContain('Average Successful Duration');
    });

    it('includes Date Range row when both dateRangeStart and dateRangeEnd are provided', () => {
      const report = buildDiagnosticReport({
        ...defaultParams,
        dateRangeEnd: '2024-01-02T00:00:00Z',
        dateRangeStart: '2024-01-01T00:00:00Z',
      });

      expect(report).toContain('Date Range');
    });

    it('shows start and end dates in the Date Range row', () => {
      const report = buildDiagnosticReport({
        ...defaultParams,
        dateRangeEnd: '2024-01-02T00:00:00Z',
        dateRangeStart: '2024-01-01T00:00:00Z',
      });

      expect(report).toContain('2024-01-01T00:00:00Z');
    });

    it('omits Date Range row when neither dateRangeStart nor dateRangeEnd is provided', () => {
      const report = buildDiagnosticReport(defaultParams);

      expect(report).not.toContain('Date Range');
    });

    it('includes Configured Max Alerts row when configuredMaxAlerts is provided', () => {
      const report = buildDiagnosticReport({
        ...defaultParams,
        configuredMaxAlerts: 100,
      });

      expect(report).toContain('Configured Max Alerts');
    });

    it('shows the configuredMaxAlerts value in the Configured Max Alerts row', () => {
      const report = buildDiagnosticReport({
        ...defaultParams,
        configuredMaxAlerts: 100,
      });

      expect(report).toContain('100');
    });

    it('omits Configured Max Alerts row when configuredMaxAlerts is undefined', () => {
      const report = buildDiagnosticReport(defaultParams);

      expect(report).not.toContain('Configured Max Alerts');
    });
  });

  describe('quality metrics section', () => {
    it('omits Quality Metrics section when no quality metrics params are provided', () => {
      const report = buildDiagnosticReport(defaultParams);

      expect(report).not.toContain('## Quality Metrics');
    });

    it('includes Quality Metrics section when generatedCount is provided', () => {
      const report = buildDiagnosticReport({
        ...defaultParams,
        generatedCount: 5,
      });

      expect(report).toContain('## Quality Metrics');
    });

    it('includes Quality Metrics section when hallucinationsFilteredCount is provided', () => {
      const report = buildDiagnosticReport({
        ...defaultParams,
        hallucinationsFilteredCount: 2,
      });

      expect(report).toContain('## Quality Metrics');
    });

    it('includes Quality Metrics section when duplicatesDroppedCount is provided', () => {
      const report = buildDiagnosticReport({
        ...defaultParams,
        duplicatesDroppedCount: 1,
      });

      expect(report).toContain('## Quality Metrics');
    });

    it('includes Quality Metrics section when persistedCount is provided', () => {
      const report = buildDiagnosticReport({
        ...defaultParams,
        persistedCount: 3,
      });

      expect(report).toContain('## Quality Metrics');
    });

    it('shows Discoveries Generated row with the generatedCount value', () => {
      const report = buildDiagnosticReport({
        ...defaultParams,
        generatedCount: 7,
      });

      expect(report).toContain('Discoveries Generated');
    });

    it('shows the generatedCount value in the Discoveries Generated row', () => {
      const report = buildDiagnosticReport({
        ...defaultParams,
        generatedCount: 7,
      });

      expect(report).toContain('7');
    });

    it('shows Hallucinations Filtered row with the hallucinationsFilteredCount value', () => {
      const report = buildDiagnosticReport({
        ...defaultParams,
        hallucinationsFilteredCount: 3,
      });

      expect(report).toContain('Hallucinations Filtered');
    });

    it('shows the hallucinationsFilteredCount value in the Hallucinations Filtered row', () => {
      const report = buildDiagnosticReport({
        ...defaultParams,
        hallucinationsFilteredCount: 3,
      });

      expect(report).toContain('3');
    });

    it('shows Duplicates Dropped row with the duplicatesDroppedCount value', () => {
      const report = buildDiagnosticReport({
        ...defaultParams,
        duplicatesDroppedCount: 2,
      });

      expect(report).toContain('Duplicates Dropped');
    });

    it('shows the duplicatesDroppedCount value in the Duplicates Dropped row', () => {
      const report = buildDiagnosticReport({
        ...defaultParams,
        duplicatesDroppedCount: 2,
      });

      expect(report).toContain('2');
    });

    it('shows Discoveries Persisted row with the persistedCount value', () => {
      const report = buildDiagnosticReport({
        ...defaultParams,
        persistedCount: 4,
      });

      expect(report).toContain('Discoveries Persisted');
    });

    it('shows the persistedCount value in the Discoveries Persisted row', () => {
      const report = buildDiagnosticReport({
        ...defaultParams,
        persistedCount: 4,
      });

      expect(report).toContain('4');
    });

    it('omits Quality Metrics section when all quality metric params are undefined', () => {
      const report = buildDiagnosticReport({
        ...defaultParams,
        duplicatesDroppedCount: undefined,
        generatedCount: undefined,
        hallucinationsFilteredCount: undefined,
        persistedCount: undefined,
      });

      expect(report).not.toContain('## Quality Metrics');
    });

    it('shows all four metric rows when all params are provided', () => {
      const report = buildDiagnosticReport({
        ...defaultParams,
        duplicatesDroppedCount: 1,
        generatedCount: 5,
        hallucinationsFilteredCount: 2,
        persistedCount: 3,
      });

      const afterSection = report.split('## Quality Metrics')[1];
      const sectionContent = afterSection.split('##')[0];

      expect(sectionContent).toContain('Discoveries Generated');
      expect(sectionContent).toContain('Hallucinations Filtered');
      expect(sectionContent).toContain('Duplicates Dropped');
      expect(sectionContent).toContain('Discoveries Persisted');
    });

    it('shows only present metric rows when some params are undefined', () => {
      const report = buildDiagnosticReport({
        ...defaultParams,
        generatedCount: 5,
      });

      const afterSection = report.split('## Quality Metrics')[1];
      const sectionContent = afterSection.split('##')[0];

      expect(sectionContent).not.toContain('Hallucinations Filtered');
    });
  });

  describe('per-workflow alert retrieval section', () => {
    it('omits the Per-Workflow Alert Retrieval section when perWorkflowAlertRetrieval is undefined', () => {
      const report = buildDiagnosticReport(defaultParams);

      expect(report).not.toContain('## Per-Workflow Alert Retrieval');
    });

    it('omits the Per-Workflow Alert Retrieval section when perWorkflowAlertRetrieval is an empty array', () => {
      const report = buildDiagnosticReport({
        ...defaultParams,
        perWorkflowAlertRetrieval: [],
      });

      expect(report).not.toContain('## Per-Workflow Alert Retrieval');
    });

    it('includes the Per-Workflow Alert Retrieval section when perWorkflowAlertRetrieval has entries', () => {
      const report = buildDiagnosticReport({
        ...defaultParams,
        perWorkflowAlertRetrieval: [
          {
            alertsContextCount: 42,
            extractionStrategy: 'esql',
            workflowId: 'wf-retrieval-1',
            workflowName: 'Alert Retrieval Workflow',
            workflowRunId: 'run-r1',
          },
        ],
      });

      expect(report).toContain('## Per-Workflow Alert Retrieval');
    });

    it('shows one row per workflow in the Per-Workflow Alert Retrieval table', () => {
      const report = buildDiagnosticReport({
        ...defaultParams,
        perWorkflowAlertRetrieval: [
          {
            alertsContextCount: 10,
            workflowId: 'wf-r1',
            workflowName: 'Workflow A',
            workflowRunId: 'run-r1',
          },
          {
            alertsContextCount: 20,
            workflowId: 'wf-r2',
            workflowName: 'Workflow B',
            workflowRunId: 'run-r2',
          },
        ],
      });

      const afterSection = report.split('## Per-Workflow Alert Retrieval')[1];
      const sectionContent = afterSection.split('##')[0];
      const dataRows = sectionContent
        .split('\n')
        .filter(
          (line) =>
            line.startsWith('|') && !line.startsWith('| Workflow Name') && !line.startsWith('|---')
        );

      // Two workflow rows + one Combined row
      expect(dataRows).toHaveLength(3);
    });

    it('shows the workflow name in each row of the Per-Workflow Alert Retrieval table', () => {
      const report = buildDiagnosticReport({
        ...defaultParams,
        perWorkflowAlertRetrieval: [
          {
            alertsContextCount: 10,
            workflowId: 'wf-r1',
            workflowName: 'My Retrieval Workflow',
            workflowRunId: 'run-r1',
          },
        ],
      });

      expect(report).toContain('My Retrieval Workflow');
    });

    it('shows the workflowId as fallback when workflowName is absent', () => {
      const report = buildDiagnosticReport({
        ...defaultParams,
        perWorkflowAlertRetrieval: [
          {
            alertsContextCount: 10,
            workflowId: 'wf-r1',
            workflowRunId: 'run-r1',
          },
        ],
      });

      const afterSection = report.split('## Per-Workflow Alert Retrieval')[1];
      const sectionContent = afterSection.split('##')[0];

      expect(sectionContent).toContain('wf-r1');
    });

    it('shows the alertsContextCount in the Alerts column', () => {
      const report = buildDiagnosticReport({
        ...defaultParams,
        perWorkflowAlertRetrieval: [
          {
            alertsContextCount: 42,
            workflowId: 'wf-r1',
            workflowRunId: 'run-r1',
          },
        ],
      });

      const afterSection = report.split('## Per-Workflow Alert Retrieval')[1];
      const sectionContent = afterSection.split('##')[0];

      expect(sectionContent).toContain('42');
    });

    it('shows dash for alertsContextCount when it is null', () => {
      const report = buildDiagnosticReport({
        ...defaultParams,
        perWorkflowAlertRetrieval: [
          {
            alertsContextCount: null,
            workflowId: 'wf-r1',
            workflowRunId: 'run-r1',
          },
        ],
      });

      const afterSection = report.split('## Per-Workflow Alert Retrieval')[1];
      const sectionContent = afterSection.split('##')[0];
      const dataRows = sectionContent
        .split('\n')
        .filter(
          (line) =>
            line.startsWith('|') && !line.startsWith('| Workflow') && !line.startsWith('|---')
        );

      expect(dataRows[0]).toContain('| - |');
    });

    it('shows the extractionStrategy in the Strategy column', () => {
      const report = buildDiagnosticReport({
        ...defaultParams,
        perWorkflowAlertRetrieval: [
          {
            alertsContextCount: 10,
            extractionStrategy: 'esql',
            workflowId: 'wf-r1',
            workflowRunId: 'run-r1',
          },
        ],
      });

      const afterSection = report.split('## Per-Workflow Alert Retrieval')[1];
      const sectionContent = afterSection.split('##')[0];

      expect(sectionContent).toContain('esql');
    });

    it('shows dash for extractionStrategy when it is undefined', () => {
      const report = buildDiagnosticReport({
        ...defaultParams,
        perWorkflowAlertRetrieval: [
          {
            alertsContextCount: 10,
            workflowId: 'wf-r1',
            workflowRunId: 'run-r1',
          },
        ],
      });

      const afterSection = report.split('## Per-Workflow Alert Retrieval')[1];
      const sectionContent = afterSection.split('##')[0];
      const dataRows = sectionContent
        .split('\n')
        .filter(
          (line) =>
            line.startsWith('|') && !line.startsWith('| Workflow') && !line.startsWith('|---')
        );

      expect(dataRows[0]).toContain('| - |');
    });

    it('shows the workflowId in the Workflow ID column', () => {
      const report = buildDiagnosticReport({
        ...defaultParams,
        perWorkflowAlertRetrieval: [
          {
            alertsContextCount: 10,
            workflowId: 'wf-retrieval-xyz',
            workflowRunId: 'run-r1',
          },
        ],
      });

      const afterSection = report.split('## Per-Workflow Alert Retrieval')[1];
      const sectionContent = afterSection.split('##')[0];

      expect(sectionContent).toContain('wf-retrieval-xyz');
    });

    it('shows a Combined row with the sum of all alertsContextCounts', () => {
      const report = buildDiagnosticReport({
        ...defaultParams,
        perWorkflowAlertRetrieval: [
          { alertsContextCount: 10, workflowId: 'wf-r1', workflowRunId: 'run-r1' },
          { alertsContextCount: 20, workflowId: 'wf-r2', workflowRunId: 'run-r2' },
        ],
      });

      const afterSection = report.split('## Per-Workflow Alert Retrieval')[1];
      const sectionContent = afterSection.split('##')[0];

      expect(sectionContent).toContain('Combined');
      expect(sectionContent).toContain('30');
    });

    it('shows dash in Combined row alerts cell when all counts are null', () => {
      const report = buildDiagnosticReport({
        ...defaultParams,
        perWorkflowAlertRetrieval: [
          { alertsContextCount: null, workflowId: 'wf-r1', workflowRunId: 'run-r1' },
        ],
      });

      const afterSection = report.split('## Per-Workflow Alert Retrieval')[1];
      const sectionContent = afterSection.split('##')[0];
      const combinedRow = sectionContent.split('\n').find((line) => line.includes('Combined'));

      expect(combinedRow).toContain('| - |');
    });
  });

  describe('execution trigger section', () => {
    it('omits the Execution Trigger section when sourceMetadata is undefined', () => {
      const report = buildDiagnosticReport(defaultParams);

      expect(report).not.toContain('## Execution Trigger');
    });

    it('includes the Execution Trigger section when sourceMetadata is null', () => {
      const report = buildDiagnosticReport({
        ...defaultParams,
        sourceMetadata: null,
      });

      expect(report).toContain('## Execution Trigger');
    });

    it('shows Manual trigger type when sourceMetadata is null', () => {
      const report = buildDiagnosticReport({
        ...defaultParams,
        sourceMetadata: null,
      });

      expect(report).toContain('Manual');
    });

    it('includes the Execution Trigger section when sourceMetadata is an empty object', () => {
      const report = buildDiagnosticReport({
        ...defaultParams,
        sourceMetadata: {},
      });

      expect(report).toContain('## Execution Trigger');
    });

    it('shows Manual trigger type when sourceMetadata is an empty object', () => {
      const report = buildDiagnosticReport({
        ...defaultParams,
        sourceMetadata: {},
      });

      expect(report).toContain('Manual');
    });

    it('shows Scheduled trigger type when sourceMetadata has a rule_id', () => {
      const report = buildDiagnosticReport({
        ...defaultParams,
        sourceMetadata: { rule_id: 'rule-abc', rule_name: 'My Schedule' },
      });

      expect(report).toContain('Scheduled');
    });

    it('shows the rule_name as Schedule Name when sourceMetadata has rule_name', () => {
      const report = buildDiagnosticReport({
        ...defaultParams,
        sourceMetadata: { rule_id: 'rule-abc', rule_name: 'My Schedule' },
      });

      expect(report).toContain('My Schedule');
    });

    it('shows the rule_id as Schedule ID when sourceMetadata has rule_id', () => {
      const report = buildDiagnosticReport({
        ...defaultParams,
        sourceMetadata: { rule_id: 'rule-abc', rule_name: 'My Schedule' },
      });

      expect(report).toContain('rule-abc');
    });

    it('omits Schedule Name and Schedule ID rows when sourceMetadata has no rule metadata', () => {
      const report = buildDiagnosticReport({
        ...defaultParams,
        sourceMetadata: null,
      });

      const afterSection = report.split('## Execution Trigger')[1];
      const sectionContent = afterSection.split('##')[0];

      expect(sectionContent).not.toContain('Schedule Name');
      expect(sectionContent).not.toContain('Schedule ID');
    });

    it('shows Workflow Step trigger type when sourceMetadata has action_execution_uuid but no rule_id', () => {
      const report = buildDiagnosticReport({
        ...defaultParams,
        sourceMetadata: { action_execution_uuid: 'exec-uuid-xyz' },
      });

      expect(report).toContain('Workflow Step');
    });

    it('shows the action_execution_uuid in the Execution Trigger section', () => {
      const report = buildDiagnosticReport({
        ...defaultParams,
        sourceMetadata: { action_execution_uuid: 'exec-uuid-xyz' },
      });

      const afterSection = report.split('## Execution Trigger')[1];
      const sectionContent = afterSection.split('##')[0];

      expect(sectionContent).toContain('exec-uuid-xyz');
    });
  });
});
