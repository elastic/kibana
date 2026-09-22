/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedDate, FormattedTime } from '@kbn/i18n-react';

/** `FormattedDate` + `FormattedTime` pair with the date format the SSE renderer repeats. */
export const DateTime: React.FC<{ value: string }> = ({ value }) => (
  <>
    <FormattedDate value={value} year="numeric" month="short" day="2-digit" />{' '}
    <FormattedTime value={value} />
  </>
);
