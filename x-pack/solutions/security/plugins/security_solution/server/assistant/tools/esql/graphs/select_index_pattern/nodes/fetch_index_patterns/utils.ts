/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Splits string by '.' and '-' delimiters, including the delimiters in the result.
 * For example, "foo.bar-baz" will be split into ["foo.", "bar-", "baz"].
 */
function splitWithDelimiters(str: string): string[] {
  const result = [];
  let start = 0;

  for (let i = 0; i < str.length; i++) {
    if (str[i] === '.' || str[i] === '-') {
      result.push(str.slice(start, i + 1)); // Include the delimiter
      start = i + 1;
    }
  }

  if (start < str.length) {
    result.push(str.slice(start)); // Add last part if there's anything left
  }

  return result;
}

interface IndexNamePartNode {
  value: string;
  children?: IndexNamePartNode[];
}

/**
 * Builds a tree structure from an array of strings.
 */
export const buildTree = (indices: string[]): IndexNamePartNode => {
  const splitIndices = indices.map((index) => splitWithDelimiters(index));
  const root: IndexNamePartNode = { value: '', children: [] };

  for (const splitIndex of splitIndices) {
    let currentNode: IndexNamePartNode = root;
    for (const part of splitIndex) {
      let childNode = currentNode.children?.find((child) => child.value === part);
      if (!childNode) {
        childNode = { value: part, children: [] };
        currentNode.children?.push(childNode);
      }
      currentNode = childNode;
    }
  }
  return root;
};

interface Options {
  ignoreDigitParts?: boolean;
}

/**
 * Generates index patterns from a tree structure.
 * @param tree The root IndexNamePartNode of the tree structure.
 * @param options Options to customize the behavior of the function.
 * @returns
 */
export const getIndexPatterns = (
  tree: IndexNamePartNode,
  options?: Options
): {
  indexPatterns: string[];
  remainingIndices: string[];
} => {
  // This function will traverse the tree and generate index patterns.
  const stack: Array<{ node: IndexNamePartNode; prefix: string; indexPatternAdded: boolean }> = [
    { node: tree, prefix: '', indexPatternAdded: false },
  ];
  const indexPatterns: Set<string> = new Set();
  const remainingIndices: Set<string> = new Set();

  const ignoreDigitParts = Boolean(options?.ignoreDigitParts);

  while (stack.length > 0) {
    let indexPatternAdded = false;
    const next = stack.pop();

    if (!next) {
      break;
    }

    const { node, prefix, indexPatternAdded: parentIndexPatternAdded } = next;

    if (
      node.children &&
      node.children.length > 1 &&
      node.value !== '' &&
      (ignoreDigitParts ? !isNumber(node.value.replace('.', '').replace('-', '')) : true)
    ) {
      // If there are multiple children, we can create a wildcard pattern
      indexPatterns.add(`${prefix}${node.value}*`);
      indexPatternAdded = true;
    }

    if (node.children && node.children.length > 0) {
      for (const child of node.children) {
        stack.push({
          node: child,
          prefix: `${prefix}${node.value}`,
          indexPatternAdded: parentIndexPatternAdded || indexPatternAdded,
        });
      }
    } else {
      // If there are no children, we can create a specific index pattern
      if (!(parentIndexPatternAdded || indexPatternAdded)) {
        remainingIndices.add(`${prefix}${node.value}`);
      }
    }
  }

  return {
    indexPatterns: [...indexPatterns].filter((pattern) => pattern.includes('*')).sort(),
    remainingIndices: [...remainingIndices].sort(),
  };
};

function isNumber(str: string): boolean {
  return !isNaN(Number(str)) && !isNaN(parseFloat(str));
}
