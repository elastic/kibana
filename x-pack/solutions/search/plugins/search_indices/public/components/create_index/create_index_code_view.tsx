/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import type { IndicesStatusResponse } from '../../../common';
import {
  CreateIndexCodeView as SharedCreateIndexCodeView,
  CreateIndexCodeViewProps as SharedCreateIndexCodeViewProps,
} from '../shared/create_index_code_view';

import { useIndicesRedirect } from './hooks/use_indices_redirect';

export interface CreateIndexCodeViewProps extends SharedCreateIndexCodeViewProps {
  indicesData?: IndicesStatusResponse;
}

export const CreateIndexCodeView = ({ indicesData, ...props }: CreateIndexCodeViewProps) => {
  useIndicesRedirect(indicesData);

  return <SharedCreateIndexCodeView {...props} />;
};
