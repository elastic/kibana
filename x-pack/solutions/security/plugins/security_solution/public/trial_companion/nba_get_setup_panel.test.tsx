/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Milestone } from '../../common/trial_companion/types';
import type { NBA, NBATODOItem } from './nba_translations';
import { completedTODOs, openTODOs } from './nba_get_setup_panel';

describe('nba_get_setup_panel', () => {
  const mockNBA: NBA = {
    message: 'test message',
    title: 'test title',
    apps: [],
  };

  const createTodoList = (milestones: Milestone[]): NBATODOItem[] =>
    milestones.map((milestoneId) => ({
      milestoneId,
      translate: mockNBA,
    }));

  describe('completedTODOs', () => {
    it.each<{
      scenario: string;
      todoList: NBATODOItem[];
      open: Milestone[];
      expected: Milestone[];
    }>([
      {
        scenario: 'returns all TODOs as completed when open list is empty',
        todoList: createTodoList([Milestone.M1, Milestone.M2, Milestone.M3]),
        open: [],
        expected: [Milestone.M1, Milestone.M2, Milestone.M3],
      },
      {
        scenario: 'two done, two are still open',
        todoList: createTodoList([Milestone.M1, Milestone.M2, Milestone.M3, Milestone.M5]),
        open: [Milestone.M2, Milestone.M5],
        expected: [Milestone.M1, Milestone.M3],
      },
      {
        scenario: 'ignores open milestones not present in TODO list',
        todoList: createTodoList([Milestone.M1, Milestone.M2]),
        open: [Milestone.M3],
        expected: [Milestone.M1, Milestone.M2],
      },
      {
        scenario: 'returns empty when all TODO milestones are open',
        todoList: createTodoList([Milestone.M1, Milestone.M2]),
        open: [Milestone.M1, Milestone.M2],
        expected: [],
      },
      {
        scenario: 'keep only known milestones from todo',
        todoList: createTodoList([Milestone.M1, Milestone.M2]),
        open: [Milestone.M1, Milestone.M3, Milestone.M5],
        expected: [Milestone.M2],
      },
    ])('$scenario', ({ todoList, open, expected }) => {
      const result = completedTODOs(todoList, open);
      expect(result).toEqual(expected);
    });
  });

  describe('openTODOs', () => {
    it.each<{
      scenario: string;
      todoItems: NBATODOItem[];
      completed: Milestone[];
      expected: Milestone[];
    }>([
      {
        scenario: 'returns all TODO milestones as open when completed list is empty',
        todoItems: createTodoList([Milestone.M1, Milestone.M2, Milestone.M3]),
        completed: [],
        expected: [Milestone.M1, Milestone.M2, Milestone.M3],
      },
      {
        scenario: 'removes completed milestones from TODO milestones',
        todoItems: createTodoList([Milestone.M1, Milestone.M2, Milestone.M3, Milestone.M5]),
        completed: [Milestone.M1, Milestone.M5],
        expected: [Milestone.M2, Milestone.M3],
      },
      {
        scenario: 'ignores completed milestones not present in TODO list',
        todoItems: createTodoList([Milestone.M1, Milestone.M2]),
        completed: [Milestone.M3],
        expected: [Milestone.M1, Milestone.M2],
      },
      {
        scenario: 'returns empty when all TODO milestones are completed',
        todoItems: createTodoList([Milestone.M1, Milestone.M2]),
        completed: [Milestone.M1, Milestone.M2],
        expected: [],
      },
    ])('$scenario', ({ todoItems, completed, expected }) => {
      const result = openTODOs(todoItems, completed);
      expect(result).toEqual(expected);
    });
  });
});
