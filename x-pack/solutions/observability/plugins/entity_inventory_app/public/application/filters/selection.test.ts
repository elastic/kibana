/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { typesFixture as types } from './__fixtures__/types';
import { EMPTY_SELECTION, isSelectionEmpty, normalizeSelection } from './selection';

describe('normalizeSelection', () => {
  it('clears the type when it does not belong to the category', () => {
    expect(
      normalizeSelection({
        types,
        selection: { category: 'hosts', type: 'k8s.pod', attributes: {} },
      })
    ).toEqual({ category: 'hosts', type: undefined, attributes: {} });
  });

  it('clears the type and the attributes when the category is cleared', () => {
    expect(
      normalizeSelection({
        types,
        selection: { type: 'k8s.pod', attributes: { 'k8s.pod.phase': ['running'] } },
      })
    ).toEqual({ category: undefined, type: undefined, attributes: {} });
  });

  it('keeps the attributes that are still shown and clears the rest when the type changes', () => {
    expect(
      normalizeSelection({
        types,
        selection: {
          category: 'kubernetes',
          type: 'k8s.deployment',
          attributes: { 'k8s.cluster.name': ['prod-us'], 'k8s.pod.phase': ['running'] },
        },
      })
    ).toEqual({
      category: 'kubernetes',
      type: 'k8s.deployment',
      attributes: { 'k8s.cluster.name': ['prod-us'] },
    });
  });

  it('keeps the attributes of any type of the category once the type is cleared', () => {
    expect(
      normalizeSelection({
        types,
        selection: {
          category: 'kubernetes',
          attributes: { 'k8s.namespace.name': ['checkout'], 'k8s.pod.phase': ['running'] },
        },
      }).attributes
    ).toEqual({ 'k8s.namespace.name': ['checkout'], 'k8s.pod.phase': ['running'] });
  });

  it('drops a category that does not exist', () => {
    expect(
      normalizeSelection({
        types,
        selection: { category: 'databases', attributes: {} },
      }).category
    ).toBeUndefined();
  });

  it('ignores the selected category on a page that is for a category', () => {
    expect(
      normalizeSelection({
        types,
        pageCategory: 'hosts',
        selection: { category: 'kubernetes', type: 'host', attributes: { 'os.type': ['linux'] } },
      })
    ).toEqual({ category: undefined, type: 'host', attributes: { 'os.type': ['linux'] } });
  });
});

describe('isSelectionEmpty', () => {
  it('is empty for the empty selection', () => {
    expect(isSelectionEmpty(EMPTY_SELECTION)).toBe(true);
  });

  it.each([
    ['a category', { category: 'hosts', attributes: {} }],
    ['a type', { type: 'host', attributes: {} }],
    ['an attribute value', { attributes: { 'os.type': ['linux'] } }],
  ])('is not empty with %s', (_label, selection) => {
    expect(isSelectionEmpty(selection)).toBe(false);
  });
});
