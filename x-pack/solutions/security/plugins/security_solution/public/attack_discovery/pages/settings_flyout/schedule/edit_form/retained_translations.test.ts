/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RETAINED_FIELD_CONNECTOR_ID_HELP_TEXT } from './retained_translations';

describe('retained_translations', () => {
  it('keeps the fieldConnectorIdHelpText translation referenced so its locale entries are not orphaned', () => {
    expect(RETAINED_FIELD_CONNECTOR_ID_HELP_TEXT).toBe(
      'This connector will apply to this schedule, only.'
    );
  });
});
