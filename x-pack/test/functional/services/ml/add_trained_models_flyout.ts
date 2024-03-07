/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import type { FtrProviderContext } from '../../ftr_provider_context';

export type AddTrainedModelUser = 'power' | 'viewer';

export function TrainedModelsFlyoutProvider({ getService }: FtrProviderContext) {
  const find = getService('find');
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');

  const twentySeconds = 10000 * 2;

  return new (class ModelsFlyout {
    public async assertElserModelHeaderCopy(): Promise<void> {
      const selector = 'div.euiFlyoutBody div p div.euiText';
      const [first] = await find.allByCssSelector(selector);
      const visibleText = await first.getVisibleText();
      expect(visibleText).to.match(
        /ELSER is Elastic's NLP model for English semantic search, utilizing sparse vectors. It prioritizes intent and contextual meaning over literal term matching, optimized specifically for English documents and queries on the Elastic platform./
      );
    }

    public async assertElserPanelsExist(): Promise<void> {
      const first = 'input.euiRadio__input[type="radio"][name=".elser_model_2"]';
      expect(await find.existsByCssSelector(first)).to.be.ok();

      const second = 'input.euiRadio__input[type="radio"][name=".elser_model_2_linux-x86_64"]';
      expect(await find.existsByCssSelector(second)).to.be.ok();
    }

    public async assertE5PanelsExist(): Promise<void> {
      const first = 'input.euiRadio__input[type="radio"][name=".multilingual-e5-small"]';
      expect(await find.existsByCssSelector(first)).to.be.ok();

      const second =
        'input.euiRadio__input[type="radio"][name=".multilingual-e5-small_linux-x86_64"]';
      expect(await find.existsByCssSelector(second)).to.be.ok();
    }

    public async assertDownloadButtonExists(): Promise<void> {
      const selector = 'div[class^="euiFlyoutBody"] button.euiButton span';
      expect(await find.existsByCssSelector(selector)).to.be.ok();
    }

    public async open(): Promise<void> {
      await retry.waitFor('Add Trained Model Button', () =>
        testSubjects.exists('mlModelsAddTrainedModelButton')
      );
      await testSubjects.clickWhenNotDisabled('mlModelsAddTrainedModelButton', {
        timeout: twentySeconds,
      });
    }

    public async assertOpen(): Promise<void> {
      await retry.try(async () => {
        await testSubjects.exists('mlAddTrainedModelFlyout', {
          timeout: twentySeconds,
        });
      });
    }

    public async close(): Promise<void> {
      await testSubjects.click('euiFlyoutCloseButton');
    }

    public async assertClosed(): Promise<void> {
      await testSubjects.missingOrFail('mlAddTrainedModelFlyout', {
        timeout: twentySeconds,
      });
    }

    public async assertTabsDifferPerUser(user: AddTrainedModelUser): Promise<void> {
      const selector =
        'div.euiFlyoutHeader div.euiTabs[role~="tablist"] button[role="tab"].euiTab span.euiTab__content';

      if (user === 'viewer') {
        const el = await find.byCssSelector(selector);
        const visibleText = await el.getVisibleText();
        expect(visibleText).to.match(/Manual Download/);

        return;
      }

      if (user === 'power') {
        const [clickToDownload, manualDownload] = await find.allByCssSelector(selector);

        expect(await clickToDownload.getVisibleText()).to.match(/Click to Download/);
        expect(await manualDownload.getVisibleText()).to.match(/Manual Download/);

        return;
      }
    }

    public async assertElandPythonClientCodeBlocks() {
      const [pipInstall, condaInstall, exampleImport] = await find.allByCssSelector(
        'div.euiFlyoutBody div.euiCodeBlock'
      );
      expect(await pipInstall.getVisibleText()).to.match(/python -m pip install eland/);
      expect(await condaInstall.getVisibleText()).to.match(/conda install -c conda-forge eland/);
      expect(await exampleImport.getVisibleText()).to.match(/eland_import_hub_model/);
    }
  })();
}
