/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { parse } from '@babel/parser';
import type { CallExpression, Node } from '@babel/types';

// AST keys that hold source metadata rather than child nodes.
const NON_CHILD_KEYS = new Set([
  'loc',
  'start',
  'end',
  'extra',
  'comments',
  'leadingComments',
  'trailingComments',
  'innerComments',
  'tokens',
]);

const isAstNode = (value: unknown): value is Node =>
  typeof value === 'object' && value !== null && 'type' in value && typeof value.type === 'string';

const isStepCall = (node: Node): node is CallExpression =>
  node.type === 'CallExpression' &&
  node.callee.type === 'Identifier' &&
  node.callee.name === 'step';

const forEachNode = (node: Node, visit: (node: Node) => void): void => {
  visit(node);
  Object.entries(node).forEach(([key, value]) => {
    if (NON_CHILD_KEYS.has(key)) {
      return;
    }
    const children: unknown[] = Array.isArray(value) ? value : [value];
    children.filter(isAstNode).forEach((child) => forEachNode(child, visit));
  });
};

/**
 * Returns why a browser inline script cannot run, or undefined when it looks runnable.
 * The script is parsed only, never executed.
 */
export const getInlineScriptError = (script: string): string | undefined => {
  let program: Node;
  try {
    program = parse(script, {
      sourceType: 'unambiguous',
      allowAwaitOutsideFunction: true,
    }).program;
  } catch (error) {
    return i18n.translate('xpack.synthetics.server.monitors.invalidInlineScriptSyntaxError', {
      defaultMessage: 'The script has a syntax error: {message}',
      values: { message: error instanceof Error ? error.message : String(error) },
    });
  }

  // The browser runner calls step callbacks without arguments, so destructuring one always throws.
  // API monitors do receive arguments, so this check only applies to browser scripts.
  let stepArgumentError: string | undefined;
  forEachNode(program, (node) => {
    if (stepArgumentError || !isStepCall(node)) {
      return;
    }
    const [nameArgument, callback] = node.arguments;
    if (callback?.type !== 'ArrowFunctionExpression' && callback?.type !== 'FunctionExpression') {
      return;
    }
    const [firstParam] = callback.params;
    if (firstParam?.type !== 'ObjectPattern' && firstParam?.type !== 'ArrayPattern') {
      return;
    }
    const stepName = nameArgument?.type === 'StringLiteral' ? nameArgument.value : '';
    stepArgumentError = i18n.translate(
      'xpack.synthetics.server.monitors.invalidInlineScriptStepArgumentError',
      {
        defaultMessage:
          'Step "{stepName}" destructures an argument, but browser step callbacks are called without one.',
        values: { stepName },
      }
    );
  });

  return stepArgumentError;
};
