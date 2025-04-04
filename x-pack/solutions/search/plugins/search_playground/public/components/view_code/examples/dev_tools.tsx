/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiCodeBlock } from '@elastic/eui';
import { useFormContext } from 'react-hook-form';
import { ChatForm, ChatFormFields } from '../../../types';
import { elasticsearchQueryObject } from '../../../utils/user_query';

export const DevToolsCode: React.FC = () => {
  const { getValues } = useFormContext<ChatForm>();
  const {
    [ChatFormFields.indices]: indices,
    [ChatFormFields.elasticsearchQuery]: esQuery,
    [ChatFormFields.searchQuery]: searchQuery,
    [ChatFormFields.userElasticsearchQuery]: userElasticsearchQuery,
    [ChatFormFields.userElasticsearchQueryValidations]: userElasticsearchQueryValidations,
  } = getValues();
  const query = elasticsearchQueryObject(
    esQuery,
    userElasticsearchQuery,
    userElasticsearchQueryValidations
  );
  const replacedQuery =
    searchQuery ?? ''
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
