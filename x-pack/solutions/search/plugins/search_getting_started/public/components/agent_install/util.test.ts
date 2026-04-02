/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildPrompt } from './util';
import { INSTALL_LINES_CURSOR, INSTALL_LINES_CLI, USE_CASE_MESSAGES } from './constants';
import type { Environment, UseCaseId } from './constants';

describe('buildPrompt', () => {
  describe('cursor environment', () => {
    it('combines install lines and use-case message for general-search', () => {
      const result = buildPrompt('general-search', 'cursor');
      expect(result).toBe(
        [...INSTALL_LINES_CURSOR, USE_CASE_MESSAGES['general-search']].join('\n')
      );
      expect(result).toContain('npx skills');
      expect(result).not.toContain('Follow the /');
    });

    it('appends a skill line for a specific use case', () => {
      const result = buildPrompt('semantic-search', 'cursor');
      expect(result).toBe(
        [
          ...INSTALL_LINES_CURSOR,
          USE_CASE_MESSAGES['semantic-search'],
          'Follow the /semantic-search skill for my use case.',
        ].join('\n')
      );
    });
  });

  describe('cli environment', () => {
    it('combines install lines and use-case message for general-search', () => {
      const result = buildPrompt('general-search', 'cli');
      expect(result).toBe([...INSTALL_LINES_CLI, USE_CASE_MESSAGES['general-search']].join('\n'));
      expect(result).toContain('npx skills');
      expect(result).not.toContain('Follow the /');
    });

    it('appends a skill line for a specific use case', () => {
      const result = buildPrompt('rag-chatbot', 'cli');
      expect(result).toBe(
        [
          ...INSTALL_LINES_CLI,
          USE_CASE_MESSAGES['rag-chatbot'],
          'Follow the /rag-chatbot skill for my use case.',
        ].join('\n')
      );
    });
  });

  describe('agent-builder environment', () => {
    it('returns only the use-case message for general-search', () => {
      expect(buildPrompt('general-search', 'agent-builder')).toBe(
        USE_CASE_MESSAGES['general-search']
      );
    });

    it('returns only the use-case message for a specific use case (no skill line)', () => {
      const result = buildPrompt('rag-chatbot', 'agent-builder');
      expect(result).toBe(USE_CASE_MESSAGES['rag-chatbot']);
      expect(result).not.toContain('skill');
    });
  });

  it('uses the same use-case message across all environments', () => {
    const useCaseId: UseCaseId = 'hybrid-search';
    const agentBuilderResult = buildPrompt(useCaseId, 'agent-builder');
    const cursorResult = buildPrompt(useCaseId, 'cursor');
    const cliResult = buildPrompt(useCaseId, 'cli');

    expect(cursorResult).toContain(agentBuilderResult);
    expect(cliResult).toContain(agentBuilderResult);
  });

  it('includes a skill reference for every non-general use case in cursor', () => {
    const specificUseCases: UseCaseId[] = [
      'semantic-search',
      'vector-database',
      'rag-chatbot',
      'keyword-search',
      'hybrid-search',
      'catalog-ecommerce',
    ];
    for (const id of specificUseCases) {
      expect(buildPrompt(id, 'cursor')).toContain(`/${id}`);
    }
  });

  it('throws for an unsupported environment', () => {
    expect(() => buildPrompt('general-search', 'unsupported' as Environment)).toThrow(
      'Unsupported environment: unsupported'
    );
  });
});
