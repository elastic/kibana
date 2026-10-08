/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type React from 'react';
import { createTagsPasteHandler, getNewTags, hasTagDelimiter, splitTags } from './tags_input';

describe('tags_input helpers', () => {
  describe('hasTagDelimiter', () => {
    it.each([
      ['tag1,tag2', true],
      ['tag1\ntag2', true],
      ['tag1\r\ntag2', true],
      ['single tag', false],
      ['', false],
    ])('returns %p -> %p', (text, expected) => {
      expect(hasTagDelimiter(text)).toBe(expected);
    });
  });

  describe('splitTags', () => {
    it('splits on commas and newlines and collapses repeated delimiters', () => {
      expect(splitTags('tag1, tag2\ntag3\r\ntag4,,tag5')).toEqual([
        'tag1',
        ' tag2',
        'tag3',
        'tag4',
        'tag5',
      ]);
    });
  });

  describe('getNewTags', () => {
    it('trims values and drops empties', () => {
      expect(getNewTags([], ['tag1', ' tag2 ', '  '])).toEqual(['tag1', 'tag2']);
    });

    it('ignores values already present', () => {
      expect(getNewTags(['tag1'], ['tag1', 'tag2'])).toEqual(['tag2']);
    });

    it('de-duplicates within the batch', () => {
      expect(getNewTags([], ['tag1', 'tag1', 'tag2'])).toEqual(['tag1', 'tag2']);
    });

    it('returns an empty array when there is nothing new to add', () => {
      expect(getNewTags(['tag1', 'tag2'], ['tag1', ' tag2 ', ''])).toEqual([]);
    });
  });

  describe('createTagsPasteHandler', () => {
    const buildEvent = (text: string) => {
      const preventDefault = jest.fn();
      const event = {
        clipboardData: { getData: () => text },
        preventDefault,
      } as unknown as React.ClipboardEvent<HTMLDivElement>;
      return { event, preventDefault };
    };

    it('splits a delimited clipboard value and prevents the default paste', () => {
      const addTags = jest.fn();
      const { event, preventDefault } = buildEvent('tag1\ntag2,tag3');

      createTagsPasteHandler(addTags)(event);

      expect(preventDefault).toHaveBeenCalledTimes(1);
      expect(addTags).toHaveBeenCalledWith(['tag1', 'tag2', 'tag3']);
    });

    it('leaves default paste behavior when there is no delimiter', () => {
      const addTags = jest.fn();
      const { event, preventDefault } = buildEvent('single-tag');

      createTagsPasteHandler(addTags)(event);

      expect(preventDefault).not.toHaveBeenCalled();
      expect(addTags).not.toHaveBeenCalled();
    });
  });
});
