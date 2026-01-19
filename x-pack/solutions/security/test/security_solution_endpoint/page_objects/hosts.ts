/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WebElementWrapper } from '@kbn/ftr-common-functional-ui-services';
import type { FtrProviderContext } from '../configs/ftr_provider_context';

export function HostsPageObjectProvider({ getService, getPageObjects }: FtrProviderContext) {
  const pageObjects = getPageObjects(['common', 'header']);
  const testSubjects = getService('testSubjects');

  return {
    async navigateToHostDetails(hostName: string): Promise<void> {
      await pageObjects.common.navigateToUrl('securitySolution', `hosts/${hostName}`, {
        shouldUseHashForSubUrl: false,
      });
      await pageObjects.header.waitUntilLoadingHasFinished();
    },

    async ensureOnHostDetails(): Promise<void> {
      await testSubjects.existOrFail('hostDetailsPage');
    },

    /**
     * Returns an object with the Endpoint overview data, where the keys are the visible labels in the UI.
     * Must be on the Host details in order for this page object to work
     */
    async hostDetailsEndpointOverviewData(): Promise<Record<string, string>> {
      await this.ensureOnHostDetails();
      const endpointDescriptionLists: WebElementWrapper[] = await testSubjects.findAll(
        'endpoint-overview'
      );

      const data: Record<string, string> = {};

      for (const dlElement of endpointDescriptionLists) {
        const $ = await dlElement.parseDomContent();

        const title = $('dt')
          .text()
          .replace(/&nbsp;/g, '')
          .trim();

        // The value could be draggable, in which case we need to grab the value displayed from a deeper element
        const $ddElement = $('dd');
        const $valueContainer = $ddElement.find('.draggable-keyboard-wrapper .euiToolTipAnchor');

        const value = ($valueContainer.length > 0 ? $valueContainer : $ddElement)
          .text()
          .replace(/&nbsp;/g, '')
          .trim();

        data[title] = value;
      }

      return data;
    },
  };
}
