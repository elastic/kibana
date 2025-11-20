/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import { BulkAlertClosingReason, closingReasons } from './alert_bulk_closing_reason';
import React from 'react';

describe('BulkAlertClosingReason', () => {
  closingReasons.forEach((item) => {
    it(`"${item.label}" should be visible in the document`, () => {
      const { getByText } = render(<BulkAlertClosingReason onSubmit={jest.fn()} />);
      expect(getByText(item.label)).toBeInTheDocument();
    });
  });
});
