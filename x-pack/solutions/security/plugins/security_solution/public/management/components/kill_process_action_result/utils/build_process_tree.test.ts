/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildProcessTree } from './build_process_tree';
import type { KilledProcessDescendant } from '../../../../../common/endpoint/types';

describe('buildProcessTree()', () => {
  let descendants: KilledProcessDescendant[];

  beforeEach(() => {
    descendants = [
      {
        pid: 456,
        parent_pid: 234,
        entity_id: 'ksuqwn8364fnbks.456',
        parent_entity_id: 'ksuqwn8364fnbks.234',
        command: '456_command.exe',
        was_killed: true,
      },
      {
        pid: 567,
        parent_pid: 456,
        entity_id: 'ksuqwn8364fnbks.567',
        parent_entity_id: 'ksuqwn8364fnbks.456',
        command: '567_command.exe',
        was_killed: true,
      },
      {
        pid: 5671,
        parent_pid: 567,
        entity_id: 'ksuqwn8364fnbks.5671',
        parent_entity_id: 'ksuqwn8364fnbks.567',
        command: '5671_command.exe',
        was_killed: true,
      },
      {
        pid: 56711,
        parent_pid: 5671,
        entity_id: 'ksuqwn8364fnbks.56711',
        parent_entity_id: 'ksuqwn8364fnbks.5671',
        command: '56711_command.exe',
        was_killed: true,
      },
      {
        pid: 56712,
        parent_pid: 5671,
        entity_id: 'ksuqwn8364fnbks.56712',
        parent_entity_id: 'ksuqwn8364fnbks.5671',
        command: '56712_command.exe',
        was_killed: true,
      },
      {
        pid: 654,
        parent_pid: 234,
        entity_id: 'ksuqwn8364fnbks.654',
        parent_entity_id: 'ksuqwn8364fnbks.234',
        command: '654_command.exe',
        was_killed: false,
        error: 'process is protected',
      },
    ];
  });

  it('should return a full process tree', () => {
    expect(buildProcessTree(descendants)).toMatchSnapshot();
  });

  it('should key each root process by its PID', () => {
    const tree = buildProcessTree(descendants);

    // 456 and 654 both have parent_pid 234, which is not part of the descendants
    // list, so both are roots of the tree.
    expect(Object.keys(tree).map(Number).sort()).toEqual([456, 654]);
  });

  it('should nest a child process under its parent', () => {
    const tree = buildProcessTree(descendants);

    expect(tree[456].children[567]).toBeDefined();
    expect(tree[456].children[567].data.command).toEqual('567_command.exe');
  });

  it('should attach the original process data to each node', () => {
    const tree = buildProcessTree(descendants);

    expect(tree[456].data).toEqual(descendants.find((p) => p.pid === 456));
    expect(tree[654].data.was_killed).toBe(false);
    expect(tree[654].data.error).toEqual('process is protected');
  });

  it('should give every node an (initially empty) children map', () => {
    const tree = buildProcessTree(descendants);

    expect(tree[456].children[567].children[5671].children[56711]).toEqual(
      expect.objectContaining({ children: {} })
    );
    expect(tree[654].children).toEqual({});
  });

  it('should build a multi-level tree regardless of input ordering', () => {
    const unordered: KilledProcessDescendant[] = [
      { pid: 3, parent_pid: 2, command: 'grandchild.exe' },
      { pid: 2, parent_pid: 1, command: 'child.exe' },
      { pid: 1, command: 'root.exe' },
    ];

    const tree = buildProcessTree(unordered);

    expect(tree[1].children[2].children[3].data.command).toEqual('grandchild.exe');
    expect(Object.keys(tree)).toEqual(['1']);
  });

  it('should return an empty tree when given no processes', () => {
    expect(buildProcessTree([])).toEqual({});
    expect(buildProcessTree()).toEqual({});
  });

  it('should ignore processes that have no PID', () => {
    const tree = buildProcessTree([
      { parent_pid: 1, command: 'no_pid.exe' },
      { pid: 1, command: 'root.exe' },
    ]);

    expect(Object.keys(tree)).toEqual(['1']);
    expect(tree[1].children).toEqual({});
  });

  it('should treat a process that is its own parent as a root', () => {
    const tree = buildProcessTree([{ pid: 1, parent_pid: 1, command: 'self.exe' }]);

    expect(tree[1]).toBeDefined();
    expect(tree[1].children).toEqual({});
  });
});
