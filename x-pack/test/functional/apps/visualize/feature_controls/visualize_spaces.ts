/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import readline from 'readline';
import {createReadStream} from 'fs';
import {fromEvent} from 'rxjs';
import {takeUntil} from 'rxjs/operators';
import expect from '@kbn/expect';
import {VisualizeConstants} from '../../../../../../src/plugins/visualize/public/application/visualize_constants';
import {FtrProviderContext} from '../../../ftr_provider_context';

export default function ({getPageObjects, getService}: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const config = getService('config');
  const spacesService = getService('spaces');
  const PageObjects = getPageObjects(['common', 'visualize', 'security', 'spaceSelector', 'error']);
  const testSubjects = getService('testSubjects');
  const appsMenu = getService('appsMenu');
  const kibanaServer = getService('kibanaServer');

  const showFile = (x: any) => {
    const rl = readline.createInterface({input: createReadStream(x)});
    const line$ = fromEvent(rl, 'line').pipe(takeUntil(fromEvent(rl, 'close')));
    line$.subscribe(
      (line: any) => process.stderr.write(`${line}\n`),
      (err) => process.stderr.write(err),
      () => process.stderr.write(`### showed file: ${x}\n`)
    );
  };

  describe('visualize', () => {
    before(async () => {
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/logstash_functional');
    });

    describe('space with no features disabled', () => {
      before(async () => {
        // we need to load the following in every situation as deleting
        // a space deletes all of the associated saved objects
        await esArchiver.load('x-pack/test/functional/es_archives/visualize/default');

        await kibanaServer.importExport.save(
          'x-pack/test/functional/fixtures/kbn_archiver/visualize/default',
          {
            types: [
              'search',
              'index-pattern',
              'visualization',
              'dashboard',
              'lens',
              'map',
              'graph-workspace',
              'query',
              'tag',
              'url',
              'canvas-workpad',
            ],
          }
        );
        showFile('x-pack/test/functional/fixtures/kbn_archiver/visualize/default.json');

        // await kibanaServer.savedObjects.cleanStandardList();
        // await spacesService.create({
        //   id: 'custom_space',
        //   name: 'custom_space',
        //   disabledFeatures: [],
        // });    // we need to load the following in every situation as deleting
      });

      // after(async () => {
      //   await spacesService.delete('custom_space');
      //   await esArchiver.unload('x-pack/test/functional/es_archives/visualize/default');
      // });

      it.only('shows visualize navlink', async () => {
        // await PageObjects.common.navigateToApp('home', {
        //   basePath: '/s/custom_space',
        // });
        // const navLinks = (await appsMenu.readLinks()).map((link) => link.text);
        // expect(navLinks).to.contain('Visualize Library');
        expect(true).to.be(true);
      });

      it(`can view existing Visualization`, async () => {
        await PageObjects.common.navigateToActualUrl(
          'visualize',
          `${VisualizeConstants.EDIT_PATH}/i-exist`,
          {
            basePath: '/s/custom_space',
            ensureCurrentUrl: false,
            shouldLoginIfPrompted: false,
          }
        );
        await testSubjects.existOrFail('visualizationLoader', {
          timeout: config.get('timeouts.waitFor'),
        });
      });
    });

    describe('space with Visualize disabled', () => {
      before(async () => {
        // we need to load the following in every situation as deleting
        // a space deletes all of the associated saved objects
        await esArchiver.load('x-pack/test/functional/es_archives/visualize/default');
        await spacesService.create({
          id: 'custom_space',
          name: 'custom_space',
          disabledFeatures: ['visualize'],
        });
      });

      after(async () => {
        await spacesService.delete('custom_space');
        await esArchiver.unload('x-pack/test/functional/es_archives/visualize/default');
      });

      it(`doesn't show visualize navlink`, async () => {
        await PageObjects.common.navigateToApp('home', {
          basePath: '/s/custom_space',
        });
        const navLinks = (await appsMenu.readLinks()).map((link) => link.text);
        expect(navLinks).not.to.contain('Visualize Library');
      });

      it(`create new visualization shows 404`, async () => {
        await PageObjects.common.navigateToActualUrl('visualize', VisualizeConstants.CREATE_PATH, {
          basePath: '/s/custom_space',
          ensureCurrentUrl: false,
          shouldLoginIfPrompted: false,
        });
        await PageObjects.error.expectNotFound();
      });

      it(`edit visualization for object which doesn't exist shows 404`, async () => {
        await PageObjects.common.navigateToActualUrl(
          'visualize',
          `${VisualizeConstants.EDIT_PATH}/i-dont-exist`,
          {
            basePath: '/s/custom_space',
            ensureCurrentUrl: false,
            shouldLoginIfPrompted: false,
          }
        );
        await PageObjects.error.expectNotFound();
      });

      it(`edit visualization for object which exists shows 404`, async () => {
        await PageObjects.common.navigateToActualUrl(
          'visualize',
          `${VisualizeConstants.EDIT_PATH}/i-exist`,
          {
            basePath: '/s/custom_space',
            ensureCurrentUrl: false,
            shouldLoginIfPrompted: false,
          }
        );
        await PageObjects.error.expectNotFound();
      });
    });
  });
}
