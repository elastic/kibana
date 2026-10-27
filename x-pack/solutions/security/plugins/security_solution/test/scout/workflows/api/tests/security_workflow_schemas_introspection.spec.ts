/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { INTERNAL_API_HEADERS, PUBLIC_API_HEADERS } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/api';
import type { ValidateWorkflowResponseDto } from '@kbn/workflows';
import { apiTest, tags, testData } from '../fixtures';
import type { ApiClient } from '../fixtures';

const VALIDATE_WORKFLOW_URL = '/api/workflows/validate';
const AGENT_BUILDER_EXECUTE_TOOL_URL = '/api/agent_builder/tools/_execute';
const GET_TRIGGER_DEFINITIONS_TOOL_ID = 'platform.workflows.get_trigger_definitions';
const GET_STEP_DEFINITIONS_TOOL_ID = 'platform.workflows.get_step_definitions';

const SECURITY_TRIGGER_EVENT_FIELDS: Readonly<Record<string, readonly string[]>> = {
  'security.alertAssigneesChanged': ['alertIds', 'assigneesAdded', 'assigneesRemoved', 'truncated'],
  'security.alertStatusChanged': ['alertIds', 'previousStatuses', 'truncated'],
  'security.alertTagsChanged': ['alertIds', 'tagsAdded', 'tagsRemoved', 'truncated'],
  'security.attackAssigneesChanged': [
    'attackIds',
    'assigneesAdded',
    'assigneesRemoved',
    'truncated',
  ],
  'security.attackStatusChanged': ['attackIds', 'previousStatuses', 'truncated'],
  'security.attackTagsChanged': ['attackIds', 'tagsAdded', 'tagsRemoved', 'truncated'],
  'security.noteCreated': ['noteId', 'createdBy', 'documentId'],
  'security.noteUpdated': ['noteId', 'updatedBy', 'documentId'],
};

/**
 * Security trigger event schemas and step input/output schemas are consumed by
 * workflow authoring surfaces (YAML variable validation, agent trigger/step catalogs)
 * that introspect Zod schemas via `instanceof`, `.shape` and JSON Schema conversion.
 * These tests make sure the schemas stay introspectable through those public surfaces.
 */
