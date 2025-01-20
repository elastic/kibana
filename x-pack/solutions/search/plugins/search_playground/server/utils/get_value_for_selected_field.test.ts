/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getValueForSelectedField } from './get_value_for_selected_field';

describe('getValueForSelectedField', () => {
  test('should return for simple key', () => {
    const hit = {
      _index: 'sample-index',
      _id: '8jSNY48B6iHEi98DL1C-',
      _score: 0.7789394,
      _source: {
        test: 'The Shawshank Redemption',
        metadata: {
          source:
            'Over the course of several years, two convicts form a friendship, seeking consolation and, eventually, redemption through basic compassion',
        },
      },
    };

    expect(getValueForSelectedField(hit, 'test')).toEqual('The Shawshank Redemption');
  });

  test('should return for combined key', () => {
    const hit = {
      _index: 'sample-index',
      _id: '8jSNY48B6iHEi98DL1C-',
      _score: 0.7789394,
      _source: {
        test: 'The Shawshank Redemption',
        metadata: {
          source:
            'Over the course of several years, two convicts form a friendship, seeking consolation and, eventually, redemption through basic compassion',
        },
      },
    };

    expect(getValueForSelectedField(hit, 'metadata.source')).toEqual(
      'Over the course of several years, two convicts form a friendship, seeking consolation and, eventually, redemption through basic compassion'
    );
  });

  test('should return empty string for missing key', () => {
    const hit = {
      _index: 'sample-index',
      _id: '8jSNY48B6iHEi98DL1C-',
      _score: 0.7789394,
      _source: {
        test: 'The Shawshank Redemption',
        metadata: {
          source:
            'Over the course of several years, two convicts form a friendship, seeking consolation and, eventually, redemption through basic compassion',
        },
      },
    };

    expect(getValueForSelectedField(hit, 'metadata.sources')).toBe('');
  });

  test('should return empty string for nested key', () => {
    const hit = {
      _index: 'sample-index',
      _id: '8jSNY48B6iHEi98DL1C-',
      _score: 0.7789394,
      _source: {
        test: 'The Shawshank Redemption',
        metadata: {
          source:
            'Over the course of several years, two convicts form a friendship, seeking consolation and, eventually, redemption through basic compassion',
        },
      },
    };

    expect(getValueForSelectedField(hit, 'bla.sources')).toBe('');
  });

  test('should return when it has highlighted messages', () => {
    const hit = {
      _index: 'books',
      _id: '8jSNY48B6iHEi98DL1C-',
      _score: 0.7789394,
      _source: {
        test: 'The Big Bang and Black Holes',
        metadata: {
          source:
            'This book explores the origins of the universe, beginning with the Big Bang—an immense explosion that created space, time, and matter. It delves into how black holes, regions of space where gravity is so strong that not even light can escape, play a crucial role in the evolution of galaxies and the universe as a whole. Stephen Hawking’s groundbreaking discoveries about black hole radiation, often referred to as Hawking Radiation, are also discussed in detail.',
        },
      },
      highlight: {
        test: [
          'This book explores the origins of the universe.',
          'The beginning with the Big Bang—an immense explosion that created space, time, and matter. It delves into how black holes, regions of space where gravity is so strong that not even light can escape, play a crucial role in the evolution of galaxies and the universe as a whole. Stephen Hawking’s groundbreaking discoveries about black hole radiation, often referred to as Hawking Radiation, are also discussed in detail.',
        ],
      },
    };

    expect(getValueForSelectedField(hit as any, 'test')).toMatchInlineSnapshot(`
      "This book explores the origins of the universe.
       --- 
      The beginning with the Big Bang—an immense explosion that created space, time, and matter. It delves into how black holes, regions of space where gravity is so strong that not even light can escape, play a crucial role in the evolution of galaxies and the universe as a whole. Stephen Hawking’s groundbreaking discoveries about black hole radiation, often referred to as Hawking Radiation, are also discussed in detail."
    `);
  });

  test('should return when path is semantic field', () => {
    const hit = {
      _index: 'sample-index',
      _id: '8jSNY48B6iHEi98DL1C-',
      _score: 0.7789394,
      _source: {
        test: { text: 'The Shawshank Redemption' },
      },
    };

    expect(getValueForSelectedField(hit, 'test')).toEqual('The Shawshank Redemption');
  });
});
