/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaFunctionalTestDefaultProviders } from '../../types/providers';

export const IndexLifecycleManagementPageProvider = ({
  getService,
}: KibanaFunctionalTestDefaultProviders) => {
  const testSubjects = getService('testSubjects');

  return {
    async sectionHeadingText() {
      return await testSubjects.getVisibleText('sectionHeading');
    },
    async createPolicyButton() {
      return await testSubjects.find('createPolicyButton');
    },
  };
};
