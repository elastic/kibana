/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { DateRangeType } from './common';
import { remoteMonitorInfoSchema } from './remote';

export const ObserverCodec = z.looseObject({
  name: z.string(),
  geo: z.looseObject({
    name: z.string(),
    continent_name: z.string().optional(),
    city_name: z.string().optional(),
    country_iso_code: z.string().optional(),
    location: z
      .union([
        z.string(),
        z.looseObject({ lat: z.number().optional(), lon: z.number().optional() }),
        z.looseObject({ lat: z.string().optional(), lon: z.string().optional() }),
      ])
      .optional(),
  }),
  hostname: z.string().optional(),
  ip: z.array(z.string()).optional(),
  mac: z.array(z.string()).optional(),
});

export const StateEndsCodec = z.looseObject({
  duration_ms: z.union([z.string(), z.number()]),
  checks: z.number(),
  ends: z.union([z.string(), z.null()]),
  started_at: z.string(),
  id: z.string(),
  up: z.number(),
  down: z.number(),
  status: z.string(),
});

export const ErrorStateCodec = z.looseObject({
  duration_ms: z.union([z.string(), z.number()]),
  checks: z.number(),
  ends: z.union([StateEndsCodec, z.null()]),
  started_at: z.string(),
  id: z.string(),
  up: z.number(),
  down: z.number(),
  status: z.string(),
});

const syntheticsPayload = z.looseObject({
  duration: z.number().optional(),
  index: z.number().optional(),
  is_navigation_request: z.boolean().optional(),
  message: z.string().optional(),
  method: z.string().optional(),
  name: z.string().optional(),
  params: z.looseObject({ homepage: z.string().optional() }).optional(),
  source: z.string().optional(),
  start: z.number().optional(),
  status: z.string().optional(),
  ts: z.number().optional(),
  type: z.string().optional(),
  url: z.string().optional(),
  end: z.number().optional(),
  text: z.string().optional(),
});

const syntheticsError = z.looseObject({
  message: z.string().optional(),
  name: z.string().optional(),
  stack: z.string().optional(),
});

const syntheticsStep = z.looseObject({
  status: z.string(),
  index: z.number(),
  name: z.string(),
  duration: z.looseObject({ us: z.number() }),
});

export const SyntheticsDataType = z.looseObject({
  index: z.number().optional(),
  journey: z.looseObject({ id: z.string(), name: z.string() }).optional(),
  error: syntheticsError.optional(),
  package_version: z.string().optional(),
  step: syntheticsStep.optional(),
  type: z.string().optional(),
  blob: z.string().optional(),
  blob_mime: z.string().optional(),
  payload: syntheticsPayload.optional(),
  isFullScreenshot: z.boolean().optional(),
  isScreenshotRef: z.boolean().optional(),
});

export const JourneyStepType = z.looseObject({
  _id: z.string(),
  '@timestamp': z.string(),
  config_id: z.string().optional(),
  monitor: z.looseObject({
    id: z.string(),
    check_group: z.string(),
    duration: z.looseObject({ us: z.number() }).optional(),
    name: z.string().optional(),
    status: z.string().optional(),
    type: z.string().optional(),
    timespan: z.looseObject({ gte: z.string(), lt: z.string() }).optional(),
  }),
  observer: ObserverCodec.optional(),
  synthetics: z.looseObject({
    type: z.string(),
    index: z.number().optional(),
    journey: z.looseObject({ id: z.string(), name: z.string() }).optional(),
    error: syntheticsError.optional(),
    package_version: z.string().optional(),
    step: syntheticsStep.optional(),
    blob: z.string().optional(),
    blob_mime: z.string().optional(),
    payload: syntheticsPayload.optional(),
    isFullScreenshot: z.boolean().optional(),
    isScreenshotRef: z.boolean().optional(),
  }),
  error: z.looseObject({ message: z.string() }).optional(),
});

