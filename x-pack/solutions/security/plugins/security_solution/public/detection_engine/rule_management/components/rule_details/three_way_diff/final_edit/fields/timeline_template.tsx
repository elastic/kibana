/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { FormSchema, FormData } from '../../../../../../../shared_imports';
import { UseField } from '../../../../../../../shared_imports';
import { schema } from '../../../../../../rule_creation_ui/components/step_define_rule/schema';
import type { TimelineTemplateReference } from '../../../../../../../../common/api/detection_engine';
import {
  PickTimeline,
  type FieldValueTimeline,
} from '../../../../../../rule_creation/components/pick_timeline';

export const timelineTemplateSchema = { timeline: schema.timeline } as FormSchema<{
  timeline: FieldValueTimeline;
}>;

export function TimelineTemplateEdit(): JSX.Element {
  return <UseField path="timeline" component={PickTimeline} />;
}

export function timelineTemplateDeserializer(defaultValue: FormData) {
  return {
    timeline: {
      id: defaultValue.timeline_template?.timeline_id ?? null,
      title: defaultValue.timeline_template?.timeline_title ?? null,
    },
  };
}

export function timelineTemplateSerializer(formData: FormData): {
  timeline_template: TimelineTemplateReference | undefined;
} {
  if (!formData.timeline.id) {
    return { timeline_template: undefined };
  }

  return {
    timeline_template: {
      timeline_id: formData.timeline.id,
      timeline_title: formData.timeline.title,
    },
  };
}
