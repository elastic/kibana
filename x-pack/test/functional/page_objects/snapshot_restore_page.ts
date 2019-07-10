/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaFunctionalTestDefaultProviders } from '../../types/providers';

export const SnapshotRestorePageProvider = ({
  getService,
}: KibanaFunctionalTestDefaultProviders) => {
  const testSubjects = getService('testSubjects');

  return {
    async appTitleText() {
      return await testSubjects.getVisibleText('appTitle');
    },
    async registerRepositoryButton() {
      return await testSubjects.find('registerRepositoryButton');
    },
  };
};
