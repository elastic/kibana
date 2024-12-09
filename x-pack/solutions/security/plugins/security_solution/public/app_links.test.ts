/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { appLinks } from './app_links';
import type { LinkItem, AppLinkItems } from './common/links/types';

const traverse = (linksItems: AppLinkItems, fn: (link: LinkItem) => void) => {
  linksItems.forEach((link) => {
    fn(link);
    if (link.links) {
      traverse(link.links, fn);
    }
  });
};

describe('Security app links', () => {
  it('should only contain static paths', () => {
    traverse(appLinks, (link) => {
      expect(link.path).not.toContain('/:');
    });
  });
});
