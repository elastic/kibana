/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { spawnSync } from 'node:child_process';

import { loggingIdiomPatterns } from './idiom_patterns';

/** Returns whether any Git ERE idiom matches one complete source line. */
const matchesAnyIdiom = (source: string): boolean =>
  loggingIdiomPatterns.some(
    (pattern) =>
      spawnSync('grep', ['-E', pattern], { encoding: 'utf8', input: source }).status === 0
  );

/** Verifies every standard logging idiom is accepted by the Git ERE-compatible grep implementation. */
describe('loggingIdiomPatterns', () => {
  it.each(loggingIdiomPatterns)(
    'compiles %s with grep -E through argv-safe arguments',
    (pattern) => {
      /** Runs grep without shell interpolation so metacharacters remain part of the ERE argument. */
      const result = spawnSync('grep', ['-E', pattern], { encoding: 'utf8', input: '' });

      expect(result.error).toBeUndefined();
      // Empty input exits 1; only 2 denotes an ERE compilation failure.
      expect(result.status).not.toBe(2);
    }
  );

  it.each([
    'logger.exception("payment failed")',
    'logging.exception("payment failed")',
    'logging.getLogger(__name__).exception("payment failed")',
  ])('matches the Python exception emission %s', (source) => {
    expect(matchesAnyIdiom(source)).toBe(true);
  });

  it.each([
    'col.service.Logger().Warn("reload failed")',
    'a.logger.With("component", "adapter").Error("failed")',
  ])('matches the fluent or accessor emission %s', (source) => {
    expect(matchesAnyIdiom(source)).toBe(true);
  });

  it.each([
    'catalogService.metrics.Error("not a logger")',
    'logqlmodel.NewParseError("constructor")',
    'getLogger().info("build tooling")',
    'getLog().debug("build tooling")',
  ])('does not overmatch the non-logger shape %s', (source) => {
    expect(matchesAnyIdiom(source)).toBe(false);
  });
});
