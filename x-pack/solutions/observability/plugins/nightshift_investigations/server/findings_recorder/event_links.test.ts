/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { normalizeEventLinks } from './event_links';

describe('normalizeEventLinks', () => {
  it('keeps a well-formed link', () => {
    const text = 'It [lost every replica](event:condition:frontend:2026-11-08T15:45) at once.';
    expect(normalizeEventLinks(text)).toBe(text);
  });

  it('puts the time to the minute, as the store does', () => {
    expect(normalizeEventLinks('[failed](event:failure:frontend:2026-11-08T15:45:12Z)')).toBe(
      '[failed](event:failure:frontend:2026-11-08T15:45)'
    );
  });

  it('keeps a relationship target and an investigation event', () => {
    expect(
      normalizeEventLinks(
        '[a](event:failure:cart->redis:2026-11-08T15:45) [b](event:response:investigation:2026-11-08T16:00)'
      )
    ).toBe(
      '[a](event:failure:cart->redis:2026-11-08T15:45) [b](event:response:investigation:2026-11-08T16:00)'
    );
  });

  it('turns a link that is not an event id back into its words', () => {
    expect(
      normalizeEventLinks('The [pod](event:abc) and [x](event:nonsense:frontend:2026-11-08T15:45)')
    ).toBe('The pod and x');
  });

  it('turns escaped line breaks into real ones', () => {
    expect(normalizeEventLinks('- a.\\n- b.')).toBe('- a.\n- b.');
  });

  it('leaves other links alone', () => {
    expect(normalizeEventLinks('[docs](https://elastic.co)')).toBe('[docs](https://elastic.co)');
  });
});
