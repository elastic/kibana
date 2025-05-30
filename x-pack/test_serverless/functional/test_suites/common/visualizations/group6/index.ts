/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsArchiver } from '@kbn/es-archiver';
import { FtrProviderContext } from '../../../../ftr_provider_context';

export default ({ getService, loadTestFile, getPageObjects }: FtrProviderContext) => {
  const browser = getService('browser');
  const log = getService('log');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const PageObjects = getPageObjects(['timePicker', 'svlCommonPage']);
  const config = getService('config');
  let remoteEsArchiver;

  describe('lens serverless - group 1 - subgroup 6', function () {
    this.tags(['esGate']);

    const esArchive = 'x-pack/test/functional/es_archives/logstash_functional';
    const localIndexPatternString = 'logstash-*';
    const remoteIndexPatternString = 'ftr-remote:logstash-*';
    const localFixtures = {
      lensBasic: 'x-pack/test/functional/fixtures/kbn_archiver/lens/lens_basic.json',
      lensDefault: 'x-pack/test/functional/fixtures/kbn_archiver/lens/default',
    };

    const remoteFixtures = {
      lensBasic: 'x-pack/test/functional/fixtures/kbn_archiver/lens/ccs/lens_basic.json',
      lensDefault: 'x-pack/test/functional/fixtures/kbn_archiver/lens/ccs/default',
    };
    let esNode: EsArchiver;
    let fixtureDirs: {
      lensBasic: string;
      lensDefault: string;
    };
    let indexPatternString: string;
    before(async () => {
      log.debug('Starting lens before method');
      await browser.setWindowSize(1280, 1200);
      await kibanaServer.savedObjects.cleanStandardList();
      try {
        config.get('esTestCluster.ccs');
        remoteEsArchiver = getService('remoteEsArchiver' as 'esArchiver');
        esNode = remoteEsArchiver;
        fixtureDirs = remoteFixtures;
        indexPatternString = remoteIndexPatternString;
      } catch (error) {
        esNode = esArchiver;
        fixtureDirs = localFixtures;
        indexPatternString = localIndexPatternString;
      }

      await esNode.load(esArchive);
      await kibanaServer.uiSettings.update({
        defaultIndex: indexPatternString,
        'dateFormat:tz': 'UTC',
      });
      await kibanaServer.importExport.load(fixtureDirs.lensBasic);
      await kibanaServer.importExport.load(fixtureDirs.lensDefault);
      // changing the timepicker default here saves us from having to set it in Discover (~8s)
      await PageObjects.timePicker.setDefaultAbsoluteRangeViaUiSettings();
    });

    after(async () => {
      await esArchiver.unload(esArchive);
      await PageObjects.timePicker.resetDefaultAbsoluteRangeViaUiSettings();
      await kibanaServer.importExport.unload(fixtureDirs.lensBasic);
      await kibanaServer.importExport.unload(fixtureDirs.lensDefault);
      await kibanaServer.savedObjects.cleanStandardList();
    });

    loadTestFile(require.resolve('./logsdb.ts')); // 28m
  });
};
