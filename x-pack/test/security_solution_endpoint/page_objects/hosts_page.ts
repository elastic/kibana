/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../ftr_provider_context';
import { deleteEventsStream } from '../../security_solution_endpoint_api_int/apis/data_stream_helper';
import { deleteAlertsStream } from '../../security_solution_endpoint_api_int/apis/data_stream_helper';
import { deleteMetadataStream } from '../../security_solution_endpoint_api_int/apis/data_stream_helper';
import { deletePolicyStream } from '../../security_solution_endpoint_api_int/apis/data_stream_helper';
import { deleteTelemetryStream } from '../../security_solution_endpoint_api_int/apis/data_stream_helper';
export interface DataStyle {
  left: string;
  top: string;
  width: string;
  height: string;
}

export function SecurityHostsPageProvider({ getService, getPageObjects }: FtrProviderContext) {
  const pageObjects = getPageObjects(['common', 'header']);
  const testSubjects = getService('testSubjects');

  /**
   * @function parseStyles
   * Parses a string of inline styles into a typescript object with casing for react
   * @param {string} styles
   * @returns {Object}
   */
  const parseStyle = (
    styles: string
  ): {
    left?: string;
    top?: string;
    width?: string;
    height?: string;
  } =>
    styles
      .split(';')
      .filter((style: string) => style.split(':')[0] && style.split(':')[1])
      .map((style: string) => [
        style
          .split(':')[0]
          .trim()
          .replace(/-./g, (c: string) => c.substr(1).toUpperCase()),
        style.split(':').slice(1).join(':').trim(),
      ])
      .reduce(
        (styleObj: {}, style: string[]) => ({
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
    async getEndpointEventResolverNodeData(dataTestSubj: string, element: string) {
      await testSubjects.exists(dataTestSubj);
      const Elements = await testSubjects.findAll(dataTestSubj);
      const $ = [];
      for (const value of Elements) {
        $.push(await value.getAttribute(element));
      }
      return $;
    },

    /**
     * Gets a array of not parsed styles and returns the Array of parsed styles.
     * @returns Promise<string[][]>
     */
    async parseStyles() {
      const tableData = await this.getEndpointEventResolverNodeData('resolver:node', 'style');
      const styles: DataStyle[] = [];
      for (let i = 1; i < tableData.length; i++) {
        const eachStyle = parseStyle(tableData[i]);
        styles.push({
          top: eachStyle.top ?? '',
          height: eachStyle.height ?? '',
          left: eachStyle.left ?? '',
          width: eachStyle.width ?? '',
        });
      }
      return styles;
    },
    /**
     * Deletes DataStreams from Index Management.
     */
    async deleteDataStreams() {
      await deleteEventsStream(getService);
      await deleteAlertsStream(getService);
      await deletePolicyStream(getService);
      await deleteMetadataStream(getService);
      await deleteTelemetryStream(getService);
    },
  };
}
