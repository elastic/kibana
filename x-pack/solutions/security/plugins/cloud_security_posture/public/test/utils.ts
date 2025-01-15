/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Matcher, screen } from '@testing-library/react';

export const expectIdsInDoc = ({
  be = [],
  notToBe = [],
}: {
  be: Matcher[];
  notToBe?: Matcher[];
}) => {
  const filteredNotToBe = notToBe.filter((testId) => !be.includes(testId));

  be.forEach((testId) => {
    expect(screen.getByTestId(testId)).toBeInTheDocument();
  });
  filteredNotToBe.forEach((testId) => {
    expect(screen.queryByTestId(testId)).not.toBeInTheDocument();
  });
};
