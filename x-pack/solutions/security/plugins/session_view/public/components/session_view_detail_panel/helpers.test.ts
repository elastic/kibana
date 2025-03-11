/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { getSelectedTabContent } from './helpers';
import { EuiTabProps } from '../../types';

const TABS: EuiTabProps[] = [
  {
    id: '1',
    name: 'Process',
    content: 'process content',
  },
  {
    id: '2',
    name: 'Host',
    content: 'host content',
  },
  {
    id: '3',
    name: 'Alert',
    content: 'alert content',
  },
];

describe('session view detail panel helpers tests', () => {
  it('getSelectedTabContent works', () => {
    const result = getSelectedTabContent(TABS, '1');
    expect(result).toBe(TABS[0].content);
  });

  it('getSelectedTabContent returns null if tab id not found', () => {
    const result = getSelectedTabContent(TABS, 'process');
    expect(result).toBeNull();
  });
});
