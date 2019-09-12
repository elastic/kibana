/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['settings', 'common', 'graph', 'header']);
  const log = getService('log');
  const esArchiver = getService('esArchiver');
  const browser = getService('browser');

  // FLAKY: https://github.com/elastic/kibana/issues/45317
  describe.skip('graph', function() {
    before(async () => {
      await browser.setWindowSize(1600, 1000);
      log.debug('load graph/secrepo data');
      await esArchiver.loadIfNeeded('graph/secrepo');
      await esArchiver.load('empty_kibana');
      log.debug('create secrepo index pattern');
      await PageObjects.settings.createIndexPattern('secrepo', '@timestamp');
      log.debug('navigateTo graph');
      await PageObjects.common.navigateToApp('graph');
      await PageObjects.graph.createWorkspace();
    });

    const graphName = 'my Graph workspace name ' + new Date().getTime();

    const expectedNodes = [
      'blog',
      '/wordpress/wp-admin/',
      '202.136.75.194',
      '190.154.27.54',
      '187.131.21.37',
      'wp',
      '80.5.27.16',
      'login.php',
      '181.113.155.46',
      'admin',
      'wordpress',
      '/test/wp-admin/',
      'test',
      '/wp-login.php',
      '/blog/wp-admin/',
    ];

    const expectedConnectionWidth: Record<string, Record<string, number>> = {
      '/blog/wp-admin/': { wp: 2, blog: 5.51581 },
      wp: {
        blog: 2,
        '202.136.75.194': 2,
        'login.php': 2,
        admin: 2,
        '/test/wp-admin/': 2,
        '/wp-login.php': 2,
        '80.5.27.16': 2,
        '/wordpress/wp-admin/': 2,
        '190.154.27.54': 2,
        '187.131.21.37': 2,
        '181.113.155.46': 2,
      },
      admin: { test: 2, blog: 2, '/blog/wp-admin/': 2 },
      '/test/wp-admin/': { admin: 2 },
      test: { wp: 2, '/test/wp-admin/': 8.54514 },
      wordpress: { wp: 2, admin: 2.0311 },
      '/wordpress/wp-admin/': { wordpress: 9.70794, admin: 2.30771 },
    };

    async function buildGraph() {
      log.debug('select index pattern secrepo*');
      await PageObjects.graph.selectIndexPattern('secrepo*');
      // wait for the saved object to be loaded
      // TODO this race condition will be removed with eui-ification
      // of graph bar
      await PageObjects.common.sleep(1000);
      // select fields url.parts, url, params and src
      await PageObjects.graph.addField('url.parts');
      await PageObjects.graph.addField('url');
      await PageObjects.graph.addField('params');
      await PageObjects.graph.addField('src');
      await PageObjects.graph.query('admin');
      await PageObjects.common.sleep(8000);
    }

    it('should show correct node labels', async function() {
      await buildGraph();
      const { nodes } = await PageObjects.graph.getGraphObjects();
      const circlesText = nodes.map(({ label }) => label);
      expect(circlesText.length).to.equal(expectedNodes.length);
      expect(circlesText).to.eql(expectedNodes);
    });

    it('should show correct connections', async function() {
      const epsilon = Number.EPSILON;
      const expectedConnectionCount = Object.values(expectedConnectionWidth)
        .map(connections => Object.values(connections).length)
        .reduce((acc, n) => acc + n, 0);
      const { edges } = await PageObjects.graph.getGraphObjects();
      expect(edges.length).to.be(expectedConnectionCount);
      edges.forEach(edge => {
        const from = edge.sourceNode.label!;
        const to = edge.targetNode.label!;
        // fuzzy matching to take floating point rounding issues into account
        expect(expectedConnectionWidth[from][to]).to.be.within(
          edge.width - epsilon,
          edge.width + epsilon
        );
      });
    });

    it('should save Graph workspace', async function() {
      const graphExists = await PageObjects.graph.saveGraph(graphName);
      expect(graphExists).to.eql(true);
    });

    // open the same graph workspace again and make sure the results are the same
    it('should open Graph workspace', async function() {
      await PageObjects.graph.openGraph(graphName);
      const { nodes } = await PageObjects.graph.getGraphObjects();
      const circlesText = nodes.map(({ label }) => label);
      expect(circlesText.length).to.equal(expectedNodes.length);
      expect(circlesText).to.eql(expectedNodes);
    });

    it('should create new Graph workspace', async function() {
      await PageObjects.graph.newGraph();
      const { nodes, edges } = await PageObjects.graph.getGraphObjects();
      expect(nodes).to.be.empty();
      expect(edges).to.be.empty();
    });

    it('should show venn when clicking a line', async function() {
      await buildGraph();
      const { edges } = await PageObjects.graph.getGraphObjects();

      const blogAdminBlogEdge = edges.find(
        ({ sourceNode, targetNode }) =>
          sourceNode.label === '/blog/wp-admin/' && targetNode.label === 'blog'
      )!;

      await PageObjects.graph.isolateEdge(blogAdminBlogEdge);

      await PageObjects.graph.clickEdge(blogAdminBlogEdge);

      const vennTerm1 = await PageObjects.graph.getVennTerm1();
      log.debug('vennTerm1 = ' + vennTerm1);

      const vennTerm2 = await PageObjects.graph.getVennTerm2();
      log.debug('vennTerm2 = ' + vennTerm2);

      const smallVennTerm1 = await PageObjects.graph.getSmallVennTerm1();
      log.debug('smallVennTerm1 = ' + smallVennTerm1);

      const smallVennTerm12 = await PageObjects.graph.getSmallVennTerm12();
      log.debug('smallVennTerm12 = ' + smallVennTerm12);

      const smallVennTerm2 = await PageObjects.graph.getSmallVennTerm2();
      log.debug('smallVennTerm2 = ' + smallVennTerm2);

      expect(vennTerm1).to.be('/blog/wp-admin/');
      expect(vennTerm2).to.be('blog');
      expect(smallVennTerm1).to.be('5');
      expect(smallVennTerm12).to.be(' (5) ');
      expect(smallVennTerm2).to.be('8');
    });

    it('should delete graph', async function() {
      await PageObjects.graph.goToListingPage();
      expect(await PageObjects.graph.getWorkspaceCount()).to.equal(1);
      await PageObjects.graph.deleteGraph(graphName);
      expect(await PageObjects.graph.getWorkspaceCount()).to.equal(0);
    });
  });
}
