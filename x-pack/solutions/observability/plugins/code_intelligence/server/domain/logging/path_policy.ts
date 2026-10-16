/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Directory fragments that identify test, generated, dependency, or automation source. */
const excludedDirectoryFragments: readonly string[] = [
  '/test/',
  '/tests/',
  '/spec/',
  '/__tests__/',
  '/__mocks__/',
  '/e2e/',
  '/cypress/',
  '/fixtures/',
  '/benchmark/',
  '/benchmarks/',
  '/generated/',
  '/gen/',
  '/node_modules/',
  '/vendor/',
  '/third_party/',
  '/dist/',
  '/build/',
  '/target/',
  '/coverage/',
  '/.github/',
  '/.gitlab/',
  '/.buildkite/',
  '/.ci/',
  '/docs/',
  '/documentation/',
  '/internalclustertest/',
  '/integtest/',
  '/javaresttest/',
  '/yamlresttest/',
  '/test-fixtures/',
  '/gradle/',
] as const;

/** File-name fragments that identify non-production source. */
const excludedPathFragments: readonly string[] = [
  '.test.',
  '.spec.',
  '_test.',
  '_spec.',
  '.generated.',
  '.gen.',
  '.min.',
  '.snap.',
] as const;

/** File suffixes that identify prose, build tooling, or generated artifacts. */
const excludedSuffixes: readonly string[] = [
  '.md',
  '.mdx',
  '.rst',
  '.adoc',
  '.txt',
  '.sh',
  '.bash',
  '.zsh',
  '.ps1',
  '.mk',
  '.gradle',
  '.gradle.kts',
  '.map',
  '.lock',
  '.min.js',
  '_test.go',
] as const;

/** JVM test-class naming convention, intentionally case-sensitive. */
const jvmTestClassPattern: RegExp =
  /(?:Test|Tests|IT|IntegTests|BenchmarkTests)\.(?:java|kt|scala|groovy)$/;
/** Root GitLab CI files and directories are automation rather than runtime source. */
const rootGitlabCiPattern: RegExp = /^\/\.gitlab-ci(?:[./]|$)/;

/** Returns whether a repository-relative path cannot contain a production emission. */
export const isExcludedLoggingPath = (path: string): boolean => {
  /** Normalized path supports consistent case-insensitive policy checks. */
  const normalizedPath: string = path.toLowerCase();
  /** Leading slash makes a root file comparable with directory fragments. */
  const anchoredPath: string = `/${normalizedPath}`;

  return (
    jvmTestClassPattern.test(path) ||
    rootGitlabCiPattern.test(anchoredPath) ||
    excludedDirectoryFragments.some((fragment) => `${anchoredPath}/`.includes(fragment)) ||
    excludedPathFragments.some((fragment) => normalizedPath.includes(fragment)) ||
    excludedSuffixes.some((suffix) => anchoredPath.endsWith(suffix)) ||
    anchoredPath.endsWith('/makefile') ||
    anchoredPath.endsWith('/dockerfile')
  );
};
