/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useRef, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { FieldValues } from 'react-hook-form/dist/types/fields';
import useDebounce from 'react-use/lib/useDebounce';
import { CreateAnnotationForm } from './create_annotation';
import { FieldText } from './forward_refs';

export function AnnotationTitle({ field, isInvalid }: { field: FieldValues; isInvalid: boolean }) {
  const { trigger } = useFormContext<CreateAnnotationForm>();
  const [value, setValue] = useState<string | undefined>(field.value);
  const prevValue = useRef<string | undefined>(field.value);

  useDebounce(
    () => {
      if (value !== prevValue.current) {
        prevValue.current = field.value;
        trigger('annotation.title');
      }
    },
    100,
    [value]
  );

  return (
    <FieldText
      {...field}
      isInvalid={isInvalid}
      compressed
      data-test-subj="annotationTitle"
      onBlur={() => {
        field.onBlur();
        setValue(field.value);
      }}
    />
  );
}
