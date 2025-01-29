/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BrowserFields, TimelineEventsDetailsItem } from '@kbn/timelines-plugin/common';
import { get, getOr } from 'lodash/fp';
import type { FieldSpec } from '@kbn/data-views-plugin/common';
import type {
  EventFieldsData,
  EventSummaryField,
  FieldsData,
} from '../../../../common/components/event_details/types';

export interface EnrichedFieldInfo {
  data: FieldsData | EventFieldsData;
  eventId: string;
  fieldFromBrowserField?: Partial<FieldSpec>;
  scopeId: string;
  values: string[] | null | undefined;
  linkValue?: string;
}

export type EnrichedFieldInfoWithValues = EnrichedFieldInfo & { values: string[] };

export function getEnrichedFieldInfo({
  browserFields,
  contextId,
  eventId,
  field,
  item,
  linkValueField,
  scopeId,
}: {
  browserFields: BrowserFields;
  contextId: string;
  item: TimelineEventsDetailsItem;
  eventId: string;
  field?: EventSummaryField;
  scopeId: string;
  linkValueField?: TimelineEventsDetailsItem;
}): EnrichedFieldInfo {
  const fieldInfo = {
    contextId,
    eventId,
    fieldType: 'string',
    linkValue: undefined,
    scopeId,
  };
  const linkValue = getOr(null, 'originalValue.0', linkValueField);
  const category = item.category ?? '';
  const fieldName = item.field ?? '';

  const browserField = get([category, 'fields', fieldName], browserFields);
  const overrideField = field?.overrideField;
  return {
    ...fieldInfo,
    data: {
      field: overrideField ?? fieldName,
      format: browserField?.format?.id ?? '',
      type: browserField?.type ?? '',
      isObjectArray: item.isObjectArray,
    },
    values: item.values,
    linkValue: linkValue ?? undefined,
    fieldFromBrowserField: browserField,
  };
}
