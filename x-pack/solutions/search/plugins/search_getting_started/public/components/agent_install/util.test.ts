/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildPrompt, buildCliConnectCommand } from './util';
import { INSTALL_LINES_CLI, AGENT_ONBOARDING_MESSAGE } from './constants';
import type { Environment } from './constants';

describe('buildPrompt', () => {
  describe('cli environment', () => {
    it('combines install lines and onboarding message', () => {
      const result = buildPrompt('cli');
      expect(result).toBe([...INSTALL_LINES_CLI, AGENT_ONBOARDING_MESSAGE].join('\n'));
      expect(result).toContain('npx skills');
    });
  });

  describe('agent-builder environment', () => {
    it('returns only the onboarding message', () => {
      expect(buildPrompt('agent-builder')).toBe(AGENT_ONBOARDING_MESSAGE);
    });
  });

  it('throws for an unsupported environment', () => {
    expect(() => buildPrompt('unsupported' as Environment)).toThrow(
      'Unsupported environment: unsupported'
    );
  });
});

describe('buildCliConnectCommand', () => {
  it('includes the elasticsearch URL and API key placeholder', () => {
    const elasticsearchUrl = 'https://my-deployment.es.us-east-1.aws.elastic.cloud:443';
    const result = buildCliConnectCommand(elasticsearchUrl);

    expect(result).toContain(`--es-url ${elasticsearchUrl}`);
    expect(result).toContain('--es-api-key <your-api-key>');
    expect(result).toContain('elastic config context add my-deployment');
  });
});
