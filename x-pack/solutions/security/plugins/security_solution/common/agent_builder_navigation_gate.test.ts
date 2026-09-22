/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { agentBuilderDefaultAgentId } from '@kbn/agent-builder-common';

import {
  consumePreserveAgentBuilderSessionGate,
  markPreserveAgentBuilderSessionDuringNextSecurityNavigation,
  readLastAgentBuilderAgentIdForSecuritySession,
} from './agent_builder_navigation_gate';

describe('agent_builder_navigation_gate', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  it('consume returns false when not marked', () => {
    expect(consumePreserveAgentBuilderSessionGate()).toBe(false);
    expect(consumePreserveAgentBuilderSessionGate()).toBe(false);
  });

  it('consume returns true once after mark', () => {
    markPreserveAgentBuilderSessionDuringNextSecurityNavigation();
    expect(consumePreserveAgentBuilderSessionGate()).toBe(true);
    expect(consumePreserveAgentBuilderSessionGate()).toBe(false);
  });

  it('readLastAgentBuilderAgentIdForSecuritySession falls back to default', () => {
    expect(readLastAgentBuilderAgentIdForSecuritySession()).toBe(agentBuilderDefaultAgentId);
  });

  it('readLastAgentBuilderAgentIdForSecuritySession reads raw string from localStorage', () => {
    localStorage.setItem('agentBuilder.agentId', 'my-agent');
    expect(readLastAgentBuilderAgentIdForSecuritySession()).toBe('my-agent');
  });

  it('readLastAgentBuilderAgentIdForSecuritySession parses JSON-encoded string', () => {
    localStorage.setItem('agentBuilder.agentId', JSON.stringify('json-agent'));
    expect(readLastAgentBuilderAgentIdForSecuritySession()).toBe('json-agent');
  });
});
