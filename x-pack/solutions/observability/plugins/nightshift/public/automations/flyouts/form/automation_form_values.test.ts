/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createAutomationFormValues } from './automation_form_values';

describe('automation form values', () => {
  describe('createAutomationFormValues', () => {
    it('starts with empty, disabled values', () => {
      expect(createAutomationFormValues()).toEqual({
        name: '',
        tags: [],
        description: '',
        trigger: undefined,
        dailyDispatchLimit: '20',
        instructions: '',
        mode: 'ask',
        slackAction: undefined,
        isEnabled: false,
      });
    });
  });
});
