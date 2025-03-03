/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment, { Moment } from 'moment';
import {
  defaultAnnotationColor,
  defaultAnnotationLabel,
  defaultAnnotationRangeColor,
  defaultRangeAnnotationLabel,
} from '@kbn/event-annotation-common';
import { SLOWithSummaryResponse } from '@kbn/slo-schema';
import type { CreateAnnotationForm } from './components/create_annotation';

export function getDefaultAnnotation({
  slo,
  timestamp,
  eventEnd,
}: {
  timestamp?: Moment;
  eventEnd?: Moment;
  slo?: SLOWithSummaryResponse;
}): CreateAnnotationForm {
  const sloId = slo?.id;
  const sloInstanceId = slo?.instanceId;
  return {
    message: eventEnd ? defaultRangeAnnotationLabel : defaultAnnotationLabel,
    '@timestamp': timestamp ?? moment(),
    event: {
      start: timestamp,
      end: eventEnd,
    },
    annotation: {
      title: eventEnd ? defaultRangeAnnotationLabel : defaultAnnotationLabel,
      style: {
        icon: 'triangle',
        color: eventEnd ? defaultAnnotationRangeColor : defaultAnnotationColor,
        line: {
          width: 2,
          style: 'solid',
          textDecoration: 'name',
        },
        rect: {
          fill: 'inside',
        },
      },
    },
    ...(sloId
      ? {
          slo: {
            id: sloId,
            instanceId: sloInstanceId,
          },
        }
      : {}),
  };
}