apiTest.describe(
  'Security Solution - Workflow schemas introspection',
  { tag: [...tags.stateful.classic] },
  () => {
    let editorHeaders: Record<string, string>;
    let adminHeaders: Record<string, string>;

    apiTest.beforeAll(async ({ samlAuth, requestAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser('editor');
      editorHeaders = { ...cookieHeader, ...testData.COMMON_HEADERS, ...INTERNAL_API_HEADERS };

      const { apiKeyHeader } = await requestAuth.getApiKey('admin');
      adminHeaders = { ...apiKeyHeader, ...testData.COMMON_HEADERS, ...PUBLIC_API_HEADERS };
    });

    for (const [triggerType, eventFields] of Object.entries(SECURITY_TRIGGER_EVENT_FIELDS)) {
      apiTest(
        `workflow YAML validation resolves ${triggerType} event fields`,
        async ({ apiClient }) => {
          const result = await validateWorkflow(
            apiClient,
            editorHeaders,
            buildConsoleWorkflowYaml({
              triggerType,
              messages: eventFields.map((field) => `{{ event.${field} }}`),
            })
          );

          expect(getVariableDiagnostics(result)).toStrictEqual([]);
        }
      );
    }

    apiTest(
      'workflow YAML validation reports unknown security trigger event fields',
      async ({ apiClient }) => {
        const result = await validateWorkflow(
          apiClient,
          editorHeaders,
          buildConsoleWorkflowYaml({
            triggerType: 'security.alertAssigneesChanged',
            messages: ['{{ event.notAnAlertAssigneesChangedField }}'],
          })
        );

        expect(getVariableDiagnostics(result)).toHaveLength(1);
      }
    );

    apiTest(
      'workflow YAML validation resolves security step output fields',
      async ({ apiClient }) => {
        const result = await validateWorkflow(
          apiClient,
          editorHeaders,
          buildCreateNoteWorkflowYaml([
            '{{ steps.create_note.output.success }}',
            '{{ steps.create_note.output.note_id }}',
            '{{ steps.create_note.output.message }}',
          ])
        );

        expect(getVariableDiagnostics(result)).toStrictEqual([]);
      }
    );

    apiTest(
      'workflow YAML validation reports unknown security step output fields',
      async ({ apiClient }) => {
        const result = await validateWorkflow(
          apiClient,
          editorHeaders,
          buildCreateNoteWorkflowYaml(['{{ steps.create_note.output.notACreateNoteOutputField }}'])
        );

        expect(getVariableDiagnostics(result)).toHaveLength(1);
      }
    );

    for (const [triggerType, eventFields] of Object.entries(SECURITY_TRIGGER_EVENT_FIELDS)) {
      apiTest(
        `trigger definitions agent tool exposes ${triggerType} event context schema`,
        async ({ apiClient }) => {
          const data = await executeAgentTool<{
            triggerTypes: Array<{
              id: string;
              eventContextSchema?: { properties?: Record<string, unknown> };
            }>;
          }>(apiClient, adminHeaders, GET_TRIGGER_DEFINITIONS_TOOL_ID, { triggerType });

          const [trigger] = data.triggerTypes;

          expect(trigger.id).toBe(triggerType);
          expect(Object.keys(trigger.eventContextSchema?.properties ?? {})).toStrictEqual(
            expect.arrayContaining([...eventFields])
          );
        }
      );
    }

    apiTest(
      'step definitions agent tool exposes security step input params and output summary',
      async ({ apiClient }) => {
        const data = await executeAgentTool<{
          stepTypes: Array<{
            id: string;
            inputParams?: Array<{ name: string; required: boolean }>;
            outputSummary?: string;
          }>;
        }>(apiClient, adminHeaders, GET_STEP_DEFINITIONS_TOOL_ID, {
          stepType: 'security.createNote',
          includeOutputSummary: true,
        });

        const [step] = data.stepTypes;

        expect(step.id).toBe('security.createNote');
        expect(step.inputParams).toStrictEqual(
          expect.arrayContaining([
            expect.objectContaining({ name: 'text', required: true }),
            expect.objectContaining({ name: 'document_id', required: true }),
          ])
        );
        expect(step.outputSummary).toContain('note_id');
      }
    );
  }
);

const validateWorkflow = async (
  apiClient: ApiClient,
  headers: Record<string, string>,
  yaml: string
): Promise<ValidateWorkflowResponseDto> => {
  const response = await apiClient.post(VALIDATE_WORKFLOW_URL, {
    headers,
    responseType: 'json',
    body: { yaml },
  });

  expect(response).toHaveStatusCode(200);

  return response.body as ValidateWorkflowResponseDto;
};

const executeAgentTool = async <TData>(
  apiClient: ApiClient,
  headers: Record<string, string>,
  toolId: string,
  toolParams: Record<string, unknown>
): Promise<TData> => {
  const response = await apiClient.post(AGENT_BUILDER_EXECUTE_TOOL_URL, {
    headers,
    responseType: 'json',
    body: { tool_id: toolId, tool_params: toolParams },
  });

  expect(response).toHaveStatusCode(200);

  const { results } = response.body as { results: Array<{ data: TData }> };

  return results[0].data;
};

const getVariableDiagnostics = ({ diagnostics }: ValidateWorkflowResponseDto) =>
  diagnostics.filter(({ source }) => source === 'variable');

const buildConsoleWorkflowYaml = ({
  triggerType,
  messages,
}: {
  triggerType: string;
  messages: readonly string[];
}): string => `
name: Security schemas introspection
enabled: false
triggers:
  - type: ${triggerType}
steps:
${messages
  .map(
    (message, index) => `  - name: log_${index}
    type: console
    with:
      message: "${message}"`
  )
  .join('\n')}
`;

const buildCreateNoteWorkflowYaml = (messages: readonly string[]): string => `
name: Security step output introspection
enabled: false
triggers:
  - type: security.noteCreated
steps:
  - name: create_note
    type: security.createNote
    with:
      text: "{{ event.noteId }}"
      document_id: "{{ event.documentId }}"
${messages
  .map(
    (message, index) => `  - name: log_${index}
    type: console
    with:
      message: "${message}"`
  )
  .join('\n')}
`;
