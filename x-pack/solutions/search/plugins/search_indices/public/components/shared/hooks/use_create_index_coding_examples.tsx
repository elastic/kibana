/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CreateIndexCodeExamples } from '../../../types';
import { DenseVectorSeverlessCodeExamples } from '../../../code_examples/create_index';

export const useCreateIndexCodingExamples = (): CreateIndexCodeExamples => {
  // TODO: in the future this will be dynamic based on the onboarding token
  // or project sub-type
  return DenseVectorSeverlessCodeExamples;
};
