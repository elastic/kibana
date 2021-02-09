/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { WebElementWrapper } from 'test/functional/services/lib/web_element_wrapper';
import { nudgeAnimationDuration } from '../../../plugins/security_solution/public/resolver/store/camera/scaling_constants';
import { FtrProviderContext } from '../ftr_provider_context';
import {
  deleteEventsStream,
  deleteAlertsStream,
  deleteMetadataStream,
  deletePolicyStream,
  deleteTelemetryStream,
} from '../../security_solution_endpoint_api_int/apis/data_stream_helper';

export interface DataStyle {
  left: string;
  top: string;
  width: string;
  height: string;
}

export function SecurityHostsPageProvider({ getService, getPageObjects }: FtrProviderContext) {
  const pageObjects = getPageObjects(['common', 'header']);
  const testSubjects = getService('testSubjects');
  const queryBar = getService('queryBar');
  const find = getService('find');

  /**
   * Returns the node IDs for the visible nodes in the resolver graph.
   */
  const findVisibleNodeIDs = async (): Promise<string[]> => {
    const visibleNodes = await testSubjects.findAll('resolver:node');
    return Promise.all(
      visibleNodes.map(async (node: WebElementWrapper) => {
        return node.getAttribute('data-test-resolver-node-id');
      })
    );
  };

  /**
   * This assumes you are on the process list in the panel and will find and click the node
   * with the given ID to bring it into view in the graph.
   *
   * @param id the ID of the node to find and click.
   */
  const clickNodeLinkInPanel = async (id: string): Promise<void> => {
    await navigateToProcessListInPanel();
    const panelNodeButton = await find.byCssSelector(
      `[data-test-subj='resolver:node-list:node-link'][data-test-node-id='${id}']`
    );

    await panelNodeButton?.click();
    // ensure that we wait longer than the animation time
    await pageObjects.common.sleep(nudgeAnimationDuration * 2);
  };

  /**
   * Finds all the pills for a particular node.
   *
   * @param id the ID of the node
   */
  const findNodePills = async (id: string): Promise<WebElementWrapper[]> => {
    return testSubjects.findAllDescendant(
      'resolver:map:node-submenu-item',
      await find.byCssSelector(
        `[data-test-subj='resolver:node'][data-test-resolver-node-id='${id}']`
      )
    );
  };

  /**
   * Navigate back to the process list view in the panel.
   */
  const navigateToProcessListInPanel = async () => {
    const [
      isOnNodeListPage,
      isOnCategoryPage,
      isOnNodeDetailsPage,
      isOnRelatedEventDetailsPage,
    ] = await Promise.all([
      testSubjects.exists('resolver:node-list', { timeout: 1 }),
      testSubjects.exists('resolver:node-events-in-category:breadcrumbs:node-list-link', {
        timeout: 1,
      }),
      testSubjects.exists('resolver:node-detail:breadcrumbs:node-list-link', { timeout: 1 }),
      testSubjects.exists('resolver:event-detail:breadcrumbs:node-list-link', { timeout: 1 }),
    ]);

    if (isOnNodeListPage) {
      return;
    } else if (isOnCategoryPage) {
      await (
        await testSubjects.find('resolver:node-events-in-category:breadcrumbs:node-list-link')
      ).click();
    } else if (isOnNodeDetailsPage) {
      await (await testSubjects.find('resolver:node-detail:breadcrumbs:node-list-link')).click();
    } else if (isOnRelatedEventDetailsPage) {
      await (await testSubjects.find('resolver:event-detail:breadcrumbs:node-list-link')).click();
    } else {
      // unknown page
      return;
    }

    await pageObjects.common.sleep(100);
  };

  /**
   * Click the zoom out control.
   */
  const clickZoomOut = async () => {
    await (await testSubjects.find('resolver:graph-controls:zoom-out')).click();
  };

  /**
   * Navigate to Events Panel
   */
  const navigateToEventsPanel = async () => {
    const isFullScreen = await testSubjects.exists('exit-full-screen', { timeout: 400 });
    if (isFullScreen) {
      await (await testSubjects.find('exit-full-screen')).click();
    }

    if (!(await testSubjects.exists('investigate-in-resolver-button', { timeout: 400 }))) {
      await (await testSubjects.find('navigation-hosts')).click();
      await testSubjects.click('navigation-events');
      await testSubjects.existOrFail('event');
    }
  };

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

  /**
   * Navigate to the Security Hosts page
   */
  const navigateToSecurityHostsPage = async () => {
    await pageObjects.common.navigateToUrlWithBrowserHistory('security', '/hosts/AllHosts');
    await pageObjects.header.waitUntilLoadingHasFinished();
  };

  /**
   * Finds a table and returns the data in a nested array with row 0 is the headers if they exist.
   * It uses euiTableCellContent to avoid polluting the array data with the euiTableRowCell__mobileHeader data.
   * @param dataTestSubj
   * @param element
   * @returns Promise<string[][]>
   */
  const getEndpointEventResolverNodeData = async (dataTestSubj: string, element: string) => {
    await testSubjects.exists(dataTestSubj);
    const Elements = await testSubjects.findAll(dataTestSubj);
    const $ = [];
    for (const value of Elements) {
      $.push(await value.getAttribute(element));
    }
    return $;
  };

  /**
   * Gets a array of not parsed styles and returns the Array of parsed styles.
   * @returns Promise<string[][]>
   */
  const parseStyles = async () => {
    const tableData = await getEndpointEventResolverNodeData('resolver:node', 'style');
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
  };
  /**
   * Deletes DataStreams from Index Management.
   */
  const deleteDataStreams = async () => {
    await deleteEventsStream(getService);
    await deleteAlertsStream(getService);
    await deletePolicyStream(getService);
    await deleteMetadataStream(getService);
    await deleteTelemetryStream(getService);
  };

  /**
   * execute Query And Open Resolver
   */
  const executeQueryAndOpenResolver = async (query: string) => {
    await navigateToEventsPanel();
    await queryBar.setQuery(query);
    await queryBar.submitQuery();
    await testSubjects.click('full-screen');
    await testSubjects.click('investigate-in-resolver-button');
  };

  return {
    navigateToProcessListInPanel,
    findNodePills,
    clickNodeLinkInPanel,
    findVisibleNodeIDs,
    clickZoomOut,
    navigateToEventsPanel,
    navigateToSecurityHostsPage,
    parseStyles,
    deleteDataStreams,
    executeQueryAndOpenResolver,
  };
}