export const ScreenshotBlockType = z.looseObject({
  hash: z.string(),
  top: z.number(),
  left: z.number(),
  height: z.number(),
  width: z.number(),
});

export const FullScreenshotType = z.looseObject({
  synthetics: z.looseObject({
    blob: z.string().optional(),
    blob_mime: z.string().optional(),
    step: z.looseObject({ name: z.string() }),
    type: z.literal('step/screenshot'),
  }),
});

export const RefResultType = z.looseObject({
  '@timestamp': z.string(),
  monitor: z.looseObject({ check_group: z.string() }),
  screenshot_ref: z.looseObject({
    width: z.number(),
    height: z.number(),
    blocks: z.array(ScreenshotBlockType),
  }),
  synthetics: z.looseObject({
    package_version: z.string(),
    step: z.looseObject({ name: z.string(), index: z.number() }),
    type: z.literal('step/screenshot_ref'),
  }),
});

export const ScreenshotImageBlobType = z.looseObject({
  stepName: z.union([z.null(), z.string()]),
  maxSteps: z.number(),
  src: z.string(),
});

export const ScreenshotBlockDocType = z.looseObject({
  id: z.string(),
  synthetics: z.looseObject({
    blob: z.string(),
    blob_mime: z.string(),
  }),
});

export const ScreenshotRefImageDataType = z.looseObject({
  stepName: z.union([z.null(), z.string()]),
  maxSteps: z.number(),
  ref: z.looseObject({
    screenshotRef: RefResultType,
  }),
});

export const SyntheticsJourneyApiResponseType = z.looseObject({
  checkGroup: z.string(),
  steps: z.array(JourneyStepType),
  details: z
    .union([
      z.looseObject({
        timestamp: z.string(),
        journey: JourneyStepType,
        next: z.looseObject({ timestamp: z.string(), checkGroup: z.string() }).optional(),
        previous: z.looseObject({ timestamp: z.string(), checkGroup: z.string() }).optional(),
        summary: z.looseObject({ state: ErrorStateCodec }).optional(),
      }),
      z.null(),
    ])
    .optional(),
});

export const PingErrorType = z.looseObject({
  message: z.string(),
  code: z.string().optional(),
  id: z.string().optional(),
  stack_trace: z.union([z.string(), z.null()]).optional(),
  type: z.string().optional(),
});

export const MonitorDetailsType = z.looseObject({
  monitorId: z.string(),
  error: PingErrorType.optional(),
  timestamp: z.string().optional(),
  alerts: z.unknown().optional(),
});

export const HttpResponseBodyType = z.looseObject({
  bytes: z.number().optional(),
  content: z.string().optional(),
  content_bytes: z.number().optional(),
  hash: z.string().optional(),
});

const ECSDistinguishedName = z.looseObject({
  common_name: z.string(),
  distinguished_name: z.string(),
});

export const X509ExpiryType = z.looseObject({
  not_after: z.string(),
  not_before: z.string(),
});

export const X509Type = z.looseObject({
  issuer: ECSDistinguishedName,
  subject: ECSDistinguishedName,
  serial_number: z.string(),
  public_key_algorithm: z.string(),
  signature_algorithm: z.string(),
  not_after: z.string(),
  not_before: z.string(),
  public_key_curve: z.string().optional(),
  public_key_exponent: z.number().optional(),
  public_key_size: z.number().optional(),
});

export const TlsType = z.looseObject({
  cipher: z.string().optional(),
  established: z.boolean().optional(),
  server: z
    .looseObject({
      hash: z.looseObject({ sha256: z.string(), sha1: z.string() }).optional(),
      x509: X509Type.optional(),
    })
    .optional(),
});

export const MonitorType = z.looseObject({
  name: z.string(),
  id: z.string(),
  status: z.string(),
  type: z.string(),
  check_group: z.string(),
  timespan: z.looseObject({ gte: z.string(), lt: z.string() }),
  duration: z.looseObject({ us: z.number() }).optional(),
  ip: z.string().optional(),
  fleet_managed: z.boolean().optional(),
  project: z.looseObject({ id: z.string(), name: z.string() }).optional(),
  origin: z.enum(['ui', 'project']).optional(),
});

