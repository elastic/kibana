/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getDeleteActionDescription,
  getNoItemsMessage,
  getTableCaption,
} from './connectors_table_labels';

describe('connectors table labels', () => {
  it('uses web crawler copy when isCrawler is true', () => {
    expect(getDeleteActionDescription(true)).toBe('Delete this crawler');
    expect(getTableCaption(true)).toBe('Available crawlers table');
    expect(getNoItemsMessage(true)).toBe('No crawlers found');
  });

  it('uses content crawler copy when isCrawler is false', () => {
    expect(getDeleteActionDescription(false)).toBe('Delete this content crawler');
    expect(getTableCaption(false)).toBe('Available content crawlers table');
    expect(getNoItemsMessage(false)).toBe('No content crawlers found');
  });
});
