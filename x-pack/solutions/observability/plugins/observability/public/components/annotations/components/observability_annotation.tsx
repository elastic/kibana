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
import { EuiErrorBoundary } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { useFormContext } from 'react-hook-form';
import moment from 'moment';
import { SLOWithSummaryResponse } from '@kbn/slo-schema';
import { CreateAnnotationForm } from './create_annotation';
import { Annotation } from '../../../../common/annotations';
import { DisplayAnnotation } from '../display_annotations';
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
    <EuiErrorBoundary>
      <Tooltip {...(tooltipSpecs ?? {})} actions={actions} type={TooltipType.VerticalCursor} />
      <DisplayAnnotation annotations={annotations} />

      <NewLineAnnotation slo={slo} isCreateOpen={isCreateOpen} />
      <NewRectAnnotation slo={slo} isCreateOpen={isCreateOpen} />
    </EuiErrorBoundary>
  );
}

// eslint-disable-next-line import/no-default-export
export default ObservabilityAnnotations;
