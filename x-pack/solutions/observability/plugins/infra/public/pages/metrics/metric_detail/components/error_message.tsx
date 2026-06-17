/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiEmptyPrompt } from '@elastic/eui';

interface Props {
  title: string;
  body: string;
}

export const ErrorMessage = ({ title, body }: Props) => (
  <EuiEmptyPrompt iconType="stats" title={<h3>{title}</h3>} body={<p>{body}</p>} />
);
