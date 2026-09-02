/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { convertTinesPathReference, convertTinesTemplate } from './template';
import { slugifyStepName } from './slugify_step_name';

describe('slugifyStepName', () => {
  it('slugifies Tines agent display names', () => {
    expect(slugifyStepName('Explode users')).toBe('explode_users');
    expect(slugifyStepName('Receive events')).toBe('receive_events');
    expect(slugifyStepName('  ')).toBe('step');
  });
});

describe('convertTinesTemplate', () => {
  it('converts Tines template references to Liquid step output references', () => {
    const agentNameToStepName = new Map<string, string>([
      ['explode_users', 'explode_users'],
      ['receive_events', 'receive_events'],
    ]);

    const warnings: string[] = [];
    const result = convertTinesTemplate(
      'User: <<explode_users.user.name>> from <<receive_events.type>>',
      agentNameToStepName,
      warnings
    );

    expect(result).toBe(
      'User: {{ steps.explode_users.output.user.name }} from {{ steps.receive_events.output.type }}'
    );
    expect(warnings).toHaveLength(0);
  });

  it('records warnings for unresolved agent references while still converting', () => {
    const warnings: string[] = [];
    const result = convertTinesTemplate('Value <<unknown_agent.field>>', new Map(), warnings);

    expect(result).toBe('Value {{ steps.unknown_agent.output.field }}');
    expect(warnings).toEqual(['Unresolved Tines template reference: <<unknown_agent.field>>']);
  });

  it('resolves display-name map keys via slugification', () => {
    const agentNameToStepName = new Map<string, string>([['Explode users', 'explode_users']]);
    const warnings: string[] = [];

    const result = convertTinesTemplate(
      '<<explode_users.user.name>>',
      agentNameToStepName,
      warnings
    );

    expect(result).toBe('{{ steps.explode_users.output.user.name }}');
    expect(warnings).toHaveLength(0);
  });
});

describe('convertTinesPathReference', () => {
  it('converts formula path references used by explode agents', () => {
    const agentNameToStepName = new Map<string, string>([['receive_events', 'receive_events']]);

    expect(convertTinesPathReference('=receive_events.users', agentNameToStepName)).toBe(
      '{{ steps.receive_events.output.users }}'
    );
    expect(convertTinesPathReference('receive_events.users', agentNameToStepName)).toBe(
      '{{ steps.receive_events.output.users }}'
    );
  });
});
