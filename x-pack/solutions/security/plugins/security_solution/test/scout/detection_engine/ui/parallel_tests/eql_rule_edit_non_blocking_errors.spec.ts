/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// import { appendFileSync } from 'fs';
import { EQL_RULE } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/ui';
import { spaceTest, tags } from '../fixtures';

const MISSING_FIELD_QUERY = 'any where hello.world';
// TEMPORARY DIAGNOSTIC output file. Remove with the diagnostic code before merging.
// const DIAG_FILE =
//   '/private/tmp/claude-501/-Users-edgar-santos-kibana-denar50/b4385aed-6aa9-4289-be21-66ba5c986d3b/scratchpad/eql_diag.log';
// const diag = (line: string): void =>
//   appendFileSync(DIAG_FILE, `${new Date().toISOString()} ${line}\n`);

// Each space gets its own source index so the missing-field case does not depend on other data.
// `endgame-*` is readable by the platform engineer role, which runs the EQL validation request.
const sourceIndexName = (spaceId: string): string =>
  `endgame-scout-eql-rule-edit-${spaceId.replace(/[^a-z0-9]/gi, '').toLowerCase()}`;

spaceTest.describe(
  'EQL rule editing with non-blocking query validation errors',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    spaceTest.beforeAll(async ({ esClient, scoutSpace }) => {
      const index = sourceIndexName(scoutSpace.id);
      await esClient.indices.delete({ index, ignore_unavailable: true });
      await esClient.indices.create({
        index,
        mappings: {
          properties: {
            '@timestamp': { type: 'date' },
            process: { properties: { name: { type: 'keyword' } } },
          },
        },
      });
    });

    spaceTest.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsPlatformEngineer();
    });

    spaceTest.afterEach(async ({ apiServices }) => {
      await apiServices.detectionRule.deleteAll();
    });

    spaceTest.afterAll(async ({ esClient, scoutSpace }) => {
      await esClient.indices.delete({
        index: sourceIndexName(scoutSpace.id),
        ignore_unavailable: true,
      });
    });

    spaceTest(
      'saves the rule after confirming the warning when the data source does not exist',
      async ({ apiServices, pageObjects }) => {
        const { id } = await apiServices.detectionRule.createEqlRule({
          ...EQL_RULE,
          enabled: false,
          index: ['fake*'],
        });

        const { ruleEditPage } = pageObjects;
        await ruleEditPage.navigate(id);
        await expect(ruleEditPage.eqlQueryInput).toHaveValue(EQL_RULE.query);

        await ruleEditPage.save();
        await expect(ruleEditPage.saveWithWarningsModal).toBeVisible();
        await expect(ruleEditPage.saveWithWarningsModal).toContainText('EQL Query:');
        await expect(ruleEditPage.saveWithWarningsModal).toContainText('index_not_found_exception');

        await ruleEditPage.confirmSaveWithWarnings();
        await expect(ruleEditPage.saveWithWarningsModal).toBeHidden();
        await expect(ruleEditPage.ruleDetailsAboutSection).toBeVisible();
      }
    );

    spaceTest(
      'saves the rule after confirming the warning when a queried field does not exist',
      async ({ apiServices, log, page, pageObjects, scoutSpace }) => {
        const { id } = await apiServices.detectionRule.createEqlRule({
          ...EQL_RULE,
          enabled: false,
          index: [sourceIndexName(scoutSpace.id)],
          query: MISSING_FIELD_QUERY,
        });

        const { ruleEditPage } = pageObjects;
        await ruleEditPage.navigate(id);
        await expect(ruleEditPage.eqlQueryInput).toHaveValue(MISSING_FIELD_QUERY);

        // TEMPORARY DIAGNOSTIC: record the EQL validation requests to find out why the modal is
        // sometimes missing on serverless. Remove before merging.
        const eqlValidations: string[] = [];
        //diag(`START worker=${scoutSpace.id} rule=${id}`);
        page.on('response', async (response) => {
          if (!response.url().includes('/internal/search/eql')) return;
          const params = response.request().postDataJSON()?.params;
          const entry = JSON.stringify({
            status: response.status(),
            index: params?.index,
            query: params?.query,
            body: (await response.text().catch(() => '<unreadable>')).slice(0, 2000),
          });
          eqlValidations.push(entry);
          //diag(`EQL ${entry}`);
        });

        await ruleEditPage.save();
        try {
          await expect(ruleEditPage.saveWithWarningsModal).toBeVisible();
          //diag(`MODAL VISIBLE, EQL requests seen: ${eqlValidations.length}`);
        } catch (error) {
          //diag(`MODAL MISSING, EQL requests seen: ${eqlValidations.length}`);
          throw error;
        } finally {
          log.info(`EQL validations seen: ${eqlValidations.length}\n${eqlValidations.join('\n')}`);
        }
        await expect(ruleEditPage.saveWithWarningsModal).toContainText('EQL Query:');
        await expect(ruleEditPage.saveWithWarningsModal).toContainText('hello.world');

        await ruleEditPage.confirmSaveWithWarnings();
        await expect(ruleEditPage.saveWithWarningsModal).toBeHidden();
        await expect(ruleEditPage.ruleDetailsAboutSection).toBeVisible();
      }
    );
  }
);
