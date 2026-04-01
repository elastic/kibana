/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { extractWorkflowYaml, type ExtractWorkflowYamlResult } from '.';

const SAMPLE_YAML = `name: my-workflow
version: '1'
description: A test workflow
triggers:
  - type: manual
steps:
  - name: step-1
    type: elasticsearch.search
    with:
      request:
        method: GET
        path: /my-index/_search`;

describe('extractWorkflowYaml', () => {
  describe('YAML in markdown code fences', () => {
    it('extracts YAML from a ```yaml code fence', () => {
      const message = `Here is the workflow I generated:\n\n\`\`\`yaml\n${SAMPLE_YAML}\n\`\`\`\n\nLet me know if you need changes.`;

      const result: ExtractWorkflowYamlResult = extractWorkflowYaml(message);

      expect(result).toEqual({
        ok: true,
        yaml: SAMPLE_YAML,
      });
    });

    it('extracts YAML from a ```yml code fence', () => {
      const message = `\`\`\`yml\n${SAMPLE_YAML}\n\`\`\``;

      const result = extractWorkflowYaml(message);

      expect(result).toEqual({
        ok: true,
        yaml: SAMPLE_YAML,
      });
    });

    it('extracts YAML from a bare ``` code fence (no language tag)', () => {
      const message = `\`\`\`\n${SAMPLE_YAML}\n\`\`\``;

      const result = extractWorkflowYaml(message);

      expect(result).toEqual({
        ok: true,
        yaml: SAMPLE_YAML,
      });
    });

    it('extracts the first code fence when multiple are present', () => {
      const secondYaml = 'name: second-workflow';
      const message = `\`\`\`yaml\n${SAMPLE_YAML}\n\`\`\`\n\nHere is another:\n\n\`\`\`yaml\n${secondYaml}\n\`\`\``;

      const result = extractWorkflowYaml(message);

      expect(result).toEqual({
        ok: true,
        yaml: SAMPLE_YAML,
      });
    });

    it('trims whitespace from extracted YAML', () => {
      const message = `\`\`\`yaml\n  \n${SAMPLE_YAML}\n  \n\`\`\``;

      const result = extractWorkflowYaml(message);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.yaml).toBe(SAMPLE_YAML);
      }
    });

    it('returns an error when the code fence is empty', () => {
      const message = '```yaml\n   \n```';

      const result = extractWorkflowYaml(message);

      expect(result).toEqual({
        error: 'Code fence was found but contained no YAML content',
        ok: false,
      });
    });
  });

  describe('raw YAML content', () => {
    it('detects raw YAML starting with name:', () => {
      const result = extractWorkflowYaml(SAMPLE_YAML);

      expect(result).toEqual({
        ok: true,
        yaml: SAMPLE_YAML,
      });
    });

    it('detects raw YAML starting with version:', () => {
      const rawYaml = `version: '1'\nname: my-workflow`;

      const result = extractWorkflowYaml(rawYaml);

      expect(result).toEqual({
        ok: true,
        yaml: rawYaml,
      });
    });

    it('detects raw YAML starting with description:', () => {
      const rawYaml = 'description: A workflow\nname: my-workflow';

      const result = extractWorkflowYaml(rawYaml);

      expect(result).toEqual({
        ok: true,
        yaml: rawYaml,
      });
    });

    it('trims leading and trailing whitespace from raw YAML', () => {
      const result = extractWorkflowYaml(`  \n${SAMPLE_YAML}\n  `);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.yaml).toBe(SAMPLE_YAML);
      }
    });
  });

  describe('error cases', () => {
    it('returns an error for an empty string', () => {
      const result = extractWorkflowYaml('');

      expect(result).toEqual({
        error: 'Agent response message is empty',
        ok: false,
      });
    });

    it('returns an error for a whitespace-only string', () => {
      const result = extractWorkflowYaml('   \n  \n  ');

      expect(result).toEqual({
        error: 'Agent response message is empty',
        ok: false,
      });
    });

    it('returns an error when no YAML is found in the response', () => {
      const message =
        'I was unable to generate a workflow. Could you provide more details about the alerts you want to retrieve?';

      const result = extractWorkflowYaml(message);

      expect(result).toEqual({
        error: expect.stringContaining('Could not extract workflow YAML'),
        ok: false,
      });
    });

    it('returns an error for a response with non-YAML code fence', () => {
      const message = 'Here is some code:\n\n```json\n{"key": "value"}\n```';

      // json code fence should not match our yaml-specific regex
      const result = extractWorkflowYaml(message);

      // The json code fence won't match ```(?:ya?ml)? since "json" is not yaml/yml/empty
      // So it falls through to raw YAML check, which also fails
      expect(result.ok).toBe(false);
    });
  });
});
