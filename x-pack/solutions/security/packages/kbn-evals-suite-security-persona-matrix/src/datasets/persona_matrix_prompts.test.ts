/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PERSONA_MATRIX_EXAMPLES } from './persona_matrix_prompts';

// Each row ties operations requested by the question to both answer criteria and
// the trajectory annotation. Keep this table independent of the dataset metadata.
const requiredOperations: Record<string, Array<{ reference: RegExp; tools: string[] }>> = {
  'alert-analysis-a': [
    { reference: /recommends escalation\/containment/i, tools: ['security.alerts'] },
  ],
  'alert-analysis-b': [{ reference: /share entities|correlates/i, tools: ['security.alerts'] }],
  'alert-analysis-c': [
    { reference: /threat intel|security labs/i, tools: ['security.security_labs_search'] },
  ],
  'detection-rule-edit-a': [
    { reference: /T1574\.002|MITRE/i, tools: ['security.create_detection_rule'] },
  ],
  'detection-rule-edit-b': [{ reference: /ES\|QL/i, tools: ['security.create_detection_rule'] }],
  'detection-rule-edit-c': [
    { reference: /research/i, tools: ['security.security_labs_search'] },
    { reference: /rule/i, tools: ['security.create_detection_rule'] },
  ],
  'entity-analytics-a': [
    { reference: /risk score.*asset criticality/i, tools: ['security.get_entity'] },
  ],
  'entity-analytics-b': [{ reference: /top-ranked/i, tools: ['security.search_entities'] }],
  'entity-analytics-c': [{ reference: /history.*risk/i, tools: ['security.get_entity'] }],
  'multi-step-a': [
    { reference: /analyzes the attached alert/i, tools: ['attachments.read'] },
    { reference: /verifies its file hash.*virustotal_lookup/i, tools: ['virustotal_lookup'] },
    { reference: /on-call owner.*on_call_lookup/i, tools: ['on_call_lookup'] },
    { reference: /creates a Slack incident channel.*create\.channel/i, tools: ['create.channel'] },
    { reference: /verdict, IOCs, and on-call owner.*each completed step/i, tools: [] },
  ],
  'multi-step-b': [
    { reference: /loader hash.*virustotal_lookup/i, tools: ['virustotal_lookup'] },
    { reference: /on-call responder.*on_call_lookup/i, tools: ['on_call_lookup'] },
    {
      reference: /critical Security case.*platform\.core\.cases\.manage/i,
      tools: ['platform.core.cases.manage'],
    },
    { reference: /Slack incident channel.*create\.channel/i, tools: ['create.channel'] },
    { reference: /posts the case summary and top IOCs.*each step/i, tools: [] },
  ],
  'multi-step-c': [
    { reference: /alert queue/i, tools: ['security.alerts'] },
    {
      reference: /IOCs via ES\|QL/i,
      tools: ['platform.core.generate_esql', 'platform.core.execute_esql'],
    },
    { reference: /on-call owner.*on_call_lookup/i, tools: ['on_call_lookup'] },
    { reference: /If confirmed.*Slack channel.*create\.channel/i, tools: ['create.channel'] },
    { reference: /If benign, does not create a channel or escalate/i, tools: [] },
    { reference: /confirmed findings and recommended actions/i, tools: [] },
  ],
  'threat-hunting-a': [
    {
      reference: /ES\|QL.*log\.dll/i,
      tools: ['platform.core.generate_esql', 'platform.core.execute_esql'],
    },
  ],
  'threat-hunting-b': [
    {
      reference: /process-start, file-load, and network\/DNS/i,
      tools: ['platform.core.execute_esql'],
    },
  ],
  'threat-hunting-c': [{ reference: /baseline.*outliers/i, tools: ['platform.core.execute_esql'] }],
  'workflow-authoring-a': [
    { reference: /Slack connector ID/i, tools: ['platform.core.generate_workflow'] },
  ],
  'workflow-authoring-b': [{ reference: /workflow/i, tools: ['platform.core.generate_workflow'] }],
  'workflow-authoring-c': [{ reference: /workflow/i, tools: ['platform.core.generate_workflow'] }],
  'workflow-execution-a': [
    { reference: /virustotal_lookup.*verdict/i, tools: ['virustotal_lookup'] },
  ],
  'workflow-execution-b': [
    { reference: /on_call_lookup.*primary responder and contact/i, tools: ['on_call_lookup'] },
  ],
  'workflow-execution-c': [
    { reference: /critical severity/i, tools: ['platform.core.cases.manage'] },
  ],
};

describe('persona matrix question and grading consistency', () => {
  it('covers all 21 examples and their required operations in the same reference and tool list', () => {
    expect(PERSONA_MATRIX_EXAMPLES).toHaveLength(21);
    expect(PERSONA_MATRIX_EXAMPLES.map(({ id }) => id).sort()).toEqual(
      Object.keys(requiredOperations).sort()
    );
    for (const { id, output, metadata } of PERSONA_MATRIX_EXAMPLES) {
      for (const { reference, tools } of requiredOperations[id]) {
        expect(output.reference).toMatch(reference);
        for (const tool of tools) {
          expect(metadata.expectedTools).toContain(tool);
        }
      }
    }
  });

  it('keeps the multi-step operation contracts tied to their question text', () => {
    const questions = Object.fromEntries(
      PERSONA_MATRIX_EXAMPLES.map(({ id, input }) => [id, input.question])
    );
    expect(questions['multi-step-a']).toMatch(/alert.*VirusTotal.*on call.*Slack channel/i);
    expect(questions['multi-step-b']).toMatch(
      /VirusTotal.*on-call schedule.*Security case.*Slack incident channel.*case summary and top IOCs/i
    );
    expect(questions['multi-step-c']).toMatch(
      /alerts.*hunt.*on call.*true positive.*Slack channel.*Don't escalate if it's benign/i
    );
  });

  it('preserves the primary expected tool for the three multi-step examples', () => {
    expect(
      PERSONA_MATRIX_EXAMPLES.filter(({ category }) => category === 'multi-step').map(
        ({ metadata }) => metadata.expectedTools?.[0]
      )
    ).toEqual(['attachments.read', 'security.security_labs_search', 'security.alerts']);
  });
});
