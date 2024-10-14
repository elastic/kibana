/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../ftr_provider_context';

export function SearchClassicNavigationProvider({ getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');

  return {
    async expectAllNavItems(items: Array<{ id: string; label: string }>) {
      for (const navItem of items) {
        await testSubjects.existOrFail(`searchSideNav-${navItem.id}`);
        const itemElement = await testSubjects.find(`searchSideNav-${navItem.id}`);
        const itemLabel = await itemElement.getVisibleText();
        expect(itemLabel).to.equal(navItem.label);
      }
      const allSideNavItems = await testSubjects.findAll('*searchSideNav-');
      expect(allSideNavItems.length).to.equal(items.length);
    },
  };
}
