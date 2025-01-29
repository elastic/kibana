/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { TimelineTemplateReadOnly } from './timeline_template';

export default {
  component: TimelineTemplateReadOnly,
  title:
    'Rule Management/Prebuilt Rules/Upgrade Flyout/ThreeWayDiff/FieldReadOnly/timeline_template',
};

export const Default = () => (
  <TimelineTemplateReadOnly
    timelineTemplate={{
      timeline_title: 'Alerts Involving a Single User Timeline',
      timeline_id: 'some-timeline-id-123',
    }}
  />
);

export const NoValue = () => <TimelineTemplateReadOnly />;
