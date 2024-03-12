/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import type { AddModelFlyoutTabId } from '@kbn/ml-plugin/public/application/model_management/add_model_flyout';
import type { FtrProviderContext } from '../../ftr_provider_context';

export type FlyoutTabs = [AddModelFlyoutTabId];

export function TrainedModelsFlyoutProvider({ getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');

  const fiveSeconds = 5000;

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
      const [first, second] = await testSubjects.findAll(
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
          timeout: fiveSeconds,
        })
      ).to.be.ok();
    }

    public async assertOpen(expectOpen: boolean): Promise<void> {
      if (expectOpen) {
        await retry.tryForTime(fiveSeconds, async () => {
          await testSubjects.click('mlModelsAddTrainedModelButton');
        });
        await retry.tryForTime(fiveSeconds, async () => {
          await testSubjects.existOrFail('mlAddTrainedModelFlyout');
        });
      } else {
        await retry.tryForTime(fiveSeconds, async () => {
          await testSubjects.missingOrFail('mlAddTrainedModelFlyout');
        });
      }
    }

    public async close(): Promise<void> {
      await testSubjects.click('euiFlyoutCloseButton');
      await this.assertOpen(false);
    }

    public async assertFlyoutTabs(tabs: FlyoutTabs): Promise<void> {
      for await (const tab of tabs)
        await testSubjects.existOrFail(`mlAddTrainedModelFlyoutTab-${tab}`);
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
