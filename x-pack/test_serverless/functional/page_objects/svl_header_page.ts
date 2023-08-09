/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HeaderPageObject } from '../../../../test/functional/page_objects/header_page';
import { FtrProviderContext } from '../ftr_provider_context';

type HeaderPageInterface = { [K in keyof HeaderPageObject]: HeaderPageObject[K] };

export function SvlHeaderPageProvider({ getService }: FtrProviderContext): HeaderPageInterface {
  const testSubjects = getService('testSubjects');
  const config = getService('config');
  const defaultFindTimeout = config.get('timeouts.find');
  const unsupported = (method: string) =>
    new Error(
      `The \`${method}\` method is not yet implemented for Serverless tests. ` +
        'Implement it in `x-pack/test_serverless/functional/page_objects/svl_header_page.ts`.'
    );

  const headerPage = {
    clickDiscover(ignoreAppLeaveWarning?: boolean): Promise<void> {
      throw unsupported('clickDiscover');
    },
    clickVisualize(ignoreAppLeaveWarning?: boolean): Promise<void> {
      throw unsupported('clickVisualize');
    },
    clickDashboard(): Promise<void> {
      throw unsupported('clickDashboard');
    },
    clickStackManagement(): Promise<void> {
      throw unsupported('clickStackManagement');
    },
    async waitUntilLoadingHasFinished(): Promise<void> {
      try {
        await headerPage.isGlobalLoadingIndicatorVisible();
      } catch (exception) {
        if (exception.name === 'ElementNotVisible') {
          // selenium might just have been too slow to catch it
        } else {
          throw exception;
        }
      }
      await headerPage.awaitGlobalLoadingIndicatorHidden();
    },
    async isGlobalLoadingIndicatorVisible(): Promise<boolean> {
      return await testSubjects.exists('nav-header-loading-spinner', {
        timeout: 1500,
      });
    },
    async awaitGlobalLoadingIndicatorHidden(): Promise<void> {
      await testSubjects.existOrFail('nav-header-logo', {
        allowHidden: true,
        timeout: defaultFindTimeout * 10,
      });
    },
    awaitKibanaChrome(): Promise<void> {
      throw unsupported('awaitKibanaChrome');
    },
    onAppLeaveWarning(ignoreWarning?: boolean): Promise<void> {
      throw unsupported('onAppLeaveWarning');
    },
  };

  return headerPage;
}
