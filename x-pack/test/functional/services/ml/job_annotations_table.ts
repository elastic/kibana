/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { ProvidedType } from '@kbn/test';
import { FtrProviderContext } from '../../ftr_provider_context';
export type MlJobAnnotations = ProvidedType<typeof MachineLearningJobAnnotationsProvider>;

export function MachineLearningJobAnnotationsProvider({ getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const find = getService('find');
  const browser = getService('browser');

  return new (class MlJobAnnotations {
    public async parseJobAnnotationTable() {
      const table = await testSubjects.find('~mlAnnotationsTable');
      const $ = await table.parseDomContent();
      const rows = [];

      for (const tr of $.findTestSubjects('~mlAnnotationsTableRow').toArray()) {
        const $tr = $(tr);

        rows.push({
          annotation: $tr
            .findTestSubject('mlAnnotationsColumnAnnotation')
            .find('.euiTableCellContent')
            .text()
            .trim(),
          from: $tr
            .findTestSubject('mlAnnotationsColumnFrom')
            .find('.euiTableCellContent')
            .text()
            .trim(),
          to: $tr
            .findTestSubject('mlAnnotationsColumnTo')
            .find('.euiTableCellContent')
            .text()
            .trim(),
          modifiedTime: $tr
            .findTestSubject('mlAnnotationsColumnModifiedDate')
            .find('.euiTableCellContent')
            .text()
            .trim(),
          modifiedBy: $tr
            .findTestSubject('mlAnnotationsColumnModifiedBy')
            .find('.euiTableCellContent')
            .text()
            .trim(),
          event: $tr
            .findTestSubject('mlAnnotationsColumnEvent')
            .find('.euiTableCellContent')
            .text()
            .trim(),
        });
      }

      return rows;
    }

    public async parseJobAnnotationTableRow(annotationId: string) {
      const table = await testSubjects.find('~mlAnnotationsTable');
      const $ = await table.parseDomContent();
      const rows = [];

      for (const tr of $.findTestSubjects(`~row-${annotationId}`).toArray()) {
        const $tr = $(tr);

        rows.push({
          annotation: $tr
            .findTestSubject('mlAnnotationsColumnAnnotation')
            .find('.euiTableCellContent')
            .text()
            .trim(),
          from: $tr
            .findTestSubject('mlAnnotationsColumnFrom')
            .find('.euiTableCellContent')
            .text()
            .trim(),
          to: $tr
            .findTestSubject('mlAnnotationsColumnTo')
            .find('.euiTableCellContent')
            .text()
            .trim(),
          modifiedTime: $tr
            .findTestSubject('mlAnnotationsColumnModifiedDate')
            .find('.euiTableCellContent')
            .text()
            .trim(),
          modifiedBy: $tr
            .findTestSubject('mlAnnotationsColumnModifiedBy')
            .find('.euiTableCellContent')
            .text()
            .trim(),
          event: $tr
            .findTestSubject('mlAnnotationsColumnEvent')
            .find('.euiTableCellContent')
            .text()
            .trim(),
        });
      }

      return rows[0];
    }

    public rowSelector(annotationId: string, subSelector?: string) {
      const row = `~mlAnnotationsTable > ~row-${annotationId}`;
      return !subSelector ? row : `${row} > ${subSelector}`;
    }

    public async ensureSingleMetricViewerAnnotationsPanelOpen() {
      await retry.tryForTime(10000, async () => {
        if (!(await testSubjects.exists('mlAnnotationsTable'))) {
          await testSubjects.click('mlAnomalyExplorerAnnotations loaded');
          await testSubjects.existOrFail('mlAnnotationsTable');
        }
      });
    }

    public async ensureAnomalyExplorerAnnotationsPanelOpen() {
      await retry.tryForTime(10000, async () => {
        if (!(await testSubjects.exists('mlAnnotationsTable'))) {
          await testSubjects.click('mlAnomalyExplorerAnnotationsPanelButton');
          await testSubjects.existOrFail('mlAnnotationsTable');
        }
      });
    }

    public async assertAnnotationsTableExists() {
      await retry.tryForTime(1000, async () => {
        await testSubjects.existOrFail('mlAnnotationsTable');
      });
    }

    public async assertAnnotationsRowExists(annotationId: string) {
      await retry.tryForTime(5 * 1000, async () => {
        await testSubjects.existOrFail(this.rowSelector(annotationId));
      });
    }

    public async assertAnnotationsRowMissing(annotationId: string) {
      await retry.tryForTime(5 * 1000, async () => {
        await testSubjects.missingOrFail(this.rowSelector(annotationId));
      });
    }

    public async assertAnnotationContentById(
      annotationId: string,
      expectedEntries: Record<string, string>
    ) {
      await this.assertAnnotationsTableExists();
      await this.assertAnnotationsRowExists(annotationId);

      await retry.tryForTime(30 * 1000, async () => {
        const parsedRow = await this.parseJobAnnotationTableRow(annotationId);
        for (const [key, value] of Object.entries(expectedEntries)) {
          expect(parsedRow)
            .to.have.property(key)
            .eql(
              value,
              `Expected annotation row ${annotationId} to have '${key}' with value '${value}'`
            );
        }
      });
    }

    public async assertAnnotationExists(expectedEntries: Record<'annotation' | string, string>) {
      await this.assertAnnotationsTableExists();

      await retry.tryForTime(30 * 1000, async () => {
        const parsedTable = await this.parseJobAnnotationTable();
        const parsedRow = parsedTable.find((t) => t.annotation === expectedEntries.annotation);
        expect(parsedRow).to.be.ok();
        for (const [key, value] of Object.entries(expectedEntries)) {
          expect(parsedRow)
            .to.have.property(key)
            .eql(value, `Expected annotation table to have '${key}' with value '${value}'`);
        }
      });
    }

    public async assertAnnotationsEditActionExists(annotationId: string) {
      await retry.tryForTime(1000, async () => {
        await testSubjects.existOrFail(this.rowSelector(annotationId, 'mlAnnotationsActionEdit'));
      });
    }

    public async clickAnnotationsEditAction(annotationId: string) {
      await this.assertAnnotationsEditActionExists(annotationId);
      await retry.tryForTime(1000, async () => {
        await testSubjects.clickWhenNotDisabledWithoutRetry(
          this.rowSelector(annotationId, 'mlAnnotationsActionEdit')
        );
        await testSubjects.existOrFail('mlAnnotationFlyout');
        await testSubjects.existOrFail('mlAnnotationFlyoutTitle');

        const title = await testSubjects.getVisibleText('mlAnnotationFlyoutTitle');
        expect(title).to.eql(
          'Edit annotation',
          `Expected annotations flyout title to be 'Edit annotation' but got ${title}`
        );
      });
    }

    public async parseAnnotationFlyoutList() {
      const table = await testSubjects.find('mlAnnotationDescriptionList');
      const $ = await table.parseDomContent();
      const dt = $('dt')
        .toArray()
        .map((key) =>
          $(key)
            .text()
            .replace(/&nbsp;/g, '')
            .trim()
        );
      const dd = $('dd')
        .toArray()
        .map((key) =>
          $(key)
            .text()
            .replace(/&nbsp;/g, '')
            .trim()
        );
      return Object.assign({}, ...dt.map((n, index) => ({ [n]: dd[index] })));
    }

    public async assertAnnotationsEditFlyoutContent(expectedEntries: Record<string, string>) {
      await retry.tryForTime(1000, async () => {
        await testSubjects.existOrFail('mlAnnotationFlyout');
        await testSubjects.existOrFail('mlAnnotationsFlyoutTextInput');
        await testSubjects.existOrFail('mlAnnotationsFlyoutDeleteButton');
        await testSubjects.existOrFail('annotationFlyoutUpdateOrCreateButton');
        await testSubjects.existOrFail('mlAnnotationsFlyoutCancelButton');

        const buttonTxt = await testSubjects.getVisibleText('annotationFlyoutUpdateOrCreateButton');
        expect(buttonTxt).to.eql(
          'Update',
          `Expected annotations flyout button to be 'Update' but got ${buttonTxt}`
        );

        const parsedContent = await this.parseAnnotationFlyoutList();
        await retry.tryForTime(1000, async () => {
          for (const [key, value] of Object.entries(parsedContent)) {
            expect(expectedEntries)
              .to.have.property(key)
              .eql(
                value,
                `Expected annotations flyout description '${key}' to exist with value '${value}'`
              );
          }
        });
      });
    }

    public async setAnnotationText(text: string) {
      await retry.tryForTime(1000, async () => {
        await testSubjects.existOrFail(`mlAnnotationsFlyoutTextInput`);
        await testSubjects.setValue(`mlAnnotationsFlyoutTextInput`, text, {
          clearWithKeyboard: true,
        });

        await testSubjects.existOrFail('annotationFlyoutUpdateOrCreateButton');
        await testSubjects.click('annotationFlyoutUpdateOrCreateButton');
        await testSubjects.missingOrFail('mlAnnotationFlyout');
      });
    }

    public async deleteAnnotation(annotationId: string) {
      await retry.tryForTime(1000, async () => {
        await this.clickAnnotationsEditAction(annotationId);
        await testSubjects.existOrFail('mlAnnotationFlyout');
        await testSubjects.existOrFail('mlAnnotationsFlyoutDeleteButton');
        await testSubjects.clickWhenNotDisabledWithoutRetry('mlAnnotationsFlyoutDeleteButton');
        await testSubjects.existOrFail('mlAnnotationFlyoutConfirmDeleteModal');
        await testSubjects.clickWhenNotDisabledWithoutRetry(
          '~mlAnnotationFlyoutConfirmDeleteModal > ~confirmModalConfirmButton'
        );
      });
    }

    public async openCreateAnnotationFlyout() {
      await retry.tryForTime(30 * 1000, async () => {
        const el = await find.byClassName('ml-annotation__brush');

        // simulate click and drag on the focus chart
        // to generate annotation
        await browser.dragAndDrop(
          {
            location: el,
            offset: {
              x: 0,
              y: -100,
            },
          },
          {
            location: el,
            offset: {
              x: 100,
              y: -100,
            },
          }
        );
        await testSubjects.existOrFail('mlAnnotationFlyout');
      });
    }

    public async assertAnnotationsCreateFlyoutContent(expectedEntries: Record<string, string>) {
      await retry.tryForTime(1000, async () => {
        await testSubjects.existOrFail('mlAnnotationFlyout');
        await testSubjects.existOrFail('mlAnnotationsFlyoutTextInput');
        await testSubjects.existOrFail('annotationFlyoutUpdateOrCreateButton');
        await testSubjects.existOrFail('mlAnnotationsFlyoutCancelButton');

        const buttonTxt = await testSubjects.getVisibleText('annotationFlyoutUpdateOrCreateButton');

        expect(buttonTxt).to.eql(
          'Create',
          `Expected annotations flyout button to be 'Create' but got ${buttonTxt}`
        );

        const parsedContent = await this.parseAnnotationFlyoutList();
        await retry.tryForTime(1000, async () => {
          for (const [key, value] of Object.entries(parsedContent)) {
            expect(expectedEntries)
              .to.have.property(key)
              .eql(
                value,
                `Expected annotations flyout description '${key}' to exist with value '${value}'`
              );
          }
        });
      });
    }

    public async createAnnotation(text: string) {
      await retry.tryForTime(30 * 1000, async () => {
        await this.openCreateAnnotationFlyout();
        await this.setAnnotationText(text);
      });
    }

    public async assertAnnotationsDelayedDataChartActionExists() {
      await retry.tryForTime(1000, async () => {
        await testSubjects.existOrFail('mlAnnotationsActionViewDatafeed');
      });
    }

    public async ensureAllMenuPopoversClosed() {
      await retry.tryForTime(5000, async () => {
        await browser.pressKeys(browser.keys.ESCAPE);
        const popoverExists = await find.existsByCssSelector('euiContextMenuPanel');
        expect(popoverExists).to.eql(false, 'All popovers should be closed');
      });
    }

    public async ensureAnnotationsActionsMenuOpen(annotationId: string) {
      await retry.tryForTime(10 * 1000, async () => {
        await this.ensureAllMenuPopoversClosed();
        await testSubjects.click(
          `mlAnnotationsTableRow row-${annotationId} > euiCollapsedItemActionsButton`,
          30 * 1000
        );
        await find.existsByCssSelector('euiContextMenuPanel');
      });
    }

    public async openDatafeedChartFlyout(annotationId: string, jobId: string) {
      await retry.tryForTime(10 * 1000, async () => {
        await this.ensureAnnotationsActionsMenuOpen(annotationId);
        await this.assertAnnotationsDelayedDataChartActionExists();

        await testSubjects.clickWhenNotDisabledWithoutRetry('mlAnnotationsActionViewDatafeed');
        await testSubjects.existOrFail('mlAnnotationsViewDatafeedFlyout');
        await testSubjects.existOrFail('mlAnnotationsViewDatafeedFlyoutTitle');

        const title = await testSubjects.getVisibleText('mlAnnotationsViewDatafeedFlyoutTitle');
        expect(title).to.eql(
          `Datafeed chart for ${jobId}`,
          `Expected annotations flyout title to be 'Datafeed chart for ${jobId}' but got ${title}`
        );
      });
    }

    public async assertDelayedDataChartExists() {
      await testSubjects.existOrFail('mlAnnotationsViewDatafeedFlyoutChart');
    }
  })();
}
