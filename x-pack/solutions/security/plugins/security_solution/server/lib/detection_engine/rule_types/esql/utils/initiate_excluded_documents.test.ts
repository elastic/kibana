/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { initiateExcludedDocuments } from './initiate_excluded_documents';
import type { EsqlState } from '../types';
import type { RuleRangeTuple } from '../../types';

describe('initiateExcludedDocuments', () => {
  it('should return an empty array if isRuleAggregating is true', () => {
    const state: EsqlState = {
      excludedDocuments: [
        { id: 'doc1', timestamp: '2025-04-28T10:00:00Z' },
        { id: 'doc2', timestamp: '2025-04-28T11:00:00Z' },
      ],
    };
    const tuple: RuleRangeTuple = {
      maxSignals: 100,
      from: moment('2025-04-28T09:00:00Z'),
      to: moment('2025-04-28T12:00:00Z'),
    };

    const result = initiateExcludedDocuments({
      state,
      isRuleAggregating: true,
      tuple,
      hasMvExpand: false,
    });
    expect(result).toEqual([]);
  });

  it('should return an empty array if excludedDocuments in state is undefined', () => {
    const state: EsqlState = {};
    const tuple: RuleRangeTuple = {
      maxSignals: 100,
      from: moment('2025-04-28T09:00:00Z'),
      to: moment('2025-04-28T12:00:00Z'),
    };

    const result = initiateExcludedDocuments({
      state,
      isRuleAggregating: false,
      tuple,
      hasMvExpand: false,
    });
    expect(result).toEqual([]);
  });

  it('should return an empty array if rule has mv_expand command and rule query changed', () => {
    const state: EsqlState = {
      lastQuery: 'from logs | mv_expand agent.name',
      excludedDocuments: [
        { id: 'doc1', timestamp: '2025-04-28T10:00:00Z' },
        { id: 'doc2', timestamp: '2025-04-28T08:00:00Z' },
        { id: 'doc3', timestamp: '2025-04-28T11:00:00Z' },
        { id: 'doc4', timestamp: '2025-04-28T12:30:00Z' },
      ],
    };
    const tuple: RuleRangeTuple = {
      maxSignals: 100,
      from: moment('2025-04-28T09:00:00Z'),
      to: moment('2025-04-28T12:00:00Z'),
    };

    const result = initiateExcludedDocuments({
      state,
      isRuleAggregating: false,
      tuple,
      hasMvExpand: true,
      query: 'from logs | mv_expand agent.type',
    });
    expect(result).toEqual([]);
  });

  it('should return documents for mv_expand command when rule query has not changed', () => {
    const state: EsqlState = {
      lastQuery: 'from logs | mv_expand agent.name',
      excludedDocuments: [
        { id: 'doc1', timestamp: '2025-04-28T10:00:00Z' },
        { id: 'doc2', timestamp: '2025-04-28T08:00:00Z' },
        { id: 'doc3', timestamp: '2025-04-28T11:00:00Z' },
        { id: 'doc4', timestamp: '2025-04-28T12:30:00Z' },
      ],
    };
    const tuple: RuleRangeTuple = {
      maxSignals: 100,
      from: moment('2025-04-28T09:00:00Z'),
      to: moment('2025-04-28T12:00:00Z'),
    };

    const result = initiateExcludedDocuments({
      state,
      isRuleAggregating: false,
      tuple,
      hasMvExpand: true,
      query: 'from logs | mv_expand agent.name',
    });
    expect(result).toEqual([
      { id: 'doc1', timestamp: '2025-04-28T10:00:00Z' },
      { id: 'doc3', timestamp: '2025-04-28T11:00:00Z' },
      { id: 'doc4', timestamp: '2025-04-28T12:30:00Z' },
    ]);
  });

  it('should filter documents from state older than rule from time boundary', () => {
    const state: EsqlState = {
      excludedDocuments: [
        { id: 'doc1', timestamp: '2025-04-28T10:00:00Z' },
        { id: 'doc2', timestamp: '2025-04-28T08:00:00Z' },
        { id: 'doc3', timestamp: '2025-04-28T11:00:00Z' },
        { id: 'doc4', timestamp: '2025-04-28T12:30:00Z' },
      ],
    };
    const tuple: RuleRangeTuple = {
      maxSignals: 100,
      from: moment('2025-04-28T09:00:00Z'),
      to: moment('2025-04-28T12:00:00Z'),
    };

    const result = initiateExcludedDocuments({
      state,
      isRuleAggregating: false,
      tuple,
      hasMvExpand: false,
    });
    expect(result).toEqual([
      { id: 'doc1', timestamp: '2025-04-28T10:00:00Z' },
      { id: 'doc3', timestamp: '2025-04-28T11:00:00Z' },
      { id: 'doc4', timestamp: '2025-04-28T12:30:00Z' },
    ]);
  });

  it('should return an empty array if no state documents are within from time boundary', () => {
    const state: EsqlState = {
      excludedDocuments: [
        { id: 'doc1', timestamp: '2025-04-28T08:00:00Z' },
        { id: 'doc2', timestamp: '2025-04-28T08:30:00Z' },
      ],
    };
    const tuple: RuleRangeTuple = {
      maxSignals: 100,
      from: moment('2025-04-28T09:00:00Z'),
      to: moment('2025-04-28T12:00:00Z'),
    };

    const result = initiateExcludedDocuments({
      state,
      isRuleAggregating: false,
      tuple,
      hasMvExpand: false,
    });
    expect(result).toEqual([]);
  });
});
