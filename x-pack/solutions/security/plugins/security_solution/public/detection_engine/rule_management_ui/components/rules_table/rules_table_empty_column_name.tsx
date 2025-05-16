/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { type FC } from 'react';
import { EuiScreenReaderOnly } from '@elastic/eui';

interface RulesTableEmptyColumnNameProps {
  name: string;
}

export const RulesTableEmptyColumnName: FC<RulesTableEmptyColumnNameProps> = React.memo(
  ({ name }) => {
    return (
      <EuiScreenReaderOnly>
        <p>{name}</p>
      </EuiScreenReaderOnly>
    );
  }
);

RulesTableEmptyColumnName.displayName = 'RulesTableEmptyColumnName';
