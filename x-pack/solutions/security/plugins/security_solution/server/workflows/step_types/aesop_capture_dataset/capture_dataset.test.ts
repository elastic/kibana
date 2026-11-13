/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CapturedConversation } from './capture_dataset';
import { conversationToExamples, dedupeExamples, jaccard } from './capture_dataset';

const example = (message: string) => ({ input: { message } });

describe('jaccard', () => {
  it('is 1 for identical token sets regardless of case and punctuation', () => {
    expect(jaccard('Why is the alert open?', 'why is THE alert open')).toBe(1);
  });

  it('is the shared share of the token union', () => {
    expect(jaccard('a b c d', 'a b e f')).toBeCloseTo(2 / 6);
  });

  it('is 0 for disjoint text and 1 for two empty strings', () => {
    expect(jaccard('alpha', 'beta')).toBe(0);
    expect(jaccard('', '!!')).toBe(1);
  });
});

describe('conversationToExamples', () => {
  const conversation: CapturedConversation = {
    id: 'conv-1',
    agent_id: 'agent-1',
    rounds: [
      {
        id: 'r1',
        status: 'completed',
        input: { message: ' triage this ' },
        response: { message: 'done' },
      },
      { id: 'r2', status: 'in_progress', input: { message: 'q' }, response: { message: 'a' } },
      { id: 'r3', status: 'completed', input: { message: 'q' }, response: { message: '  ' } },
      { id: 'r4', status: 'completed', input: { message: '' }, response: { message: 'a' } },
    ],
  };

  it('maps only completed rounds that have both messages', () => {
    expect(conversationToExamples(conversation)).toEqual([
      {
        input: { message: 'triage this' },
        output: { message: 'done' },
        metadata: {
          source: 'aesop-capture',
          conversation_id: 'conv-1',
          round_id: 'r1',
          agent_id: 'agent-1',
        },
      },
    ]);
  });

  it('omits agent_id when the conversation has none and tolerates missing rounds', () => {
    expect(conversationToExamples({ id: 'c' })).toEqual([]);
    const [mapped] = conversationToExamples({ ...conversation, agent_id: undefined });
    expect(mapped.metadata).not.toHaveProperty('agent_id');
  });
});

describe('dedupeExamples', () => {
  it('drops captured examples at or above the threshold against existing ones', () => {
    const { kept, skipped } = dedupeExamples({
      existing: [example('why is the alert open')],
      captured: [example('Why is the alert open?'), example('list all rules')],
      threshold: 0.8,
    });
    expect(kept).toEqual([example('list all rules')]);
    expect(skipped).toBe(1);
  });

  it('drops near-duplicates inside the captured batch, keeping the first', () => {
    const { kept, skipped } = dedupeExamples({
      existing: [],
      captured: [example('a b c d e'), example('a b c d e'), example('x y z')],
      threshold: 0.8,
    });
    expect(kept).toEqual([example('a b c d e'), example('x y z')]);
    expect(skipped).toBe(1);
  });

  it('keeps an example just below the threshold', () => {
    const { kept } = dedupeExamples({
      existing: [example('a b c d')],
      captured: [example('a b c e')],
      threshold: 0.8,
    });
    expect(kept).toHaveLength(1);
  });
});
