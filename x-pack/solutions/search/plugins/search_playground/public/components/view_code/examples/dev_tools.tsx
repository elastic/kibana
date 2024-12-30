/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiCodeBlock } from '@elastic/eui';
import { useFormContext } from 'react-hook-form';
import { ChatFormFields } from '../../../types';

export const DevToolsCode: React.FC = () => {
  const { getValues } = useFormContext();
  const query = getValues(ChatFormFields.elasticsearchQuery) ?? '';
  const indices = getValues(ChatFormFields.indices) ?? [];
  const searchQuery = getValues(ChatFormFields.searchQuery) ?? '';
  const replacedQuery = searchQuery
    ? JSON.stringify(query, null, 2).replace(/\"{query}\"/g, JSON.stringify(searchQuery))
    : JSON.stringify(query, null, 2);

  return (
    <EuiCodeBlock isCopyable overflowHeight="100%">
      {`POST ${indices.join(',')}/_search
${replacedQuery}
`}
    </EuiCodeBlock>
  );
};
