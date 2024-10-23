/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SolutionNavigationProvider } from '@kbn/test-suites-src/functional/page_objects';

import { NavigationalSearchPageObject } from '@kbn/test-suites-xpack/functional/page_objects/navigational_search';
import type { FtrProviderContext } from '../ftr_provider_context';

export function SvlCommonNavigationProvider(ctx: FtrProviderContext) {
  const solutionNavigation = SolutionNavigationProvider(ctx);

  return {
    ...solutionNavigation,
    search: new SvlNavigationSearchPageObject(ctx),
  };
}

class SvlNavigationSearchPageObject extends NavigationalSearchPageObject {
  constructor(ctx: FtrProviderContext) {
    // @ts-expect-error -- this expects FtrProviderContext from x-pack/test/functional/ftr_provider_context.ts
    super(ctx);
  }

  async showSearch() {
    await this.ctx.getService('testSubjects').click('nav-search-reveal');
  }
  async hideSearch() {
    await this.ctx.getService('testSubjects').click('nav-search-conceal');
  }
}