export const PingHeadersType = z.record(z.string(), z.union([z.string(), z.array(z.string())]));

export const AgentType = z.looseObject({
  ephemeral_id: z.string(),
  id: z.string(),
  type: z.string(),
  version: z.string(),
  name: z.string().optional(),
  hostname: z.string().optional(),
});

export const UrlType = z.looseObject({
  domain: z.string().optional(),
  full: z.string().optional(),
  port: z.number().optional(),
  scheme: z.string().optional(),
  path: z.string().optional(),
});

const SummaryCodec = z.looseObject({
  down: z.number(),
  up: z.number(),
  status: z.enum(['up', 'down']),
  attempt: z.number(),
  max_attempts: z.number(),
  final_attempt: z.boolean(),
  retry_group: z.string(),
});

export const PingType = z.looseObject({
  monitor: MonitorType,
  docId: z.string(),
  observer: ObserverCodec,
  '@timestamp': z.string(),
  agent: AgentType.optional(),
  container: z
    .looseObject({
      id: z.string().optional(),
      image: z
        .looseObject({
          name: z.string().optional(),
          tag: z.string().optional(),
        })
        .optional(),
      name: z.string().optional(),
      runtime: z.string().optional(),
    })
    .optional(),
  ecs: z.looseObject({ version: z.string().optional() }).optional(),
  error: PingErrorType.optional(),
  http: z
    .looseObject({
      request: z
        .looseObject({
          body: z
            .looseObject({
              bytes: z.number().optional(),
              content: z.looseObject({ text: z.string().optional() }).optional(),
            })
            .optional(),
          bytes: z.number().optional(),
          method: z.string().optional(),
          referrer: z.string().optional(),
        })
        .optional(),
      response: z
        .looseObject({
          body: HttpResponseBodyType.optional(),
          bytes: z.number().optional(),
          redirects: z.array(z.string()).optional(),
          status_code: z.number().optional(),
          headers: PingHeadersType.optional(),
        })
        .optional(),
      version: z.string().optional(),
    })
    .optional(),
  icmp: z
    .looseObject({
      requests: z.number().optional(),
      rtt: z.looseObject({ us: z.number().optional() }).optional(),
    })
    .optional(),
  kubernetes: z
    .looseObject({
      pod: z
        .looseObject({
          name: z.string().optional(),
          uid: z.string().optional(),
        })
        .optional(),
    })
    .optional(),
  resolve: z
    .looseObject({
      ip: z.string().optional(),
      rtt: z.looseObject({ us: z.number().optional() }).optional(),
    })
    .optional(),
  summary: SummaryCodec.optional(),
  synthetics: SyntheticsDataType.optional(),
  tags: z.array(z.string()).optional(),
  tcp: z
    .looseObject({
      rtt: z
        .looseObject({
          connect: z.looseObject({ us: z.number().optional() }).optional(),
        })
        .optional(),
    })
    .optional(),
  tls: TlsType.optional(),
  url: UrlType.optional(),
  service: z.looseObject({ name: z.string().optional() }).optional(),
  config_id: z.string().optional(),
  state: ErrorStateCodec.optional(),
  data_stream: z
    .looseObject({
      namespace: z.string(),
      type: z.string(),
      dataset: z.string(),
    })
    .optional(),
  labels: z.record(z.string(), z.string()).optional(),
  remote: remoteMonitorInfoSchema.optional(),
  kibanaUrl: z.string().optional(),
});

export const PingStateType = z.looseObject({
  timestamp: z.string(),
  '@timestamp': z.string(),
  monitor: MonitorType,
  docId: z.string(),
  state: ErrorStateCodec,
  error: PingErrorType,
  config_id: z.string(),
  observer: ObserverCodec,
  http: z
    .looseObject({
      response: z.looseObject({ status_code: z.number().optional() }).optional(),
    })
    .optional(),
});

