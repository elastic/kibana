/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityInventoryTypeDefinition } from '../../inventory_api_types';
import { typesFixture as types } from './__fixtures__/types';
import { getCategories, getFilterControls, getTypesInScope } from './get_filter_controls';

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

describe('getTypesInScope', () => {
  it('is empty when nothing is selected', () => {
    expect(getTypesInScope({ types })).toEqual([]);
  });

  it('is the types of the category', () => {
    expect(
      getTypesInScope({ types, selectedCategory: 'kubernetes' }).map(({ type }) => type)
    ).toEqual(['k8s.deployment', 'k8s.pod']);
  });

  it('is the selected type', () => {
    expect(
      getTypesInScope({ types, selectedCategory: 'kubernetes', selectedType: 'k8s.pod' }).map(
        ({ type }) => type
      )
    ).toEqual(['k8s.pod']);
  });

  it('is empty for a selected type when there is no category', () => {
    expect(getTypesInScope({ types, selectedType: 'k8s.pod' })).toEqual([]);
  });

  it('ignores a selected type that is outside the category', () => {
    expect(getTypesInScope({ types, selectedCategory: 'hosts', selectedType: 'k8s.pod' })).toEqual(
      []
    );
    expect(getTypesInScope({ types, pageCategory: 'hosts', selectedType: 'k8s.pod' })).toEqual([]);
  });
});

describe('getFilterControls', () => {
  describe('All resources', () => {
    it('shows only the Category filter at first', () => {
      expect(getFilterControls({ types })).toEqual({
        categoryOptions: ['hosts', 'kubernetes'],
        attributeNames: [],
      });
    });

    it('shows the filters of any type of the selected category, most shared first, and the Type filter', () => {
      expect(getFilterControls({ types, selectedCategory: 'kubernetes' })).toEqual({
        categoryOptions: ['hosts', 'kubernetes'],
        typeOptions: ['k8s.deployment', 'k8s.pod'],
        attributeNames: [
          'k8s.cluster.name',
          'k8s.namespace.name',
          'cloud.provider',
          'k8s.pod.phase',
        ],
      });
    });

    it('does not show the Type filter for a category with a single type', () => {
      expect(getFilterControls({ types, selectedCategory: 'hosts' }).typeOptions).toBeUndefined();
    });

    it('keeps the Type filter once a type is selected', () => {
      expect(
        getFilterControls({ types, selectedCategory: 'kubernetes', selectedType: 'k8s.pod' })
          .typeOptions
      ).toEqual(['k8s.deployment', 'k8s.pod']);
    });

    it('shows the filters of a category with a single type', () => {
      expect(getFilterControls({ types, selectedCategory: 'hosts' }).attributeNames).toEqual([
        'os.type',
        'cloud.provider',
      ]);
    });

    it('shows the filters of the selected type', () => {
      expect(
        getFilterControls({ types, selectedCategory: 'kubernetes', selectedType: 'k8s.pod' })
          .attributeNames
      ).toEqual(['k8s.cluster.name', 'k8s.namespace.name', 'k8s.pod.phase']);
    });
  });

  describe('a page for a category with several types', () => {
    it('does not show the Category filter', () => {
      expect(
        getFilterControls({ types, pageCategory: 'kubernetes' }).categoryOptions
      ).toBeUndefined();
    });

    it('shows the filters of any of its types, and the Type filter', () => {
      const filters = getFilterControls({ types, pageCategory: 'kubernetes' });

      expect(filters.attributeNames).toEqual([
        'k8s.cluster.name',
        'k8s.namespace.name',
        'cloud.provider',
        'k8s.pod.phase',
      ]);
      expect(filters.typeOptions).toEqual(['k8s.deployment', 'k8s.pod']);
    });

    it('shows the filters of the selected type', () => {
      expect(
        getFilterControls({ types, pageCategory: 'kubernetes', selectedType: 'k8s.deployment' })
          .attributeNames
      ).toEqual(['k8s.cluster.name', 'k8s.namespace.name', 'cloud.provider']);
    });
  });

  describe('a page with a single type', () => {
    it('shows the filters of that type, and only the dimensions', () => {
      expect(getFilterControls({ types, pageCategory: 'hosts' })).toEqual({
        categoryOptions: undefined,
        attributeNames: ['os.type', 'cloud.provider'],
      });
    });
  });

  it('shows no attribute filter when the category has no type', () => {
    expect(getFilterControls({ types, selectedCategory: 'databases' }).attributeNames).toEqual([]);
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
      categoryOptions: ['hosts', 'kubernetes', 'service'],
      typeOptions: undefined,
      attributeNames: ['service.environment'],
    });
  });

  it('shows the filters of every type even when the types share none', () => {
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
      categoryOptions: ['group'],
      typeOptions: ['a', 'b'],
      attributeNames: ['a.name', 'b.name'],
    });
  });
});
