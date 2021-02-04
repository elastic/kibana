/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export function TransformNavigationProvider({ getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['common']);

  return {
    async navigateTo() {
      return await PageObjects.common.navigateToApp('transform');
    },
  };
}
