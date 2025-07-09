/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { alwaysDisplayedFields, getHighlightedFieldsToDisplay } from './get_alert_summary_rows';

describe('getHighlightedFieldsToDisplay', () => {
  it('should return custom highlighted fields correctly', () => {
    const result = getHighlightedFieldsToDisplay({
      eventCategories: {},
      ruleCustomHighlightedFields: ['customField1', 'customField2'],
      type: 'custom',
    });
    expect(result).toEqual([{ id: 'customField1' }, { id: 'customField2' }]);
  });

  it('should return the default highlighted fields correctly', () => {
    const result = getHighlightedFieldsToDisplay({
      eventCategories: {},
      ruleCustomHighlightedFields: ['customField1', 'customField2'],
      type: 'default',
    });
    expect(result).toEqual(alwaysDisplayedFields);
  });

  it('should return both custom and default highlighted fields correctly', () => {
    const result = getHighlightedFieldsToDisplay({
      eventCategories: {},
      ruleCustomHighlightedFields: ['customField1', 'customField2'],
    });
    expect(result).toEqual([
      { id: 'customField1' },
      { id: 'customField2' },
      ...alwaysDisplayedFields,
    ]);
  });

  it('should return a list of unique fields', () => {
    const ruleCustomHighlightedFields = ['customField1', 'customField2', 'host.name'];
    const result = getHighlightedFieldsToDisplay({
      eventCategories: {},
      ruleCustomHighlightedFields,
    });
    expect(result).toEqual([
      ...ruleCustomHighlightedFields.map((item) => ({ id: item })),
      ...alwaysDisplayedFields.filter((item) => !ruleCustomHighlightedFields.includes(item.id)),
    ]);
  });
});
