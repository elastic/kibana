/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DOCUMENT_DETAILS_FLYOUT_RIGHT_PANEL_CONTENT } from '../../screens/expandable_flyout/alert_details_right_panel_json_tab';

/**
 * Scroll to x-y positions within the right section of the document details expandable flyout
 * // TODO revisit this as it seems very fragile: the first element found is the timeline flyout, which isn't visible but still exist in the DOM
 */
export const scrollWithinDocumentDetailsExpandableFlyoutRightSection = (x: number, y: number) =>
  cy.get(DOCUMENT_DETAILS_FLYOUT_RIGHT_PANEL_CONTENT).last().scrollTo(x, y);
