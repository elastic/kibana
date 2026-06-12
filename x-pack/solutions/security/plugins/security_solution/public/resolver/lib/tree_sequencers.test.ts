/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ResolverNode } from '../../../common/endpoint/types';
import type { TreeNode } from '../../../common/endpoint/generate_data';
import { EndpointDocGenerator } from '../../../common/endpoint/generate_data';
import { calculateGenerationsAndDescendants } from './tree_sequencers';
import { nodeID } from '../../../common/endpoint/models/node';
import { genResolverNode, generateTree, convertEventToResolverNode } from '../mocks/generator';

describe('calculateGenerationsAndDescendants', () => {
  const childrenOfNode = (childrenByParent: Map<string, Map<string, TreeNode>>) => {
    return (parentNode: ResolverNode): ResolverNode[] => {
      const id = nodeID(parentNode);
      if (!id) {
        return [];
      }

      return Array.from(childrenByParent.get(id)?.values() ?? []).map((node: TreeNode) => {
        return convertEventToResolverNode(node.lifecycle[0]);
      });
    };
  };

  let generator: EndpointDocGenerator;
  beforeEach(() => {
    generator = new EndpointDocGenerator('resolver');
  });

  it('returns zero generations and descendants for a node with no children', () => {
    const node = genResolverNode(generator);
    const { generations, descendants } = calculateGenerationsAndDescendants({
      node,
      currentLevel: 0,
      totalDescendants: 0,
      children: (parentNode: ResolverNode): ResolverNode[] => [],
    });
    expect(generations).toBe(0);
    expect(descendants).toBe(0);
  });

  it('returns one generation and one descendant for a node with one child', () => {
    const tree = generateTree({ generations: 1, children: 1 });
    const { generations, descendants } = calculateGenerationsAndDescendants({
      node: convertEventToResolverNode(tree.generatedTree.origin.lifecycle[0]),
      currentLevel: 0,
      totalDescendants: 0,
      children: childrenOfNode(tree.generatedTree.childrenByParent),
    });

    expect(generations).toBe(1);
    expect(descendants).toBe(1);
  });

  it('returns 2 generations and 12 descendants for a graph that has 2 generations and three children per node', () => {
    const tree = generateTree({ generations: 2, children: 3 });
    const { generations, descendants } = calculateGenerationsAndDescendants({
      node: convertEventToResolverNode(tree.generatedTree.origin.lifecycle[0]),
      currentLevel: 0,
      totalDescendants: 0,
      children: childrenOfNode(tree.generatedTree.childrenByParent),
    });
    expect(generations).toBe(2);
    expect(descendants).toBe(12);
  });

  describe('graph with 3 generations and 7 descendants and weighted on the left', () => {
    let childrenByParent: Map<string, ResolverNode[]>;
    let origin: ResolverNode;
    beforeEach(() => {
      /**
       * Build a tree that looks like this
       *  .
          └── origin
              ├── a
              ├── b
              │   └── d
              └── c
                  ├── e
                  └── f
                      └── g
       */

      origin = genResolverNode(generator, { entityID: 'origin' });
      const a = genResolverNode(generator, { entityID: 'a', parentEntityID: String(origin.id) });
      const b = genResolverNode(generator, { entityID: 'b', parentEntityID: String(origin.id) });
      const d = genResolverNode(generator, { entityID: 'd', parentEntityID: String(b.id) });
      const c = genResolverNode(generator, { entityID: 'c', parentEntityID: String(origin.id) });
      const e = genResolverNode(generator, { entityID: 'e', parentEntityID: String(c.id) });
      const f = genResolverNode(generator, { entityID: 'f', parentEntityID: String(c.id) });
      const g = genResolverNode(generator, { entityID: 'g', parentEntityID: String(f.id) });

      childrenByParent = new Map([
        ['origin', [a, b, c]],
        ['a', []],
        ['b', [d]],
        ['c', [e, f]],
        ['d', []],
        ['e', []],
        ['f', [g]],
        ['g', []],
      ]);
    });
    it('returns 3 generations and 7 descendants', () => {
      const { generations, descendants } = calculateGenerationsAndDescendants({
        node: origin,
        currentLevel: 0,
        totalDescendants: 0,
        children: (parent: ResolverNode): ResolverNode[] => {
          const id = nodeID(parent);
          if (!id) {
            return [];
          }

          return childrenByParent.get(id) ?? [];
        },
      });

      expect(generations).toBe(3);
      expect(descendants).toBe(7);
    });
  });

  describe('graph with 3 generations and 7 descendants and weighted on the right', () => {
    let childrenByParent: Map<string, ResolverNode[]>;
    let origin: ResolverNode;
    beforeEach(() => {
      /**
       * Build a tree that looks like this
        .
        └── origin
            ├── a
            │   ├── d
            │   │   └── f
            │   └── e
            ├── b
            │   └── g
            └── c
       */

      origin = genResolverNode(generator, { entityID: 'origin' });
      const a = genResolverNode(generator, { entityID: 'a', parentEntityID: String(origin.id) });
      const d = genResolverNode(generator, { entityID: 'd', parentEntityID: String(a.id) });
      const f = genResolverNode(generator, { entityID: 'f', parentEntityID: String(d.id) });
      const e = genResolverNode(generator, { entityID: 'e', parentEntityID: String(a.id) });
      const b = genResolverNode(generator, { entityID: 'b', parentEntityID: String(origin.id) });
      const g = genResolverNode(generator, { entityID: 'g', parentEntityID: String(b.id) });
      const c = genResolverNode(generator, { entityID: 'c', parentEntityID: String(origin.id) });

      childrenByParent = new Map([
        ['origin', [a, b, c]],
        ['a', [d, e]],
        ['b', [g]],
        ['c', []],
        ['d', [f]],
        ['e', []],
        ['f', []],
        ['g', []],
      ]);
    });
    it('returns 3 generations and 7 descendants', () => {
      const { generations, descendants } = calculateGenerationsAndDescendants({
        node: origin,
        currentLevel: 0,
        totalDescendants: 0,
        children: (parent: ResolverNode): ResolverNode[] => {
          const id = nodeID(parent);
          if (!id) {
            return [];
          }

          return childrenByParent.get(id) ?? [];
        },
      });

      expect(generations).toBe(3);
      expect(descendants).toBe(7);
    });
  });
});
