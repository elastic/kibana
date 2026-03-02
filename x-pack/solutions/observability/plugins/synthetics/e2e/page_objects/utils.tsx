/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Page } from '@elastic/synthetics';

export const byTestId = (testId: string) => {
  return `[data-test-subj="${testId}"]`;
};

export async function waitForLoadingToFinish({ page }: { page: Page }) {
  let retries = 50;
  while (retries) {
    retries--;
    if ((await page.$(byTestId('kbnLoadingMessage'))) === null) break;
    await page.waitForTimeout(2 * 1000);
  }
  retries = 50;
  while (retries) {
    if ((await page.$(byTestId('globalLoadingIndicator'))) === null) break;
    await page.waitForTimeout(2 * 1000);
  }
}

export async function loginToKibana({
  page,
  user,
}: {
  page: Page;
  user?: { username: string; password: string };
}) {
  await page.fill('[data-test-subj=loginUsername]', user?.username ?? 'elastic', {
    timeout: 60 * 1000,
  });
  await page.fill('[data-test-subj=loginPassword]', user?.password ?? 'changeme');
  await page.click('[data-test-subj=loginSubmit]');
  await waitForLoadingToFinish({ page });
}

export function utilsPageProvider({ page }: { page: Page }) {
  return {
    byTestId(testId: string) {
      return `[data-test-subj=${testId}]`;
    },

    async waitForLoadingToFinish() {
      await waitForLoadingToFinish({ page });
    },

    async assertText({ text }: { text: string }) {
      await page.waitForSelector(`text=${text}`);
      await page.getByText(text).isVisible();
    },

    async fillByTestSubj(dataTestSubj: string, value: string) {
      await page.fill(`[data-test-subj=${dataTestSubj}]`, value);
    },

    async selectByTestSubj(dataTestSubj: string, value: string) {
      await page.selectOption(`[data-test-subj=${dataTestSubj}]`, value);
    },

    async checkByTestSubj(dataTestSubj: string, value: string) {
      await page.check(`[data-test-subj=${dataTestSubj}]`);
    },

    async clickByTestSubj(dataTestSubj: string) {
      await page.click(`[data-test-subj=${dataTestSubj}]`);
    },

    async findByTestSubj(dataTestSubj: string) {
      return await page.waitForSelector(`[data-test-subj=${dataTestSubj}]`);
    },

    async findByText(text: string) {
      return await page.waitForSelector(`text=${text}`);
    },
  };
}
