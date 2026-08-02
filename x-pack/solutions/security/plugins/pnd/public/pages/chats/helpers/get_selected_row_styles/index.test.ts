/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getSelectedRowStyles } from '.';

const border = { radius: { medium: '6px', small: '4px' } };
const colors = { primary: '#0077cc' };

describe('getSelectedRowStyles', () => {
  it('rings the selected row in the primary color', () => {
    expect(getSelectedRowStyles({ border, colors })).toEqual(
      expect.objectContaining({ boxShadow: '0 0 0 2px #0077cc' })
    );
  });

  it('rounds the ring to the row panel radius, so the ring follows the panel', () => {
    expect(getSelectedRowStyles({ border, colors })).toEqual(
      expect.objectContaining({ borderRadius: '6px' })
    );
  });
});
