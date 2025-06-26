/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_CONTROLS } from '@kbn/alerts-ui-shared/src/alert_filter_controls/constants';
import { ALERT_STATUS } from '@kbn/rule-data-utils';
import { getControlIndex } from './get_control_index';

describe('getControlIndex()', () => {
  it('Should return correct index if the field name exist', () => {
    expect(getControlIndex(ALERT_STATUS, DEFAULT_CONTROLS)).toBe(0);
  });

  it('Should return -1 if the field name does not exist', () => {
    expect(getControlIndex('nonexistent-fieldName', DEFAULT_CONTROLS)).toBe(-1);
  });
});
