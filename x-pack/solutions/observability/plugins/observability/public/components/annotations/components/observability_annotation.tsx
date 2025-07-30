/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SeriesIdentifier,
  Tooltip,
  TooltipAction,
  TooltipSpec,
  TooltipType,
} from '@elastic/charts';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { useFormContext } from 'react-hook-form';
import moment from 'moment';
import { SLOWithSummaryResponse } from '@kbn/slo-schema';
import { ObsAnnotation } from './obs_annotation';
import type { CreateAnnotationForm } from './create_annotation';
import type { Annotation } from '../../../../common/annotations';
import { NewLineAnnotation } from './new_line_annotation';
import { NewRectAnnotation } from './new_rect_annotation';

export interface ObservabilityAnnotationsProps {
  slo?: SLOWithSummaryResponse;
  tooltipSpecs?: Partial<TooltipSpec>;
  annotations?: Annotation[];
  isCreateOpen: boolean;
  setIsCreateOpen: (value: boolean) => void;
}

export function ObservabilityAnnotations({
  slo,
  tooltipSpecs,
  annotations,
  isCreateOpen,
  setIsCreateOpen,
}: ObservabilityAnnotationsProps) {
  const { setValue } = useFormContext<CreateAnnotationForm>();

  const actions: Array<TooltipAction<any, SeriesIdentifier>> = [
    {
      label: i18n.translate(
        'xpack.observability.createAnnotation.addAnnotationModalHeaderTitleLabel',
        { defaultMessage: 'Create annotation' }
      ),
      onSelect: (s, v) => {
        setValue('@timestamp', moment(new Date(s?.[0]?.datum.key ?? v?.[0]?.datum.key)));
        setIsCreateOpen(true);
      },
    },
  ];

  return (
    <>
      <Tooltip {...(tooltipSpecs ?? {})} actions={actions} type={TooltipType.VerticalCursor} />
      {annotations?.map((annotation, index) => (
        <ObsAnnotation annotation={annotation} key={annotation.id ?? index} />
      ))}

      <NewLineAnnotation slo={slo} isCreateOpen={isCreateOpen} />
      <NewRectAnnotation slo={slo} isCreateOpen={isCreateOpen} />
    </>
  );
}

// eslint-disable-next-line import/no-default-export
export default ObservabilityAnnotations;
