/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import { FieldSelector } from './common/field_selector';
import { Annotation } from '../../../../common/annotations';

export function ServiceApplyTo({ editAnnotation }: { editAnnotation?: Annotation | null }) {
  return (
    <FieldSelector
      label={i18n.translate('xpack.observability.annotationMeta.euiFormRow.serviceLabel', {
        defaultMessage: 'Service',
      })}
      fieldName="service.name"
      name="service.name"
      placeholder="Select a service"
      dataTestSubj="serviceSelector"
    />
  );
}
