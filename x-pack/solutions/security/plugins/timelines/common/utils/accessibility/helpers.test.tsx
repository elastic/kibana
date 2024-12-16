/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mount } from 'enzyme';
import React from 'react';

import {
  ariaIndexToArrayIndex,
  arrayIndexToAriaIndex,
  getNotesContainerClassName,
  getRowRendererClassName,
  isArrowRight,
} from './helpers';

describe('helpers', () => {
  describe('ariaIndexToArrayIndex', () => {
    test('it returns the expected array index', () => {
      expect(ariaIndexToArrayIndex(1)).toEqual(0);
    });
  });

  describe('arrayIndexToAriaIndex', () => {
    test('it returns the expected aria index', () => {
      expect(arrayIndexToAriaIndex(0)).toEqual(1);
    });
  });

  describe('isArrowRight', () => {
    test('it returns true if the right arrow key was pressed', () => {
      let result = false;
      const onKeyDown = (keyboardEvent: React.KeyboardEvent) => {
        result = isArrowRight(keyboardEvent);
      };

      const wrapper = mount(<div onKeyDown={onKeyDown} />);
      wrapper.find('div').simulate('keydown', { key: 'ArrowRight' });
      wrapper.update();

      expect(result).toBe(true);
    });

    test('it returns false if another key was pressed', () => {
      let result = false;
      const onKeyDown = (keyboardEvent: React.KeyboardEvent) => {
        result = isArrowRight(keyboardEvent);
      };

      const wrapper = mount(<div onKeyDown={onKeyDown} />);
      wrapper.find('div').simulate('keydown', { key: 'Enter' });
      wrapper.update();

      expect(result).toBe(false);
    });
  });

  describe('getRowRendererClassName', () => {
    test('it returns the expected class name', () => {
      expect(getRowRendererClassName(2)).toBe('row-renderer-2');
    });
  });

  describe('getNotesContainerClassName', () => {
    test('it returns the expected class name', () => {
      expect(getNotesContainerClassName(2)).toBe('notes-container-2');
    });
  });
});
