/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isExcludedLoggingPath } from './path_policy';

/** Verifies logging discovery excludes JVM test suites and CI/build-only source locations. */
describe('isExcludedLoggingPath', () => {
  it.each([
    'server/src/internalClusterTest/java/App.java',
    'server/src/integTest/java/App.java',
    'server/src/javaRestTest/java/App.java',
    'server/src/yamlRestTest/java/App.java',
    'server/test-fixtures/src/App.java',
    'server/gradle/build.gradle.kts',
    '.ci/scripts/check.ts',
    '.gitlab-ci.yml',
    '.gitlab-ci/build/check.ts',
    'documentation/examples/adapter/adapter.go',
    'spec/models/payment_spec.rb',
    'lib/payment_spec.rb',
    'lib/payment_spec.ts',
  ])('excludes non-production path %s', (path) => {
    expect(isExcludedLoggingPath(path)).toBe(true);
  });

  it('keeps similarly named production paths', () => {
    expect(isExcludedLoggingPath('src/gradle_adapter.ts')).toBe(false);
    expect(isExcludedLoggingPath('src/specification.rb')).toBe(false);
    expect(isExcludedLoggingPath('src/special_handler.ts')).toBe(false);
  });
});