export const PingsResponseType = z.looseObject({
  total: z.number(),
  pings: z.array(PingType),
});

export const GetPingsParamsType = z.looseObject({
  dateRange: DateRangeType,
  excludedLocations: z.string().optional(),
  index: z.number().optional(),
  size: z.number().optional(),
  pageIndex: z.number().optional(),
  locations: z.string().optional(),
  monitorId: z.string().optional(),
  sort: z.string().optional(),
  status: z.string().optional(),
  remoteName: z.string().optional(),
});

export const MonitorStatusHeatmapBucketType = z.looseObject({
  doc_count: z.number(),
  down: z.looseObject({ value: z.number() }),
  up: z.looseObject({ value: z.number() }),
  key: z.number(),
  key_as_string: z.string(),
});

export const ErrorGroupItemType = z.looseObject({
  timestamp: z.string(),
  monitorName: z.string(),
  monitorType: z.string(),
  configId: z.string(),
  stateId: z.string(),
  checkGroup: z.string(),
  locationName: z.string(),
  locationId: z.string(),
  durationMs: z.number(),
  errorMessage: z.string(),
});

export const ErrorGroupHistogramBucketType = z.looseObject({
  timestamp: z.number(),
  count: z.number(),
});

export const ErrorGroupPatternType = z.enum(['persistent', 'intermittent', 'new']);

export const ErrorGroupType = z.looseObject({
  name: z.string(),
  sampleMessage: z.string(),
  pattern: ErrorGroupPatternType,
  count: z.number(),
  monitorCount: z.number(),
  locationCount: z.number(),
  firstSeen: z.string(),
  lastSeen: z.string(),
  histogram: z.array(ErrorGroupHistogramBucketType),
  items: z.array(ErrorGroupItemType),
});

export const ErrorGroupsResponseType = z.looseObject({
  groups: z.array(ErrorGroupType),
});

export const LocationErrorStatType = z.looseObject({
  location: z.string(),
  count: z.number(),
});

export const TopFailingMonitorType = z.looseObject({
  configId: z.string(),
  monitorName: z.string(),
  downChecks: z.number(),
  totalChecks: z.number(),
  errorRate: z.number(),
  downtimeMs: z.number(),
});

export const FailingDomainType = z.looseObject({
  domain: z.string(),
  count: z.number(),
});

export const TagErrorStatType = z.looseObject({
  tag: z.string(),
  downChecks: z.number(),
  totalChecks: z.number(),
  errorRate: z.number(),
});

export const StatusCodeStatType = z.looseObject({
  statusCode: z.number(),
  count: z.number(),
});

export const MonitorTypeStatType = z.looseObject({
  monitorType: z.string(),
  downChecks: z.number(),
  totalChecks: z.number(),
  errorRate: z.number(),
});

export const EmergingTermType = z.looseObject({
  term: z.string(),
  score: z.number(),
  foregroundCount: z.number(),
  backgroundCount: z.number(),
});

export const ErrorInsightsType = z.looseObject({
  failingDomains: z.array(FailingDomainType),
  tagStats: z.array(TagErrorStatType),
  statusCodes: z.array(StatusCodeStatType),
  monitorTypeStats: z.array(MonitorTypeStatType),
  emergingTerms: z.array(EmergingTermType),
});

export const ErrorStatsType = z.looseObject({
  totalChecks: z.number(),
  downChecks: z.number(),
  errorRate: z.number(),
  affectedMonitors: z.number(),
  totalMonitors: z.number(),
  errorCount: z.number(),
  avgDurationMs: z.number(),
  previousErrorRate: z.number(),
  errorRateDelta: z.number(),
  locationStats: z.array(LocationErrorStatType),
  topFailingMonitors: z.array(TopFailingMonitorType),
  insights: ErrorInsightsType,
});
