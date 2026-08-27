/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elementRenderState } from './inline_style';

const stateFor = (style: string, parentVisible = true) =>
  elementRenderState({ name: 'div', attribs: { style } }, parentVisible);

describe('inline style render state', () => {
  it.each([
    ['plain declarations', 'display:none'],
    ['escaped property and value', 'd\\69splay:n\\6fne'],
    ['escaped important priority', 'display:none !\\69mportant;display:block'],
    ['valid declaration after invalid raw syntax', 'broken;display:none'],
    ['delimiters inside another value', 'content:"x;y:z";display:none'],
    ['invalid later display value', 'display:none;display:potato'],
  ])('recognizes hidden display from %s', (_label, style) => {
    expect(stateFor(style)).toEqual({ subtreeHidden: true, visible: true });
  });

  it('ignores an invalid declaration after visibility:hidden', () => {
    expect(stateFor('visibility:hidden;visibility:potato')).toEqual({
      subtreeHidden: false,
      visible: false,
    });
  });

  it.each([
    ['later declaration', 'display:none;display:block'],
    ['later important declaration', 'display:none;display:block!important'],
    ['later all reset', 'display:none;all:initial'],
    ['escaped priority delimiter', 'display:none \\!important;display:block'],
    ['invalid priority keyword', 'display:none !urgent;display:block'],
    ['invalid recovered tail', 'display:block;broken{;display:none'],
    ['raw malformed value', 'display:var(;visibility:hidden'],
    ['unresolved display substitution', 'display:none;display:var(--missing)'],
    ['unresolved all substitution', 'display:none;all:var(--missing)'],
    ['non-CSS property whitespace', '\u00a0display:none'],
  ])('keeps display visible with %s', (_label, style) => {
    expect(stateFor(style)).toEqual({ subtreeHidden: false, visible: true });
  });

  it('inherits visibility and allows a descendant to restore it', () => {
    const parent = stateFor('visibility:hidden');
    const child = stateFor('visibility:visible', parent.visible);

    expect({ parent, child }).toEqual({
      parent: { subtreeHidden: false, visible: false },
      child: { subtreeHidden: false, visible: true },
    });
  });

  it.each([
    ['initial', true],
    ['revert', false],
    ['revert-layer', false],
    ['inherit', false],
    ['unset', false],
  ])('applies the all:%s CSS-wide reset', (keyword, visible) => {
    expect(stateFor(`display:none;all:${keyword}`, false)).toEqual({
      subtreeHidden: false,
      visible,
    });
  });

  it.each(['inherit', 'unset', 'revert', 'revert-layer'])(
    'inherits a hidden parent after visibility:%s',
    (keyword) => {
      expect(stateFor(`visibility:${keyword}`, false)).toEqual({
        subtreeHidden: false,
        visible: false,
      });
    }
  );

  it('keeps an important declaration ahead of a later non-important reset', () => {
    expect(stateFor('display:none!important;all:initial')).toEqual({
      subtreeHidden: true,
      visible: true,
    });
  });

  it('lets an important reset override an earlier important declaration', () => {
    expect(stateFor('display:none!important;all:initial!important')).toEqual({
      subtreeHidden: false,
      visible: true,
    });
  });

  it('falls back to visible content if css-tree cannot parse the style value', () => {
    const style = {} as unknown as string;

    expect(stateFor(style)).toEqual({ subtreeHidden: false, visible: true });
  });
});
