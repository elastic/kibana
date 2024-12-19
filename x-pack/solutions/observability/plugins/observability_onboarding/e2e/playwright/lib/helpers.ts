/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Locator } from '@playwright/test';
import { HeaderBar } from '../stateful/pom/components/header_bar.component';
import { SpaceSelector } from '../stateful/pom/components/space_selector.component';

type WaitForRes = [locatorIndex: number, locator: Locator];

export async function waitForOneOf(locators: Locator[]): Promise<WaitForRes> {
  const res = await Promise.race([
    ...locators.map(async (locator, index): Promise<WaitForRes> => {
      let timedOut = false;
      await locator.waitFor({ state: 'visible' }).catch(() => (timedOut = true));
      return [timedOut ? -1 : index, locator];
    }),
  ]);
  if (res[0] === -1) {
    throw new Error('No locator is visible before timeout.');
  }
  return res;
}

export async function spaceSelectorStateful(headerBar: HeaderBar, spaceSelector: SpaceSelector) {
  const [index] = await waitForOneOf([headerBar.helpMenuButton(), spaceSelector.spaceSelector()]);
  const selector = index === 1;
  if (selector) {
    await spaceSelector.selectDefault();
    await headerBar.assertHelpMenuButton();
  }
}
