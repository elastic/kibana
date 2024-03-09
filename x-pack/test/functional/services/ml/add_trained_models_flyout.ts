/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import type { FtrProviderContext } from '../../ftr_provider_context';

type FlyoutTabManualDownload = 'Manual Download';
type FlyoutTabClickToDownload = 'Click to Download';
export type FlyoutTabs =
  | [FlyoutTabManualDownload]
  | [FlyoutTabClickToDownload, FlyoutTabManualDownload];

export function TrainedModelsFlyoutProvider({ getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');

  const tenSeconds = 10000;

  return new (class ModelsFlyout {
    public async assertElserModelHeaderCopy(): Promise<void> {
      const visibleText = await testSubjects.getVisibleText(
        'mlAddTrainedModelFlyoutElserModelHeaderCopy'
      );
      expect(visibleText).to.match(
        /ELSER is Elastic's NLP model for English semantic search, utilizing sparse vectors. It prioritizes intent and contextual meaning over literal term matching, optimized specifically for English documents and queries on the Elastic platform./
      );
    }

    public async assertElserPanelsExist(): Promise<void> {
      const [first, second, ,] = await testSubjects.findAll(
        'mlAddTrainedModelFlyoutChooseModelPanels'
      );

      expect(first).to.be.ok();
      expect(second).to.be.ok();
    }

    public async assertE5PanelsExist(): Promise<void> {
      const [, , third, fourth] = await testSubjects.findAll(
        'mlAddTrainedModelFlyoutChooseModelPanels'
      );

      expect(third).to.be.ok();
      expect(fourth).to.be.ok();
    }

    public async assertDownloadButtonExists(): Promise<void> {
      expect(
        await testSubjects.exists('mlAddTrainedModelFlyoutDownloadButton', {
          timeout: tenSeconds / 2,
        })
      ).to.be.ok();
    }

    public async open(): Promise<void> {
      await retry.waitFor(
        'Add Trained Model Button',
        async () => await testSubjects.exists('mlModelsAddTrainedModelButton')
      );
      await testSubjects.clickWhenNotDisabled('mlModelsAddTrainedModelButton', {
        timeout: tenSeconds,
      });
    }

    public async assertOpen(): Promise<void> {
      await retry.try(async () => {
        await testSubjects.exists('mlAddTrainedModelFlyout', {
          timeout: tenSeconds,
        });
      });
    }

    public async close(): Promise<void> {
      await testSubjects.click('euiFlyoutCloseButton');
    }

    public async assertClosed(): Promise<void> {
      await testSubjects.missingOrFail('mlAddTrainedModelFlyout', {
        timeout: tenSeconds,
      });
    }

    public async assertFlyoutTabs(tabs: FlyoutTabs): Promise<void> {
      const normalized = tabs.map((tab) => `mlAddTrainedModelFlyoutTab-${normalize(tab)}`);

      for await (const tab of normalized) {
        const visibleText = await testSubjects.getVisibleText(tab);
        expect(tabs.some((x) => x === visibleText)).to.be.ok();
      }

      function normalize(tabName: string) {
        return tabName.toLowerCase().split(' ').join('');
      }
    }

    public async assertElandPythonClientCodeBlocks() {
      expect(await testSubjects.getVisibleText('mlElandPipInstallCodeBlock')).to.match(
        /python -m pip install eland/
      );
      expect(await testSubjects.getVisibleText('mlElandCondaInstallCodeBlock')).to.match(
        /conda install -c conda-forge eland/
      );
      expect(await testSubjects.getVisibleText('mlElandExampleImportCodeBlock')).to.match(
        /eland_import_hub_model/
      );
    }
  })();
}
