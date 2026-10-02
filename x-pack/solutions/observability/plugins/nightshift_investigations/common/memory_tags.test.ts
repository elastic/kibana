/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  canonicalizeTag,
  canonicalizeTags,
  MAX_MEMORY_TAG_LENGTH,
  MAX_MEMORY_TAGS_PER_PAGE,
} from './memory_tags';

describe('canonicalizeTag', () => {
  it.each([
    ['Cart Cache', 'cart-cache'],
    ['cart cache', 'cart-cache'],
    ['cart_cache', 'cart-cache'],
    ['  cart   cache  ', 'cart-cache'],
    ['invoke_agent', 'invoke-agent'],
    ['Invoke Agent', 'invoke-agent'],
    ['agent - builder', 'agent-builder'],
    ['--trim--', 'trim'],
    ['ＮＴＰ', 'ntp'],
    ['a\tb\nc', 'a-b-c'],
  ])('folds %j into %j', (tag, expected) => {
    expect(canonicalizeTag(tag)).toBe(expected);
  });

  // The optimizer writes identifiers as the platform spells them, and folding a
  // separator inside one would produce a tag that matches nothing.
  it.each([
    ['gen_ai.conversation.id', 'gen_ai.conversation.id'],
    ['GEN_AI.CONVERSATION.ID', 'gen_ai.conversation.id'],
    ['traces-*', 'traces-*'],
    ['  traces-agent_builder.otel-default ', 'traces-agent_builder.otel-default'],
    ['ES|QL', 'es|ql'],
    ['anthropic/claude-sonnet-4.6', 'anthropic/claude-sonnet-4.6'],
    ['kibana.workflow_id', 'kibana.workflow_id'],
    ['  chat anthropic/claude-sonnet-4.6 ', 'chat anthropic/claude-sonnet-4.6'],
  ])('keeps the identifier %j as %j', (tag, expected) => {
    expect(canonicalizeTag(tag)).toBe(expected);
  });

  it.each([['', '   ', '-', '_', '---', ' - - ']])('rejects %j, which folds to nothing', (tag) => {
    expect(canonicalizeTag(tag)).toBeNull();
  });

  it('caps the canonical length', () => {
    const canonical = canonicalizeTag('a'.repeat(MAX_MEMORY_TAG_LENGTH + 40));
    expect(canonical).toHaveLength(MAX_MEMORY_TAG_LENGTH);
  });
});

describe('canonicalizeTags', () => {
  it('canonicalizes, drops empties, and dedupes in first-seen order', () => {
    expect(
      canonicalizeTags(['memory', 'Cart Cache', 'cart-cache', '', '   ', 'NTP', 'ntp'])
    ).toEqual(['memory', 'cart-cache', 'ntp']);
  });

  it('leaves a list with nothing usable empty rather than storing a blank tag', () => {
    expect(canonicalizeTags(['', '  ', undefined, null])).toEqual([]);
    expect(canonicalizeTags(undefined)).toEqual([]);
  });

  // The cap is the write layer's business: a read has to report every tag a
  // stored document carries, however many a pre-cap document accumulated.
  it('does not cap, so a stored document still reports all of its tags', () => {
    const stored = Array.from({ length: MAX_MEMORY_TAGS_PER_PAGE + 5 }, (_, i) => `tag-${i}`);
    expect(canonicalizeTags(stored)).toHaveLength(stored.length);
  });
});