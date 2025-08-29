/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState } from 'react';
import type { ListDetails } from '../types';

interface UseExceptionListHeaderProps {
  name: string;
  description?: string;
  onEditListDetails: (listDetails: ListDetails) => void;
}
export const useExceptionListHeader = ({
  name,
  description,
  onEditListDetails,
}: UseExceptionListHeaderProps) => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [listDetails, setListDetails] = useState<ListDetails>({ name, description });
  const onEdit = () => {
    setIsModalVisible(true);
  };
  const onSave = (newListDetails: ListDetails) => {
    setListDetails(newListDetails);
    if (typeof onEditListDetails === 'function') onEditListDetails(newListDetails);
    setTimeout(() => {
      setIsModalVisible(false);
    }, 200);
  };
  const onCancel = () => {
    setIsModalVisible(false);
  };

  return {
    isModalVisible,
    listDetails,
    onEdit,
    onSave,
    onCancel,
  };
};
