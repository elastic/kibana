/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityInventoryTypeDefinition } from '../../inventory_api_types';
import { typesFixture as types } from './__fixtures__/types';
import { getCategories, getFilterControls, normalizeSelection } from './get_filter_controls';

describe('getCategories', () => {
  it('returns each category once, in order of appearance', () => {
    expect(getCategories(types)).toEqual(['hosts', 'kubernetes']);
  });

  it('treats a type without a category as its own category', () => {
    expect(getCategories([...types, { type: 'service', name: 'Service', attributes: [] }])).toEqual(
      ['hosts', 'kubernetes', 'service']
    );
  });
});

describe('getFilterControls', () => {
  describe('All resources', () => {
    it('shows only the Category filter at first', () => {
      expect(getFilterControls({ types })).toEqual({
        categoryFilter: ['hosts', 'kubernetes'],
        attributeFilters: [],
      });
    });

    it('shows the filters shared by the types of the selected category, and the Type filter', () => {
      expect(getFilterControls({ types, selectedCategory: 'kubernetes' })).toEqual({
        categoryFilter: ['hosts', 'kubernetes'],
        typeFilter: ['k8s.deployment', 'k8s.pod'],
        attributeFilters: ['k8s.cluster.name', 'k8s.namespace.name'],
      });
    });

    it('does not show the Type filter for a category with a single type', () => {
      expect(getFilterControls({ types, selectedCategory: 'hosts' }).typeFilter).toBe(undefined);
    });

    it('keeps the Type filter once a type is selected', () => {
      expect(
        getFilterControls({ types, selectedCategory: 'kubernetes', selectedType: 'k8s.pod' })
          .typeFilter
      ).toEqual(['k8s.deployment', 'k8s.pod']);
    });

    it('shows the filters of a category with a single type', () => {
      expect(getFilterControls({ types, selectedCategory: 'hosts' }).attributeFilters).toEqual([
        'os.type',
        'cloud.provider',
      ]);
    });

    it('shows the filters of the selected type', () => {
      expect(
        getFilterControls({ types, selectedCategory: 'kubernetes', selectedType: 'k8s.pod' })
          .attributeFilters
      ).toEqual(['k8s.cluster.name', 'k8s.namespace.name', 'k8s.pod.phase']);
    });
  });

  describe('a page for a category with several types', () => {
    it('does not show the Category filter', () => {
      expect(getFilterControls({ types, pageCategory: 'kubernetes' }).categoryFilter).toBe(
        undefined
      );
    });

    it('shows the filters shared by its types, and the Type filter', () => {
      const filters = getFilterControls({ types, pageCategory: 'kubernetes' });

      expect(filters.attributeFilters).toEqual(['k8s.cluster.name', 'k8s.namespace.name']);
      expect(filters.typeFilter).toEqual(['k8s.deployment', 'k8s.pod']);
    });

    it('shows the filters of the selected type', () => {
      expect(
        getFilterControls({ types, pageCategory: 'kubernetes', selectedType: 'k8s.deployment' })
          .attributeFilters
      ).toEqual(['k8s.cluster.name', 'k8s.namespace.name', 'cloud.provider']);
    });
  });

  describe('a page with a single type', () => {
    it('shows the filters of that type, and only the dimensions', () => {
      expect(getFilterControls({ types, pageCategory: 'hosts' })).toEqual({
        categoryFilter: undefined,
        attributeFilters: ['os.type', 'cloud.provider'],
      });
    });
  });

  it('shows no attribute filter when the category has no type', () => {
    expect(getFilterControls({ types, selectedCategory: 'databases' }).attributeFilters).toEqual(
      []
    );
  });

  it('shows the dimensions of a type without a category when it is selected as a category', () => {
    const withService: EntityInventoryTypeDefinition[] = [
      ...types,
      {
        type: 'service',
        name: 'Service',
        attributes: [{ name: 'service.environment', dimension: true }],
      },
    ];

    expect(getFilterControls({ types: withService, selectedCategory: 'service' })).toEqual({
      categoryFilter: ['hosts', 'kubernetes', 'service'],
      typeFilter: undefined,
      attributeFilters: ['service.environment'],
    });
  });

  it('shows no attribute filter when the types of a category share no dimension', () => {
    const unrelated: EntityInventoryTypeDefinition[] = [
      {
        type: 'a',
        name: 'A',
        category: 'group',
        attributes: [{ name: 'a.name', dimension: true }],
      },
      {
        type: 'b',
        name: 'B',
        category: 'group',
        attributes: [{ name: 'b.name', dimension: true }],
      },
    ];

    expect(getFilterControls({ types: unrelated, selectedCategory: 'group' })).toEqual({
      categoryFilter: ['group'],
      typeFilter: ['a', 'b'],
      attributeFilters: [],
    });
  });
});

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

  it('keeps the attributes shared by the types of the category once the type is cleared', () => {
    expect(
      normalizeSelection({
        types,
        selection: {
          category: 'kubernetes',
          attributes: { 'k8s.namespace.name': ['checkout'], 'k8s.pod.phase': ['running'] },
        },
      }).attributes
    ).toEqual({ 'k8s.namespace.name': ['checkout'] });
  });

  it('drops a category that does not exist', () => {
    expect(
      normalizeSelection({
        types,
        selection: { category: 'databases', attributes: {} },
      }).category
    ).toBe(undefined);
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
