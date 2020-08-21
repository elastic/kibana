/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../ftr_provider_context';

export function SecurityHostsPageProvider({ getService, getPageObjects }: FtrProviderContext) {
  const pageObjects = getPageObjects(['common', 'header']);
  const testSubjects = getService('testSubjects');

  /**
   * @function parseStyles
   * Parses a string of inline styles into a javascript object with casing for react
   *
   * @param {string} styles
   * @returns {Object}
   */
  const parseStyle = (styles: any) =>
    styles
      .split(';')
      .filter((style: any) => style.split(':')[0] && style.split(':')[1])
      .map((style: any) => [
        style
          .split(':')[0]
          .trim()
          .replace(/-./g, (c: any) => c.substr(1).toUpperCase()),
        style.split(':').slice(1).join(':').trim(),
      ])
      .reduce(
        (styleObj: any, style: any) => ({
          ...styleObj,
          [style[0]]: style[1],
        }),
        {}
      );
  return {
    /**
     * Navigate to the Security Hosts page
     */
    async navigateToSecurityHostsPage() {
      await pageObjects.common.navigateToUrlWithBrowserHistory('security', '/hosts/AllHosts');
      await pageObjects.header.waitUntilLoadingHasFinished();
    },
    /**
     * Finds a table and returns the data in a nested array with row 0 is the headers if they exist.
     * It uses euiTableCellContent to avoid poluting the array data with the euiTableRowCell__mobileHeader data.
     * @param dataTestSubj
     * @param element
     * @returns Promise<string[][]>
     */
    async getEndpointAlertResolverNodeData(dataTestSubj: string, element: string) {
      await testSubjects.exists(dataTestSubj);
      const Elements = await testSubjects.findAll(dataTestSubj);
      const $ = [];
      // console.log(Elements.length);
      for (const value of Elements) {
        $.push(await value.getAttribute(element));
      }
      return $;
    },

    /**
     * Gets a array of not parsed styles and returns the Array of parsed styles.
     * @returns Promise<string[][]>
     * @param dataTestSubj
     * @param element
     */
    async parseStyles(dataTestSubj: string, element: string) {
      const tableData = await this.getEndpointAlertResolverNodeData(dataTestSubj, element);
      const $ = [];
      for (let i = 1; i < tableData.length; i++) {
        const eachStyle = parseStyle(tableData[i]);
        $.push(eachStyle);
      }
      return $;
    },
  };
}
