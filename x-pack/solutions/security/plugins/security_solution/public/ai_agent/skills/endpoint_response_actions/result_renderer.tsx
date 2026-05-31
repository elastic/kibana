/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { ActionResult } from './types';

interface ResultCardProps {
  result: ActionResult;
}

export const ResultCard: React.FC<ResultCardProps> = ({ result }) => {
  return (
    <div data-test-subj={`endpoint-response-action-result-${result.status}`}>
      <span>{result.status}</span>
      {result.errorMessage && <span>{result.errorMessage}</span>}
    </div>
  );
};
