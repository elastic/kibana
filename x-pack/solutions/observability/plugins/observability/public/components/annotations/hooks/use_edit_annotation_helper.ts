/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { useEffect } from 'react';
import { UseFormReset } from 'react-hook-form';
import type { Annotation } from '../../../../common/annotations';
import type { CreateAnnotationForm } from '../components/create_annotation';

export const useEditAnnotationHelper = ({
  reset,
  editAnnotation,
  setIsCreateOpen,
}: {
  reset: UseFormReset<CreateAnnotationForm>;
  editAnnotation?: Annotation | null;
  setIsCreateOpen: (val: boolean) => void;
}) => {
  useEffect(() => {
    if (!editAnnotation) return;

    const eventEnd = editAnnotation.event?.end;

    reset({
      ...editAnnotation,
      '@timestamp': moment(editAnnotation['@timestamp']),
      event: {
        start: moment(editAnnotation.event?.start),
        end: eventEnd ? moment(eventEnd) : undefined,
      },
    });
    setIsCreateOpen(true);
  }, [editAnnotation, setIsCreateOpen, reset]);
};
