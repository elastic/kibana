/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { Feature } from '@kbn/streams-schema';
import type { StreamsKnowledgeIndicatorsReader } from '@kbn/streams-plugin/server';
import { loadEntityResolutionClues, parseIdentityLinkClue } from './load_entity_resolution_clues';

const logger = { debug: jest.fn(), warn: jest.fn() } as unknown as Logger;

const makeFeature = (overrides: Partial<Feature> = {}): Feature =>
  ({
    uuid: 'uuid-1',
    id: 'user-jdoe',
    stream_name: 'logs-windows.default',
    type: 'entity',
    subtype: 'user',
    title: 'jdoe',
    description: 'Endpoint user jdoe',
    properties: {
      name: 'jdoe',
      identity_link: {
        user_name: 'jdoe',
        user_email: 'john.doe@corp.com',
        namespace_hint: 'okta',
      },
    },
    confidence: 95,
    evidence: ['user.name=jdoe', 'user.email=john.doe@corp.com'],
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

describe('parseIdentityLinkClue', () => {
  beforeEach(() => jest.clearAllMocks());

  it('parses and lower-cases a well-formed identity_link', () => {
    const clue = parseIdentityLinkClue(
      makeFeature({
        properties: {
          identity_link: {
            user_name: 'JDoe',
            user_email: 'John.Doe@Corp.com',
            namespace_hint: 'Okta',
          },
        },
      })
    );
    expect(clue).toEqual({
      userName: 'jdoe',
      userEmail: 'john.doe@corp.com',
      namespaceHint: 'okta',
      featureUuid: 'uuid-1',
      streamName: 'logs-windows.default',
      confidence: 95,
    });
  });

  it('omits namespaceHint when not provided', () => {
    const clue = parseIdentityLinkClue(
      makeFeature({
        properties: {
          identity_link: { user_name: 'jdoe', user_email: 'john.doe@corp.com' },
        },
      })
    );
    expect(clue?.namespaceHint).toBeUndefined();
  });

  it('returns undefined when identity_link is missing', () => {
    expect(parseIdentityLinkClue(makeFeature({ properties: { name: 'jdoe' } }))).toBeUndefined();
  });

  it('returns undefined when user_name or user_email is blank', () => {
    expect(
      parseIdentityLinkClue(
        makeFeature({ properties: { identity_link: { user_name: '', user_email: 'a@b.com' } } })
      )
    ).toBeUndefined();
    expect(
      parseIdentityLinkClue(
        makeFeature({ properties: { identity_link: { user_name: 'jdoe', user_email: '   ' } } })
      )
    ).toBeUndefined();
  });

  it('returns undefined when email has no @', () => {
    expect(
      parseIdentityLinkClue(
        makeFeature({
          properties: { identity_link: { user_name: 'jdoe', user_email: 'not-an-email' } },
        })
      )
    ).toBeUndefined();
  });
});

describe('loadEntityResolutionClues', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns validated clues and pushes minConfidence into the reader', async () => {
    const reader = makeReader([makeFeature()]);
    const clues = await loadEntityResolutionClues(reader, { minConfidence: 90 }, logger);
    expect(reader.listEntityFeatures).toHaveBeenCalledWith({ minConfidence: 90 });
    expect(clues).toHaveLength(1);
    expect(clues[0].userEmail).toBe('john.doe@corp.com');
  });

  it('re-applies the confidence floor client-side (defensive against non-filtering readers)', async () => {
    const reader = makeReader([
      makeFeature({ uuid: 'low', confidence: 50 }),
      makeFeature({ uuid: 'high', confidence: 99 }),
    ]);
    const clues = await loadEntityResolutionClues(reader, { minConfidence: 90 }, logger);
    expect(clues).toHaveLength(1);
    expect(clues[0].featureUuid).toBe('high');
  });

  it('skips malformed features without throwing', async () => {
    const reader = makeReader([
      makeFeature({ uuid: 'bad', properties: { name: 'jdoe' } }),
      makeFeature({ uuid: 'good' }),
    ]);
    const clues = await loadEntityResolutionClues(reader, {}, logger);
    expect(clues).toHaveLength(1);
    expect(clues[0].featureUuid).toBe('good');
  });

  it('deduplicates by (userName, userEmail), keeping the highest confidence', async () => {
    const reader = makeReader([
      makeFeature({ uuid: 'a', confidence: 80 }),
      makeFeature({ uuid: 'b', confidence: 95 }),
    ]);
    const clues = await loadEntityResolutionClues(reader, {}, logger);
    expect(clues).toHaveLength(1);
    expect(clues[0].featureUuid).toBe('b');
    expect(clues[0].confidence).toBe(95);
  });

  it('keeps distinct clues for the same userName with different emails (caller resolves ambiguity)', async () => {
    const reader = makeReader([
      makeFeature({
        uuid: 'a',
        properties: { identity_link: { user_name: 'jdoe', user_email: 'a@corp.com' } },
      }),
      makeFeature({
        uuid: 'b',
        properties: { identity_link: { user_name: 'jdoe', user_email: 'b@corp.com' } },
      }),
    ]);
    const clues = await loadEntityResolutionClues(reader, {}, logger);
    expect(clues).toHaveLength(2);
    expect(new Set(clues.map((c) => c.userEmail))).toEqual(new Set(['a@corp.com', 'b@corp.com']));
  });
});
