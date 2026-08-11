/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildDataTableRecord, type EsHitRecord } from '@kbn/discover-utils';
import { getEventCategoriesFromData } from './get_event_categories';

describe('getEventCategoriesFromData', () => {
  it('returns primary and all categories for a single value', () => {
    const hit = buildDataTableRecord({
      _id: 'single-category-hit',
      fields: {
        'event.category': ['registry'],
      },
    } as unknown as EsHitRecord);

    expect(getEventCategoriesFromData(hit)).toEqual({
      primaryEventCategory: 'registry',
      allEventCategories: ['registry'],
    });
  });

  it('returns primary and all categories for multiple values', () => {
    const hit = buildDataTableRecord({
      _id: 'multiple-categories-hit',
      fields: {
        'event.category': ['process', 'file'],
      },
    } as unknown as EsHitRecord);

    expect(getEventCategoriesFromData(hit)).toEqual({
      primaryEventCategory: 'process',
      allEventCategories: ['process', 'file'],
    });
  });

  it('returns undefined categories when event.category is missing', () => {
    const hit = buildDataTableRecord({
      _id: 'missing-category-hit',
      fields: {},
    } as unknown as EsHitRecord);

    expect(getEventCategoriesFromData(hit)).toEqual({
      primaryEventCategory: undefined,
      allEventCategories: undefined,
    });
  });
});
