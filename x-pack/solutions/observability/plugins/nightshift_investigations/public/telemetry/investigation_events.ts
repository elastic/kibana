/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RootSchema } from '@kbn/core/public';
import type { InvestigationStatus, InvestigationSubjectType } from '../../common';

export const NIGHTSHIFT_INVESTIGATION_STARTED_EVENT_TYPE = 'nightshift-investigation-started';
export const NIGHTSHIFT_INVESTIGATION_VIEWED_EVENT_TYPE = 'nightshift-investigation-viewed';

interface InvestigationActionProps {
  origin: string;
  subject_type: InvestigationSubjectType;
  investigation_id: string;
}

export interface InvestigationStartedProps extends InvestigationActionProps {
  is_reinvestigation: boolean;
}

export interface InvestigationViewedProps extends InvestigationActionProps {
  investigation_status: InvestigationStatus;
}

const investigationActionSchema: RootSchema<InvestigationActionProps> = {
  origin: {
    type: 'keyword',
    _meta: {
      description:
        'UI location where the user took the action, for example alerts_table, alert_details, or alerting_v2_inbox.',
    },
  },
  subject_type: {
    type: 'keyword',
    _meta: {
      description: 'Type of the investigated subject, for example alert.',
    },
  },
  investigation_id: {
    type: 'keyword',
    _meta: {
      description: 'Investigation the action applies to. Join key to the investigation record.',
    },
  },
};

const investigationStartedSchema: RootSchema<InvestigationStartedProps> = {
  ...investigationActionSchema,
  is_reinvestigation: {
    type: 'boolean',
    _meta: {
      description:
        'Whether the subject already had an investigation when the user started this one.',
    },
  },
};

const investigationViewedSchema: RootSchema<InvestigationViewedProps> = {
  ...investigationActionSchema,
  investigation_status: {
    type: 'keyword',
    _meta: {
      description: 'Status of the investigation when the user opened it.',
    },
  },
};

export const investigationStartedEventType = {
  eventType: NIGHTSHIFT_INVESTIGATION_STARTED_EVENT_TYPE,
  schema: investigationStartedSchema,
};

export const investigationViewedEventType = {
  eventType: NIGHTSHIFT_INVESTIGATION_VIEWED_EVENT_TYPE,
  schema: investigationViewedSchema,
};
