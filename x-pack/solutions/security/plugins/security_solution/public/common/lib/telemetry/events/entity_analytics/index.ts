/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityAnalyticsTelemetryEvent } from './types';
import { EntityEventTypes } from './types';

export const entityClickedEvent: EntityAnalyticsTelemetryEvent = {
  eventType: EntityEventTypes.EntityDetailsClicked,
  schema: {
    entity: {
      type: 'keyword',
      _meta: {
        description: 'Entity name (host|user)',
        optional: false,
      },
    },
  },
};

export const entityAlertsClickedEvent: EntityAnalyticsTelemetryEvent = {
  eventType: EntityEventTypes.EntityAlertsClicked,
  schema: {
    entity: {
      type: 'keyword',
      _meta: {
        description: 'Entity name (host|user)',
        optional: false,
      },
    },
  },
};

export const entityRiskFilteredEvent: EntityAnalyticsTelemetryEvent = {
  eventType: EntityEventTypes.EntityRiskFiltered,
  schema: {
    entity: {
      type: 'keyword',
      _meta: {
        description: 'Entity name (host|user)',
        optional: true,
      },
    },
    selectedSeverity: {
      type: 'keyword',
      _meta: {
        description: 'Selected severity (Unknown|Low|Moderate|High|Critical)',
        optional: false,
      },
    },
  },
};

export const toggleRiskSummaryClickedEvent: EntityAnalyticsTelemetryEvent = {
  eventType: EntityEventTypes.ToggleRiskSummaryClicked,
  schema: {
    entity: {
      type: 'keyword',
      _meta: {
        description: 'Entity name (host|user)',
        optional: false,
      },
    },
    action: {
      type: 'keyword',
      _meta: {
        description: 'It defines if the section is opening or closing (show|hide)',
        optional: false,
      },
    },
  },
};

export const RiskInputsExpandedFlyoutOpenedEvent: EntityAnalyticsTelemetryEvent = {
  eventType: EntityEventTypes.RiskInputsExpandedFlyoutOpened,
  schema: {
    entity: {
      type: 'keyword',
      _meta: {
        description: 'Entity name (host|user)',
        optional: false,
      },
    },
  },
};

export const addRiskInputToTimelineClickedEvent: EntityAnalyticsTelemetryEvent = {
  eventType: EntityEventTypes.AddRiskInputToTimelineClicked,
  schema: {
    quantity: {
      type: 'integer',
      _meta: {
        description: 'Quantity of alerts added to timeline',
        optional: false,
      },
    },
  },
};

export const assetCriticalityFileSelectedEvent: EntityAnalyticsTelemetryEvent = {
  eventType: EntityEventTypes.AssetCriticalityFileSelected,
  schema: {
    valid: {
      type: 'boolean',
      _meta: {
        description: 'If the file is valid',
        optional: false,
      },
    },
    errorCode: {
      type: 'keyword',
      _meta: {
        description: 'Error code if the file is invalid',
        optional: true,
      },
    },
    file: {
      properties: {
        size: {
          type: 'long',
          _meta: {
            description: 'File size in bytes',
            optional: false,
          },
        },
      },
    },
  },
};

export const assetCriticalityCsvPreviewGeneratedEvent: EntityAnalyticsTelemetryEvent = {
  eventType: EntityEventTypes.AssetCriticalityCsvPreviewGenerated,
  schema: {
    file: {
      properties: {
        size: {
          type: 'long',
          _meta: {
            description: 'File size in bytes',
            optional: false,
          },
        },
      },
    },
    processing: {
      properties: {
        startTime: {
          type: 'date',
          _meta: {
            description: 'Processing start time',
            optional: false,
          },
        },
        endTime: {
          type: 'date',
          _meta: {
            description: 'Processing end time',
            optional: false,
          },
        },
        tookMs: {
          type: 'long',
          _meta: {
            description: 'Processing time in milliseconds',
            optional: false,
          },
        },
      },
    },
    stats: {
      properties: {
        validLines: {
          type: 'long',
          _meta: {
            description: 'Number of valid lines',
            optional: false,
          },
        },
        invalidLines: {
          type: 'long',
          _meta: {
            description: 'Number of invalid lines',
            optional: false,
          },
        },
        totalLines: {
          type: 'long',
          _meta: {
            description: 'Total number of lines',
            optional: false,
          },
        },
      },
    },
  },
};

export const assetCriticalityCsvImportedEvent: EntityAnalyticsTelemetryEvent = {
  eventType: EntityEventTypes.AssetCriticalityCsvImported,
  schema: {
    file: {
      properties: {
        size: {
          type: 'long',
          _meta: {
            description: 'File size in bytes',
            optional: false,
          },
        },
      },
    },
  },
};

export const entityStoreInitEvent: EntityAnalyticsTelemetryEvent = {
  eventType: EntityEventTypes.EntityStoreDashboardInitButtonClicked,
  schema: {
    timestamp: {
      type: 'date',
      _meta: {
        description: 'Timestamp of the event',
        optional: false,
      },
    },
  },
};

export const entityStoreEnablementEvent: EntityAnalyticsTelemetryEvent = {
  eventType: EntityEventTypes.EntityStoreEnablementToggleClicked,
  schema: {
    timestamp: {
      type: 'date',
      _meta: {
        description: 'Timestamp of the event',
        optional: false,
      },
    },
    action: {
      type: 'keyword',
      _meta: {
        description: 'Event toggle action',
        optional: false,
      },
    },
  },
};

const mlJobUpdateEvent: EntityAnalyticsTelemetryEvent = {
  eventType: EntityEventTypes.MLJobUpdate,
  schema: {
    jobId: {
      type: 'keyword',
      _meta: {
        description: 'Job id',
        optional: false,
      },
    },
    isElasticJob: {
      type: 'boolean',
      _meta: {
        description: 'If true the job is one of the pre-configure security solution modules',
        optional: false,
      },
    },
    moduleId: {
      type: 'keyword',
      _meta: {
        description: 'Module id',
        optional: true,
      },
    },
    status: {
      type: 'keyword',
      _meta: {
        description: 'It describes what has changed in the job.',
        optional: false,
      },
    },
    errorMessage: {
      type: 'text',
      _meta: {
        description: 'Error message',
        optional: true,
      },
    },
  },
};

const anomaliesCountClickedEvent: EntityAnalyticsTelemetryEvent = {
  eventType: EntityEventTypes.AnomaliesCountClicked,
  schema: {
    jobId: {
      type: 'keyword',
      _meta: {
        description: 'Job id',
        optional: false,
      },
    },
    count: {
      type: 'integer',
      _meta: {
        description: 'Number of anomalies',
        optional: false,
      },
    },
  },
};

export const entityTelemetryEvents = [
  entityClickedEvent,
  entityAlertsClickedEvent,
  entityRiskFilteredEvent,
  assetCriticalityCsvPreviewGeneratedEvent,
  assetCriticalityFileSelectedEvent,
  assetCriticalityCsvImportedEvent,
  entityStoreEnablementEvent,
  entityStoreInitEvent,
  toggleRiskSummaryClickedEvent,
  RiskInputsExpandedFlyoutOpenedEvent,
  addRiskInputToTimelineClickedEvent,
  mlJobUpdateEvent,
  anomaliesCountClickedEvent,
];
