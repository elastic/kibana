/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { encode } from '@kbn/rison';
import { DocumentDetailsRightPanelKey } from '../../../flyout/document_details/shared/constants/panel_keys';
import { resolveFlyoutParams } from './utils';

describe('resolveFlyoutParams', () => {
  it('preserves existing flyout query string', () => {
    const existing = '(preview:!(),right:(id:other))';
    expect(resolveFlyoutParams({ index: '.idx', alertId: 'a1' }, existing)).toBe(existing);
  });

  it('encodes document details flyout when no current params', () => {
    const expected = encode({
      right: {
        id: DocumentDetailsRightPanelKey,
        params: { id: 'a1', indexName: '.idx', scopeId: 'alerts-page' },
      },
      left: undefined,
      preview: [],
    });
    expect(resolveFlyoutParams({ index: '.idx', alertId: 'a1' }, null)).toBe(expected);
  });
});
