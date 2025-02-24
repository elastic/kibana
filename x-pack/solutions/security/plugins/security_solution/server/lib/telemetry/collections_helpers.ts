/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Splits the list into a list of lists each not exceeding the given size.
 * The order of the elements is preserved.
 *
 * @param list - The list to split
 * @param size - The maximum size of each chunk
 *
 * @returns - The list of chunks
 */
export const chunked = function <T>(list: T[], size: number): T[][] {
  return chunkedBy(list, size, () => 1);
};

/**
 * Splits the list into a list of lists each not exceeding the given size.
 * The size of each element is determined by the weight function, that is called
 * for each element in the list.
 * The sum of the weights of the elements in each chunk will not exceed the given size.
 * The order of the elements is preserved.
 *
 * @param list - The list to split
 * @param size - The maximum size of each chunk
 * @param weight - The function that determines the weight of each element
 * @returns - The list of chunks
 */
export const chunkedBy = function <T>(list: T[], size: number, weight: (v: T) => number): T[][] {
  function chunk(acc: Chunked<T>, value: T): Chunked<T> {
    const currentWeight = weight(value);
    if (acc.weight + currentWeight <= size) {
      acc.current.push(value);
      acc.weight += currentWeight;
    } else {
      acc.chunks.push(acc.current);
      acc.current = [value];
      acc.weight = currentWeight;
    }
    return acc;
  }

  return list.reduce(chunk, new Chunked<T>()).flush();
};

/**
 * Helper class used internally.
 */
class Chunked<T> {
  public weight: number = 0;

  constructor(public chunks: T[][] = [], public current: T[] = []) {}

  public flush(): T[][] {
    if (this.current.length !== 0) {
      this.chunks.push(this.current);
      this.current = [];
    }
    return this.chunks.filter((chunk) => chunk.length > 0);
  }
}

export interface CommonPrefixesConfig {
  maxPrefixes: number;
  maxGroupSize: number;
  minPrefixSize: number;
}

interface TrieNode {
  char: string;
  prefix: string;
  children: { [key: string]: TrieNode };
  count: number;
  isEnd: boolean;
  id: number;
}

interface Group {
  parts: string[];
  indexCount: number;
}

function newTrieNode(char: string = '', prefix: string = '', id: number = 0): TrieNode {
  return {
    char,
    children: {},
    count: 0,
    id,
    isEnd: false,
    prefix,
  };
}

/**
 * Finds and groups common prefixes from a list of strings.
 *
 * @param {string[]} indices - An array of strings from which common prefixes will be extracted.
 * @param {CommonPrefixesConfig} config - A configuration object that defines the rules for grouping.
 *
 * The `config` object contains the following properties:
 *   - maxGroupSize {number}: The maximum number of indices allowed in a group.
 *   - maxPrefixes {number}: The maximum number of prefix groups to return.
 *   - minPrefixSize {number}: The minimum length of a prefix required to form a group. It avoid cases like returning
 *     a single character prefix, e.g., ['.ds-...1', '.ds-....2', ....] -> returns a single group '.'
 *
 * @returns {Group[]} - An array of groups where each group contains a list of prefix parts and the count of indices that share that prefix.
 *
 * Example usage:
 *
 * ```typescript
 * const indices = ['apple', 'appetizer', 'application', 'banana', 'band', 'bandage'];
 * const config = {
 *   maxGroupSize: 5,
 *   maxPrefixes: 3,
 *   minPrefixSize: 3
 * };
 *
 * const result = findCommonPrefixes(indices, config);
 * //result = [
 * //   { parts: [ 'ban' ], indexCount: 3 },
 * //   { parts: [ 'app' ], indexCount: 3 }
 * //]
 * ```
 */

export function findCommonPrefixes(indices: string[], config: CommonPrefixesConfig): Group[] {
  const idCounter = function* (): Generator<number, number, number> {
    let id = 0;
    while (true) {
      yield id++;
    }
  };

  const idGen = idCounter();

  const root = newTrieNode('', '', idGen.next().value);
  for (const index of indices) {
    let node = root;
    node.count++;
    for (const char of index) {
      if (!node.children[char]) {
        node.children[char] = newTrieNode(char, node.prefix + char, idGen.next().value);
      }
      node = node.children[char];
      node.count++;
    }
    node.isEnd = true;
  }

  const nodes = [root];
  const prefixes: Group[] = [];

  while (nodes.length > 0) {
    // eslint-disable-next-line  @typescript-eslint/no-non-null-assertion
    const node = nodes.pop()!;
    if (
      (node.count <= config.maxGroupSize && node.prefix.length >= config.minPrefixSize) ||
      (Object.keys(node.children).length === 0 && node.prefix.length >= config.minPrefixSize)
    ) {
      const group: Group = {
        parts: [node.prefix],
        indexCount: node.count,
      };
      prefixes.push(group);
    } else {
      for (const child of Object.values(node.children)) {
        nodes.push(child);
      }
    }
  }

  if (prefixes.length > config.maxPrefixes) {
    prefixes.sort((a, b) => a.indexCount - b.indexCount);

    while (prefixes.length > config.maxPrefixes) {
      // eslint-disable-next-line  @typescript-eslint/no-non-null-assertion
      const g1 = prefixes.shift()!;
      // eslint-disable-next-line  @typescript-eslint/no-non-null-assertion
      const g2 = prefixes.shift()!;
      const mergedGroup: Group = {
        parts: g1.parts.concat(g2.parts),
        indexCount: g1.indexCount + g2.indexCount,
      };
      prefixes.push(mergedGroup);
      prefixes.sort((a, b) => a.indexCount - b.indexCount);
    }
  }

  return prefixes;
}

/**
 * Splits an array of strings into chunks where the total length of strings in each chunk
 * does not exceed the specified `maxLength`.
 *
 * @param strings - An array of strings to be chunked.
 * @param maxLength - The maximum total length allowed for strings in each chunk. Defaults to 1024.
 * @returns A two-dimensional array where each inner array is a chunk of strings.
 *
 * @example
 * ```typescript
 * const strings = ["hello", "world", "this", "is", "a", "test"];
 * const chunks = chunkStringsByMaxLength(strings, 10);
 * console.log(chunks);
 * // Output: [["hello", "world"], ["this", "is"], ["a", "test"]]
 * ```
 */
export function chunkStringsByMaxLength(strings: string[], maxLength: number = 3072): string[][] {
  // plus 1 for the comma separator
  return chunkedBy(strings, maxLength, (index) => index.length + 1);
}
