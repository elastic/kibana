/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import type { AddModelFlyoutTabId } from '@kbn/ml-plugin/public/application/model_management/add_model_flyout';
import type { FtrProviderContext } from '../../ftr_provider_context';

export function TrainedModelsFlyoutProvider({ getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');

  return new (class ModelsFlyout {
    public async assertElserModelHeaderCopy(): Promise<void> {
      await testSubjects.existOrFail('mlAddTrainedModelFlyoutElserModelHeaderCopy', {
        timeout: 3_000,
      });
    }

    public async assertElserPanelsExist(): Promise<void> {
      await retry.tryForTime(3_000, async () => {
        await testSubjects.existOrFail('mlAddTrainedModelFlyoutModelPanel-elser-.elser_model_2');
        await testSubjects.existOrFail(
          'mlAddTrainedModelFlyoutModelPanel-elser-.elser_model_2_linux-x86_64'
        );
      });
    }

    public async assertE5PanelsExist(): Promise<void> {
      await retry.tryForTime(3_000, async () => {
        await testSubjects.existOrFail('mlAddTrainedModelFlyoutModelPanel-elser-.elser_model_2');
        await testSubjects.existOrFail(
          'mlAddTrainedModelFlyoutModelPanel-e5-.multilingual-e5-small_linux-x86_64'
        );
      });
    }

    public async assertDownloadButtonExists(): Promise<void> {
      await testSubjects.existOrFail('mlAddTrainedModelFlyoutDownloadButton', {
        timeout: 3_000,
      });
    }

    public async assertOpen(expectOpen: boolean): Promise<void> {
      if (expectOpen) {
        await testSubjects.existOrFail('mlAddTrainedModelFlyout', {
          timeout: 3_000,
        });
      } else {
        await testSubjects.missingOrFail('mlAddTrainedModelFlyout', {
          timeout: 3_000,
        });
      }
    }

    public async open() {
      await retry.tryForTime(3_000, async () => {
        await testSubjects.click('mlModelsAddTrainedModelButton');
        await this.assertOpen(true);
      });
    }

    public async close(): Promise<void> {
      await retry.tryForTime(3_000, async () => {
        await testSubjects.click('euiFlyoutCloseButton');
        await this.assertOpen(false);
      });
    }

    public async assertFlyoutTabs(tabs: AddModelFlyoutTabId[]): Promise<void> {
      const expectedTabCount = tabs.length;
      const actualTabs = await testSubjects.findAll('~mlAddTrainedModelFlyoutTab', 3_000);
      const actualTabCount = actualTabs.length;

      expect(expectedTabCount).to.be(actualTabCount);

      for await (const tab of tabs)
        await testSubjects.existOrFail(`mlAddTrainedModelFlyoutTab ${tab}`, {
          timeout: 3_000,
        });
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
