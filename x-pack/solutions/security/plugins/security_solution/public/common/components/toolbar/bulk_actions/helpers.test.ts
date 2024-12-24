/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createInitialTagsState } from './helpers';

const defaultTags = ['test 1', 'test 2', 'test 3'];

describe('createInitialTagsState', () => {
  it('should return default tags if no existing tags are provided ', () => {
    const initialState = createInitialTagsState([], defaultTags);
    expect(initialState).toMatchInlineSnapshot(`
      Array [
        Object {
          "checked": undefined,
          "data-test-subj": "unselected-alert-tag",
          "label": "test 1",
        },
        Object {
          "checked": undefined,
          "data-test-subj": "unselected-alert-tag",
          "label": "test 2",
        },
        Object {
          "checked": undefined,
          "data-test-subj": "unselected-alert-tag",
          "label": "test 3",
        },
      ]
    `);
  });

  it('should return the correctly sorted and merged state if tags from a singular alert are provided', () => {
    const mockAlertTags = ['test 1'];
    const initialState = createInitialTagsState([mockAlertTags], defaultTags);
    expect(initialState).toMatchInlineSnapshot(`
      Array [
        Object {
          "checked": "on",
          "data-test-subj": "selected-alert-tag",
          "label": "test 1",
        },
        Object {
          "checked": undefined,
          "data-test-subj": "unselected-alert-tag",
          "label": "test 2",
        },
        Object {
          "checked": undefined,
          "data-test-subj": "unselected-alert-tag",
          "label": "test 3",
        },
      ]
    `);
  });

  it('should return the correctly sorted and merged state if tags from multiple alerts', () => {
    const mockAlertTags1 = ['test 1'];
    const mockAlertTags2 = ['test 1', 'test 2'];
    const initialState = createInitialTagsState([mockAlertTags1, mockAlertTags2], defaultTags);
    expect(initialState).toMatchInlineSnapshot(`
      Array [
        Object {
          "checked": "on",
          "data-test-subj": "selected-alert-tag",
          "label": "test 1",
        },
        Object {
          "checked": "mixed",
          "data-test-subj": "mixed-alert-tag",
          "label": "test 2",
        },
        Object {
          "checked": undefined,
          "data-test-subj": "unselected-alert-tag",
          "label": "test 3",
        },
      ]
    `);
  });

  it('should return the correctly sorted and merged state if a tag not in the default tag options is provided', () => {
    const mockAlertTags = ['test 1', 'test 4'];
    const initialState = createInitialTagsState([mockAlertTags], defaultTags);
    expect(initialState).toMatchInlineSnapshot(`
      Array [
        Object {
          "checked": "on",
          "data-test-subj": "selected-alert-tag",
          "label": "test 1",
        },
        Object {
          "checked": "on",
          "data-test-subj": "selected-alert-tag",
          "label": "test 4",
        },
        Object {
          "checked": undefined,
          "data-test-subj": "unselected-alert-tag",
          "label": "test 2",
        },
        Object {
          "checked": undefined,
          "data-test-subj": "unselected-alert-tag",
          "label": "test 3",
        },
      ]
    `);
  });
});
