/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState } from 'react';

export const useFieldsModal = () => {
  const [isFieldSelectorModalVisible, setIsFieldSelectorModalVisible] = useState(false);

  const closeFieldsSelectorModal = () => setIsFieldSelectorModalVisible(false);
  const openFieldsSelectorModal = () => setIsFieldSelectorModalVisible(true);

  return {
    isFieldSelectorModalVisible,
    closeFieldsSelectorModal,
    openFieldsSelectorModal,
  };
};
