/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EsArchiver } from '@kbn/es-archiver';
import { FtrProviderContext } from '../../ftr_provider_context';

export default ({ getService, loadTestFile, getPageObjects }: FtrProviderContext) => {
  const browser = getService('browser');
  const log = getService('log');
  const esArchiver = getService('esArchiver');
  const remoteEsArchiver = getService('remoteEsArchiver');
  const kibanaServer = getService('kibanaServer');
  const PageObjects = getPageObjects(['timePicker']);
  const config = getService('config');

  describe('lens app', () => {
    const localIndexPatternString = 'logstash-*';
    const remoteIndexPatternString = 'ftr-remote:logstash-*';
    const localFixtures = {
      esArchive: 'x-pack/test/functional/es_archives/logstash_functional',
      lensBasic: 'x-pack/test/functional/fixtures/kbn_archiver/lens/lens_basic.json',
      lensDefault: 'x-pack/test/functional/fixtures/kbn_archiver/lens/default',
    };

    const remoteFixtures = {
      esArchive: 'x-pack/test/functional/es_archives/logstash_functional',
      lensBasic: 'x-pack/test/functional/fixtures/kbn_archiver/lens/ccs/lens_basic.json',
      lensDefault: 'x-pack/test/functional/fixtures/kbn_archiver/lens/ccs/default',
    };
    let esNode: EsArchiver;
    let fixtureDirs: {
      esArchive: string;
      lensBasic: string;
      lensDefault: string;
    };
    let indexPatternString: string;
    before(async () => {
      await log.debug('Starting lens before method');
      await browser.setWindowSize(1280, 1200);
      try {
        config.get('esTestCluster.ccs');
        esNode = remoteEsArchiver;
        fixtureDirs = remoteFixtures;
        indexPatternString = remoteIndexPatternString;
      } catch (error) {
        esNode = esArchiver;
        fixtureDirs = localFixtures;
        indexPatternString = localIndexPatternString;
      }
      await log.debug(fixtureDirs);
      await log.debug(esNode);
      await esNode.load(fixtureDirs.esArchive);
      // changing the timepicker default here saves us from having to set it in Discover (~8s)
      await PageObjects.timePicker.setDefaultAbsoluteRangeViaUiSettings();
      await kibanaServer.uiSettings.update({
        defaultIndex: indexPatternString,
        'dateFormat:tz': 'UTC',
      });
      await kibanaServer.importExport.load(fixtureDirs.lensBasic);
      await kibanaServer.importExport.load(fixtureDirs.lensDefault);
    });

    after(async () => {
      await esArchiver.unload(fixtureDirs.esArchive);
      await PageObjects.timePicker.resetDefaultAbsoluteRangeViaUiSettings();
      await kibanaServer.importExport.unload(fixtureDirs.lensBasic);
      await kibanaServer.importExport.unload(fixtureDirs.lensDefault);
    });

    if (config.get('esTestCluster.ccs')) {
      describe('', function () {
        this.tags(['ciGroup3', 'skipFirefox']);
        loadTestFile(require.resolve('./smokescreen'));
      });
    } else {
      describe('', function () {
        this.tags(['ciGroup3', 'skipFirefox']);
        loadTestFile(require.resolve('./smokescreen'));
        loadTestFile(require.resolve('./persistent_context'));
      });

      describe('', function () {
        this.tags(['ciGroup16', 'skipFirefox']);

        loadTestFile(require.resolve('./add_to_dashboard'));
        loadTestFile(require.resolve('./table_dashboard'));
        loadTestFile(require.resolve('./table'));
        loadTestFile(require.resolve('./runtime_fields'));
        loadTestFile(require.resolve('./dashboard'));
        loadTestFile(require.resolve('./multi_terms'));
        loadTestFile(require.resolve('./epoch_millis'));
        loadTestFile(require.resolve('./show_underlying_data'));
        loadTestFile(require.resolve('./show_underlying_data_dashboard'));
      });

      describe('', function () {
        this.tags(['ciGroup4', 'skipFirefox']);

        loadTestFile(require.resolve('./colors'));
        loadTestFile(require.resolve('./chart_data'));
        loadTestFile(require.resolve('./time_shift'));
        loadTestFile(require.resolve('./drag_and_drop'));
        loadTestFile(require.resolve('./disable_auto_apply'));
        loadTestFile(require.resolve('./geo_field'));
        loadTestFile(require.resolve('./formula'));
        loadTestFile(require.resolve('./heatmap'));
        loadTestFile(require.resolve('./gauge'));
        loadTestFile(require.resolve('./metrics'));
        loadTestFile(require.resolve('./reference_lines'));
        loadTestFile(require.resolve('./inspector'));
        loadTestFile(require.resolve('./error_handling'));
        loadTestFile(require.resolve('./lens_tagging'));
        loadTestFile(require.resolve('./lens_reporting'));
        loadTestFile(require.resolve('./tsvb_open_in_lens'));
        // has to be last one in the suite because it overrides saved objects
        loadTestFile(require.resolve('./rollup'));
      });
    }
  });
};
