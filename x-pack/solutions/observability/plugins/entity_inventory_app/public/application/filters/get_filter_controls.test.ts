/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityInventoryTypeDefinition } from '../../inventory_api_types';
import { typesFixture as types } from './__fixtures__/types';
import { getCategories, getFilterControls, getTypesInScope } from './get_filter_controls';
import type { FilterOption } from './get_filter_controls';

const names = (options: FilterOption[]) => options.map(({ name }) => name);

const getAttributeNames = (params: Parameters<typeof getFilterControls>[0]) =>
  names(getFilterControls(params).attributes);

describe('getCategories', () => {
  it('returns each category once, in order of appearance', () => {
    expect(getCategories(types)).toEqual(['hosts', 'kubernetes']);
  });

  it('treats a type without a category as its own category', () => {
    expect(
      getCategories([...types, { type: 'service', name: 'Service', sources: [], attributes: [] }])
    ).toEqual(['hosts', 'kubernetes', 'service']);
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
        categories: [
          { name: 'hosts', label: 'Hosts' },
          { name: 'kubernetes', label: 'Kubernetes' },
        ],
        types: [],
        attributes: [],
      });
    });

    it('shows the filters of any type of the selected category, most shared first, and the Type filter', () => {
      const controls = getFilterControls({ types, selectedCategory: 'kubernetes' });

      expect(names(controls.categories)).toEqual(['hosts', 'kubernetes']);
      expect(controls.types).toEqual([
        { name: 'k8s.deployment', label: 'Deployment' },
        { name: 'k8s.pod', label: 'Pod' },
      ]);
      expect(names(controls.attributes)).toEqual([
        'k8s.cluster.name',
        'k8s.namespace.name',
        'cloud.provider',
        'k8s.pod.phase',
      ]);
    });

    it('does not show the Type filter for a category with a single type', () => {
      expect(getFilterControls({ types, selectedCategory: 'hosts' }).types).toEqual([]);
    });

    it('keeps the Type filter once a type is selected', () => {
      expect(
        names(
          getFilterControls({ types, selectedCategory: 'kubernetes', selectedType: 'k8s.pod' })
            .types
        )
      ).toEqual(['k8s.deployment', 'k8s.pod']);
    });

    it('shows the filters of a category with a single type', () => {
      expect(getAttributeNames({ types, selectedCategory: 'hosts' })).toEqual([
        'os.type',
        'cloud.provider',
      ]);
    });

    it('shows the filters of the selected type', () => {
      expect(
        getAttributeNames({ types, selectedCategory: 'kubernetes', selectedType: 'k8s.pod' })
      ).toEqual(['k8s.cluster.name', 'k8s.namespace.name', 'k8s.pod.phase']);
    });
  });

  describe('a page for a category with several types', () => {
    it('does not show the Category filter', () => {
      expect(getFilterControls({ types, pageCategory: 'kubernetes' }).categories).toEqual([]);
    });

    it('shows the filters of any of its types, and the Type filter', () => {
      const controls = getFilterControls({ types, pageCategory: 'kubernetes' });

      expect(names(controls.attributes)).toEqual([
        'k8s.cluster.name',
        'k8s.namespace.name',
        'cloud.provider',
        'k8s.pod.phase',
      ]);
      expect(names(controls.types)).toEqual(['k8s.deployment', 'k8s.pod']);
    });

    it('shows the filters of the selected type', () => {
      expect(
        getAttributeNames({ types, pageCategory: 'kubernetes', selectedType: 'k8s.deployment' })
      ).toEqual(['k8s.cluster.name', 'k8s.namespace.name', 'cloud.provider']);
    });
  });

  describe('a page with a single type', () => {
    it('shows the filters of that type, and only the dimensions', () => {
      const controls = getFilterControls({ types, pageCategory: 'hosts' });

      expect(controls.categories).toEqual([]);
      expect(controls.types).toEqual([]);
      expect(names(controls.attributes)).toEqual(['os.type', 'cloud.provider']);
    });
  });

  it('shows no attribute filter when the category has no type', () => {
    expect(getAttributeNames({ types, selectedCategory: 'databases' })).toEqual([]);
  });

  it('shows the dimensions of a type without a category when it is selected as a category', () => {
    const withService: EntityInventoryTypeDefinition[] = [
      ...types,
      {
        type: 'service',
        name: 'Service',
        sources: [],
        attributes: [{ name: 'service.environment', dimension: true }],
      },
    ];

    const controls = getFilterControls({ types: withService, selectedCategory: 'service' });

    expect(names(controls.categories)).toEqual(['hosts', 'kubernetes', 'service']);
    expect(controls.types).toEqual([]);
    expect(names(controls.attributes)).toEqual(['service.environment']);
  });

  it('shows the filters of every type even when the types share none', () => {
    const unrelated: EntityInventoryTypeDefinition[] = [
      {
        type: 'a',
        name: 'A',
        category: 'group',
        sources: [],
        attributes: [{ name: 'a.name', dimension: true }],
      },
      {
        type: 'b',
        name: 'B',
        category: 'group',
        sources: [],
        attributes: [{ name: 'b.name', dimension: true }],
      },
    ];

    const controls = getFilterControls({ types: unrelated, selectedCategory: 'group' });

    expect(names(controls.categories)).toEqual(['group']);
    expect(names(controls.types)).toEqual(['a', 'b']);
    expect(names(controls.attributes)).toEqual(['a.name', 'b.name']);
  });

  it('labels each attribute with its definition label, or its name when it has none', () => {
    const labelled: EntityInventoryTypeDefinition[] = [
      {
        type: 'a',
        name: 'A',
        category: 'group',
        sources: [],
        attributes: [
          { name: 'a.name', label: 'A name', dimension: true },
          { name: 'b.name', dimension: true },
        ],
      },
    ];

    expect(getFilterControls({ types: labelled, selectedCategory: 'group' }).attributes).toEqual([
      { name: 'a.name', label: 'A name' },
      { name: 'b.name', label: 'b.name' },
    ]);
  });
});
