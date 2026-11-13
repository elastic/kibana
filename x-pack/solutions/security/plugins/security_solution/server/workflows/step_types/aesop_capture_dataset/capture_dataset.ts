/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface CapturedExample {
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface CapturedRound {
  id: string;
  status?: string;
  input?: { message?: string };
  response?: { message?: string };
}

export interface CapturedConversation {
  id: string;
  agent_id?: string;
  rounds?: CapturedRound[];
}

const tokenize = (text: string): Set<string> =>
  new Set(
    text
      .toLowerCase()
      .split(/[^\p{L}\p{N}]+/u)
      .filter((token) => token.length > 0)
  );

export const jaccard = (a: string, b: string): number => {
  const left = tokenize(a);
  const right = tokenize(b);
  if (left.size === 0 && right.size === 0) return 1;
  let shared = 0;
  for (const token of left) {
    if (right.has(token)) shared += 1;
  }
  return shared / (left.size + right.size - shared);
};

const messageOf = (example: CapturedExample): string => {
  const message = example.input?.message;
  return typeof message === 'string' ? message : '';
};

/** One example per completed round that has both a user and an assistant message. */
export const conversationToExamples = (conversation: CapturedConversation): CapturedExample[] =>
  (conversation.rounds ?? []).flatMap((round) => {
    const question = round.input?.message?.trim();
    const answer = round.response?.message?.trim();
    if (round.status !== 'completed' || !question || !answer) return [];
    return [
      {
        input: { message: question },
        output: { message: answer },
        metadata: {
          source: 'aesop-capture',
          conversation_id: conversation.id,
          round_id: round.id,
          ...(conversation.agent_id ? { agent_id: conversation.agent_id } : {}),
        },
      },
    ];
  });

/**
 * Keeps a captured example only when its input is below the threshold against
 * every existing example and every example already kept.
 */
export const dedupeExamples = ({
  existing,
  captured,
  threshold,
}: {
  existing: CapturedExample[];
  captured: CapturedExample[];
  threshold: number;
}): { kept: CapturedExample[]; skipped: number } => {
  const seen = existing.map(messageOf);
  const kept: CapturedExample[] = [];
  for (const example of captured) {
    const message = messageOf(example);
    const isDuplicate = seen.some((other) => jaccard(message, other) >= threshold);
    if (!isDuplicate) {
      seen.push(message);
      kept.push(example);
    }
  }
  return { kept, skipped: captured.length - kept.length };
};
