/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { Feature } from '@kbn/streams-schema';
import type { StreamsKnowledgeIndicatorsReader } from '@kbn/streams-plugin/server';
import { loadIdentityLinkRules, parseIdentityLinkRule } from './load_identity_link_rules';

const logger = { debug: jest.fn(), warn: jest.fn() } as unknown as Logger;

const makeFeature = (overrides: Partial<Feature> = {}): Feature =>
  ({
    uuid: 'uuid-1',
    id: 'user-github',
    stream_name: 'logs-github.audit-default',
    type: 'entity',
    subtype: 'user',
    title: 'github users',
    description: 'GitHub audit users with SSO email',
    properties: {
      identity_link_rule: {
        user_name_field: 'user.name',
        user_email_field: 'github.external_identity_nameid',
        namespace_hint: 'okta',
      },
    },
    confidence: 95,
    evidence: ['user.name', 'github.external_identity_nameid'],
    status: 'active',
    last_seen: '2026-06-10T00:00:00.000Z',
    ...overrides,
  } as Feature);

const makeReader = (features: Feature[]): StreamsKnowledgeIndicatorsReader => ({
  listEntityFeatures: jest.fn(async () => features),
  listDependencyFeatures: jest.fn(async () => []),
  listSchemaFeatures: jest.fn(async () => []),
  resolveIndexPatterns: jest.fn(async () => []),
});

describe('parseIdentityLinkRule', () => {
  beforeEach(() => jest.clearAllMocks());

  it('parses a well-formed rule, preserving field-name case and capturing the filter', () => {
    const rule = parseIdentityLinkRule(
      makeFeature({
        filter: { field: 'event.category', eq: 'iam' },
        properties: {
          identity_link_rule: {
            user_name_field: 'user.name',
            user_email_field: 'github.external_identity_nameid',
            namespace_hint: 'Okta',
          },
        },
      })
    );
    expect(rule).toEqual({
      userNameField: 'user.name',
      userEmailField: 'github.external_identity_nameid',
      namespaceHint: 'okta',
      filter: { field: 'event.category', eq: 'iam' },
      featureUuid: 'uuid-1',
      streamName: 'logs-github.audit-default',
      confidence: 95,
    });
  });

  it('omits namespaceHint and filter when not provided', () => {
    const rule = parseIdentityLinkRule(
      makeFeature({
        filter: undefined,
        properties: {
          identity_link_rule: { user_name_field: 'user.name', user_email_field: 'user.email' },
        },
      })
    );
    expect(rule?.namespaceHint).toBeUndefined();
    expect(rule?.filter).toBeUndefined();
  });

  it('returns undefined when identity_link_rule is missing', () => {
    expect(parseIdentityLinkRule(makeFeature({ properties: { name: 'x' } }))).toBeUndefined();
  });

  it('returns undefined when a field name is blank', () => {
    expect(
      parseIdentityLinkRule(
        makeFeature({
          properties: {
            identity_link_rule: { user_name_field: '', user_email_field: 'user.email' },
          },
        })
      )
    ).toBeUndefined();
    expect(
      parseIdentityLinkRule(
        makeFeature({
          properties: {
            identity_link_rule: { user_name_field: 'user.name', user_email_field: '  ' },
          },
        })
      )
    ).toBeUndefined();
  });

  it('returns undefined when both fields are identical (no link to make)', () => {
    expect(
      parseIdentityLinkRule(
        makeFeature({
          properties: {
            identity_link_rule: { user_name_field: 'user.name', user_email_field: 'user.name' },
          },
        })
      )
    ).toBeUndefined();
  });
});

describe('loadIdentityLinkRules', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns validated rules and pushes minConfidence into the reader', async () => {
    const reader = makeReader([makeFeature()]);
    const rules = await loadIdentityLinkRules(reader, { minConfidence: 90 }, logger);
    expect(reader.listEntityFeatures).toHaveBeenCalledWith({ minConfidence: 90 });
    expect(rules).toHaveLength(1);
    expect(rules[0].userEmailField).toBe('github.external_identity_nameid');
  });

  it('re-applies the confidence floor client-side', async () => {
    const reader = makeReader([
      makeFeature({ uuid: 'low', confidence: 50 }),
      makeFeature({ uuid: 'high', confidence: 99 }),
    ]);
    const rules = await loadIdentityLinkRules(reader, { minConfidence: 90 }, logger);
    expect(rules).toHaveLength(1);
    expect(rules[0].featureUuid).toBe('high');
  });

  it('skips malformed features without throwing', async () => {
    const reader = makeReader([
      makeFeature({ uuid: 'bad', properties: { name: 'x' } }),
      makeFeature({ uuid: 'good' }),
    ]);
    const rules = await loadIdentityLinkRules(reader, {}, logger);
    expect(rules).toHaveLength(1);
    expect(rules[0].featureUuid).toBe('good');
  });

  it('deduplicates by (stream, nameField, emailField), keeping the highest confidence', async () => {
    const reader = makeReader([
      makeFeature({ uuid: 'a', confidence: 80 }),
      makeFeature({ uuid: 'b', confidence: 95 }),
    ]);
    const rules = await loadIdentityLinkRules(reader, {}, logger);
    expect(rules).toHaveLength(1);
    expect(rules[0].featureUuid).toBe('b');
    expect(rules[0].confidence).toBe(95);
  });

  it('keeps distinct rules for different email fields on the same stream', async () => {
    const reader = makeReader([
      makeFeature({
        uuid: 'a',
        properties: {
          identity_link_rule: { user_name_field: 'user.name', user_email_field: 'user.email' },
        },
      }),
      makeFeature({
        uuid: 'b',
        properties: {
          identity_link_rule: {
            user_name_field: 'user.name',
            user_email_field: 'github.external_identity_nameid',
          },
        },
      }),
    ]);
    const rules = await loadIdentityLinkRules(reader, {}, logger);
    expect(rules).toHaveLength(2);
  });
});
