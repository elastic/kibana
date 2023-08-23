/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getClassSelector } from '../../helpers/common';

/**
 * Scroll to x-y positions within the right section of the document details expandable flyout
 * // TODO revisit this as it seems very fragile: the first element found is the timeline flyout, which isn't visible but still exist in the DOM
 */
export const scrollWithinDocumentDetailsExpandableFlyoutRightSection = (x: number, y: number) =>
  cy.get(getClassSelector('euiFlyout')).last().scrollTo(x, y);
