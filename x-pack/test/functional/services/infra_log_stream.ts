/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../ftr_provider_context';
import { WebElementWrapper } from '../../../../test/functional/services/lib/web_element_wrapper';

export function InfraLogStreamProvider({ getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');

  return {
    async getColumnHeaderLabels(): Promise<string[]> {
      const columnHeaderElements: WebElementWrapper[] = await testSubjects.findAll(
        '~logColumnHeader'
      );
      return await Promise.all(columnHeaderElements.map(element => element.getVisibleText()));
    },

    async getStreamEntries(minimumItems = 1): Promise<WebElementWrapper[]> {
      await retry.try(async () => {
        const elements = await testSubjects.findAll('~streamEntry');
        if (!elements || elements.length < minimumItems) {
          throw new Error();
        }
      });

      return await testSubjects.findAll('~streamEntry');
    },

    async getLogColumnsOfStreamEntry(
      entryElement: WebElementWrapper
    ): Promise<WebElementWrapper[]> {
      return await testSubjects.findAllDescendant('~logColumn', entryElement);
    },
  };
}
