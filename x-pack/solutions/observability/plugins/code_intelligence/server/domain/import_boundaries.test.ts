/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

import ts from 'typescript';

/** Points boundary tests at the colocated domain source tree. */
const domainRoot = __dirname;

/** Identifies imports that would violate shared-package dependency direction. */
const isForbiddenSpecifier = (specifier: string): boolean =>
  /(?:^|\/)(?:\.\.\/)*private(?:\/|$)|(?:^|\/)cli(?:\/|$)|@kbn\/|kibana/.test(specifier);

/** Extracts static imports, export-from declarations, and dynamic import call specifiers. */
const importSpecifiers = (source: string): string[] => {
  /** Parses the source without executing it so dynamic imports are visible to boundary checks. */
  const file = ts.createSourceFile('boundary.ts', source, ts.ScriptTarget.Latest, true);
  /** Accumulates literal module specifiers from every dependency syntax form. */
  const specifiers: string[] = [];
  /** Walks syntax nodes because dynamic imports are call expressions, not import declarations. */
  const visit = (node: ts.Node): void => {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier !== undefined &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      specifiers.push(node.moduleSpecifier.text);
    }
    if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      node.arguments.length >= 1 &&
      ts.isStringLiteralLike(node.arguments[0])
    ) {
      // No-substitution template literals are as static as quoted strings and must cross the same gate.
      specifiers.push(node.arguments[0].text);
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  return specifiers;
};

/** Collects authored shared files while excluding tests from source inspection. */
const sourceFiles = async (directory: string): Promise<string[]> => {
  /** Node's recursive directory entries retain the parent needed to rebuild each source path. */
  const entries = await readdir(directory, { recursive: true, withFileTypes: true });
  return entries
    .filter(
      (entry) => entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts')
    )
    .map((entry) => join(entry.parentPath, entry.name));
};

describe('domain import boundary', () => {
  it('rejects static, export-from, and dynamic private traversal specifiers', () => {
    /** Combines every supported module-loading syntax into one parser fixture. */
    const source = [
      "import '../../private/code-intelligence/adapter';",
      "export { value } from '../../private/code-intelligence/value';",
      "await import('../../private/code-intelligence/lazy');",
      'await import(`../../private/code-intelligence/template-lazy`);',
      "await import('../../private/code-intelligence/options.json', { with: { type: 'json' } });",
      'await import(`../../private/code-intelligence/template-options.json`, { with: { type: "json" } });',
    ].join('\n');

    /** Captures the module paths extracted from the parser fixture. */
    const specifiers = importSpecifiers(source);
    expect(specifiers).toEqual([
      '../../private/code-intelligence/adapter',
      '../../private/code-intelligence/value',
      '../../private/code-intelligence/lazy',
      '../../private/code-intelligence/template-lazy',
      '../../private/code-intelligence/options.json',
      '../../private/code-intelligence/template-options.json',
    ]);
    expect(specifiers.every(isForbiddenSpecifier)).toBe(true);
  });

  it('does not depend on private, CLI, or Kibana import specifiers', async () => {
    /** Loads domain source text for import-boundary inspection. */
    const contents = await Promise.all(
      (await sourceFiles(domainRoot)).map((path) => readFile(path, 'utf8'))
    );

    for (const source of contents) {
      expect(importSpecifiers(source).some(isForbiddenSpecifier)).toBe(false);
    }
  });
});
