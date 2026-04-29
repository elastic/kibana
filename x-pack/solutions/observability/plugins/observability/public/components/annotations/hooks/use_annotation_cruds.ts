/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useUpdateAnnotation } from './use_update_annotation';
import { useCreateAnnotation } from './use_create_annotation';
import { useDeleteAnnotation } from './use_delete_annotation';

export const useAnnotationCRUDS = () => {
  const { mutateAsync: createAnnotation, isLoading: isSaving } = useCreateAnnotation();
  const { mutateAsync: updateAnnotation, isLoading: isUpdating } = useUpdateAnnotation();
  const { mutateAsync: deleteAnnotation, isLoading: isDeleting } = useDeleteAnnotation();

  return {
    updateAnnotation,
    createAnnotation,
    deleteAnnotation,
    isSaving,
    isUpdating,
    isDeleting,
    isLoading: isSaving || isUpdating || isDeleting,
  };
};
