/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface ScoreDocument {
  example?: { id?: string; index?: number; dataset?: { id?: string } };
  task?: { repetition_index?: number };
  evaluator?: { name?: string; score?: number | null; explanation?: string | null };
}

export interface FailedExample {
  example_id: string;
  example_index: number | null;
  dataset_id: string;
  repetition_index: number;
  score: number;
  explanation: string;
}

export interface FailureGroups {
  scored_examples: number;
  failed_examples: number;
  mean_score: number | null;
  failures: FailedExample[];
}

interface Repetition {
  repetition_index: number;
  score: number;
  explanation: string;
}

interface ExampleScores {
  example_id: string;
  example_index: number | null;
  dataset_id: string;
  repetitions: Repetition[];
}

const mean = (values: readonly number[]): number =>
  values.reduce((sum, value) => sum + value, 0) / values.length;

/**
 * Averages each example over its repetitions and returns the `maxFailures`
 * lowest examples below `threshold`, each with its worst repetition: that is
 * the answer the rewrite should learn from.
 */
export const groupFailures = ({
  scores,
  evaluator,
  threshold,
  maxFailures,
}: {
  scores: readonly ScoreDocument[];
  evaluator: string;
  threshold: number;
  maxFailures: number;
}): FailureGroups => {
  const byExample = new Map<string, ExampleScores>();
  const usable = scores.flatMap((doc) => {
    const score = doc.evaluator?.score;
    const exampleId = doc.example?.id;
    const datasetId = doc.example?.dataset?.id;
    const ok =
      doc.evaluator?.name === evaluator &&
      typeof score === 'number' &&
      Number.isFinite(score) &&
      exampleId &&
      datasetId;
    return ok ? [{ doc, score, exampleId, datasetId }] : [];
  });
  for (const { doc, score, exampleId, datasetId } of usable) {
    const entry = byExample.get(exampleId) ?? {
      example_id: exampleId,
      example_index: typeof doc.example?.index === 'number' ? doc.example.index : null,
      dataset_id: datasetId,
      repetitions: [],
    };
    entry.repetitions.push({
      repetition_index: doc.task?.repetition_index ?? 0,
      score,
      explanation: doc.evaluator?.explanation ?? '',
    });
    byExample.set(exampleId, entry);
  }

  const examples = [...byExample.values()].map((entry) => ({
    ...entry,
    mean: mean(entry.repetitions.map(({ score }) => score)),
  }));
  const failed = examples
    .filter((entry) => entry.mean < threshold)
    .sort((a, b) => a.mean - b.mean || a.example_id.localeCompare(b.example_id));

  return {
    scored_examples: examples.length,
    failed_examples: failed.length,
    mean_score: examples.length ? mean(examples.map((entry) => entry.mean)) : null,
    failures: failed.slice(0, maxFailures).map((entry) => {
      const worst = entry.repetitions.reduce((low, rep) =>
        rep.score < low.score ||
        (rep.score === low.score && rep.repetition_index < low.repetition_index)
          ? rep
          : low
      );
      return {
        example_id: entry.example_id,
        example_index: entry.example_index,
        dataset_id: entry.dataset_id,
        repetition_index: worst.repetition_index,
        score: entry.mean,
        explanation: worst.explanation,
      };
    }),
  };
};

// Judges that compare against a reference tend to name it when they quote it.
const REFERENCE_PATTERN = /\b(reference|expected|ground[ -]truth|gold(en)?)\b/i;

export const mentionsReference = (explanation: string): boolean =>
  REFERENCE_PATTERN.test(explanation);

/** A message field when there is one (the shape captured examples and variant tasks use), else JSON. */
export const toText = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && 'message' in value) {
    const { message } = value as { message?: unknown };
    if (typeof message === 'string') return message;
  }
  return JSON.stringify(value);
};

export const truncate = (text: string, maxChars: number): string =>
  text.length <= maxChars ? text : `${text.slice(0, maxChars)}… [cut]`;

export interface RenderedFailure {
  example_id: string;
  score: number;
  question: string;
  answer: string;
  explanation: string;
}

export const toMarkdown = (failures: readonly RenderedFailure[]): string =>
  failures
    .map(
      (failure, position) =>
        `### Failure ${position + 1} (score ${failure.score.toFixed(2)})\n\n` +
        `**Question**\n\n${failure.question || '(missing)'}\n\n` +
        `**Agent answer**\n\n${failure.answer || '(missing)'}\n\n` +
        `**Judge explanation**\n\n${failure.explanation || '(none)'}`
    )
    .join('\n\n');
