/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useKibana } from '../../context/typed_kibana_context/typed_kibana_context';

export const useInferenceEnabled = () => {
  const {
    triggersActionsUi: { actionTypeRegistry },
  } = useKibana().services;
  let inferenceEnabled = false;
  try {
    actionTypeRegistry.get('.inference');
    inferenceEnabled = true;
  } catch (e) {
    // swallow error
    // inferenceEnabled will be false
  }
  return inferenceEnabled;
};
