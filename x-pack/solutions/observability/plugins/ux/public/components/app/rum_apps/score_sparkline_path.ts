/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface ScoreSparklinePoint {
  x: number;
  y: number;
}

const clampScore = (score: number): number => Math.min(100, Math.max(0, score));

/** Map scores onto a fixed 0–100 y domain. */
export const scoreSparklinePoints = (
  scores: number[],
  width: number,
  height: number,
  pad = 1
): ScoreSparklinePoint[] => {
  if (scores.length === 0 || width <= 0 || height <= 0) {
    return [];
  }
  const innerHeight = Math.max(1, height - pad * 2);
  return scores.map((score, index) => {
    const t = scores.length === 1 ? 0.5 : index / (scores.length - 1);
    return {
      x: t * width,
      y: pad + innerHeight - (clampScore(score) / 100) * innerHeight,
    };
  });
};

export const scoreSparklineLinePath = (points: ScoreSparklinePoint[]): string =>
  points
    .map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(' ');

export const scoreSparklineAreaPath = (points: ScoreSparklinePoint[], height: number): string => {
  if (points.length === 0) {
    return '';
  }
  const line = scoreSparklineLinePath(points);
  const first = points[0];
  const last = points[points.length - 1];
  return `${line} L${last.x.toFixed(2)} ${height} L${first.x.toFixed(2)} ${height} Z`;
};
