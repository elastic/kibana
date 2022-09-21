/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../ftr_provider_context';

export function FleetIntegrationPageProvider({ getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');

  const assertLastPageBreadcrumb = (text: string) =>
    retry.try(async () => expect(await testSubjects.getVisibleText('breadcrumb last')).to.be(text));

  const assertAgentPolicyPageExists = (policyName: string) => assertLastPageBreadcrumb(policyName);

  const assertAddIntegrationPageExists = (integrationName: string) =>
    assertLastPageBreadcrumb(integrationName);

  return {
    assertAddIntegrationPageExists,
    assertAgentPolicyPageExists,
  };
}
