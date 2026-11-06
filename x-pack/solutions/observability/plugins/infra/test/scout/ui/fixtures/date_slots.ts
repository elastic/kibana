/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsClient } from '@kbn/scout-oblt';
import moment from 'moment';

/**
 * Fleet-managed metrics data streams (`metrics-system.*`, `metrics-kubernetes.*`, …) are
 * TSDS and only accept documents inside their writable window (`time_series.temporal_ranges`
 * on `GET _data_stream/<name>`). Synthtrace payloads therefore must use timestamps inside
 * that window instead of fixed historical dates.
 *
 * All data windows ("slots") are derived from the window ES itself reports for a reference
 * data stream — see `resolveDateSlots`. This makes ingestion robust to clock skew between
 * the test runner and ES and to non-default `look_back_time` / `look_ahead_time` settings,
 * and it lets the parallel suite's global setup (a separate process) and every test worker
 * independently derive the exact same slots without persisting any state.
 *
 * Datasets that surface in the same entity views are isolated from each other by *time*:
 * each gets a one-minute slot at a fixed offset before the shared anchor. The largest
 * implicit lookback any view applies is the inventory snapshot (`interval: '1m'`,
 * `lookbackSize: 5` → 5 min), so the 15-minute gaps between host-view slots leave ample
 * margin. `containers` and `pods` are isolated from host views by entity type and only
 * need distinct picker values (saved-views specs assert inequality), so they sit on
 * adjacent offsets.
 */
const SLOT_OFFSET_MINUTES = {
  hosts: 6,
  hostsWithoutData: 21,
  k8sHosts: 36,
  semconvHosts: 51,
  containers: 66,
  pods: 69,
} as const;

const MINUTE_MS = 60 * 1000;

/**
 * TSDS data stream whose writable window anchors all slots. Only the `core` metricset
 * stream is checked for now; the other datasets land in sibling streams
 * (`metrics-system.*`, `metrics-kubernetes.*`, `metrics-docker.*`, OTel) created within
 * minutes of it, which the anchor placement leaves margin for — if that ever proves too
 * optimistic, check `metrics-system.*` (or every target stream) and intersect the windows.
 */
const REFERENCE_DATA_STREAM = 'metrics-system.core-default';

/**
 * The anchor sits 90 minutes after the reference stream's initial writable `start`.
 *
 * `start` rather than `end` because only `start` is immutable: ES advances the head
 * index's `end_time` every `time_series.poll_interval`, so global setup and test workers
 * reading the stream minutes apart would derive different slots from `end`. For a freshly
 * created stream with default settings (`start ≈ creation − 2h`, `end ≈ creation + 30m`)
 * this puts the anchor roughly one hour before the `end` observed at setup, with the
 * deepest slot (−69m) still 21 minutes after `start` — margin for sibling streams that
 * are created slightly later during ingest and whose windows start slightly later.
 */
const ANCHOR_OFFSET_FROM_RANGE_START_MS = 90 * MINUTE_MS;

/** EuiSuperDatePicker absolute-date input format (UTC), e.g. `03/28/2023 6:20:59 PM`. */
const PICKER_DATE_FORMAT = 'MM/DD/YYYY h:mm:ss A';
/** Date-picker button label format, e.g. `Mar 28, 2023`. */
const SHORT_DATE_FORMAT = 'MMM D, YYYY';

export interface DateSlot {
  /** ISO start of the one-minute data window. */
  readonly from: string;
  /** ISO end of the one-minute data window. */
  readonly to: string;
  /** ISO midpoint of the window (e.g. for faking the browser clock). */
  readonly midpoint: string;
  /** Absolute date-picker input value at `to − 1s`, in UTC. */
  readonly pickerDate: string;
  /** Date-picker button label (`MMM D, YYYY`) for display assertions. */
  readonly shortDate: string;
  /** Epoch ms at `to − 1s` (waffle-time URL params, saved views). */
  readonly timestamp: number;
}

export interface DateSlots {
  /** Epoch ms the slots were computed from (floored to a whole minute). */
  readonly anchor: number;
  readonly hosts: DateSlot;
  readonly hostsWithoutData: DateSlot;
  readonly k8sHosts: DateSlot;
  readonly semconvHosts: DateSlot;
  readonly containers: DateSlot;
  readonly pods: DateSlot;
}

const buildSlot = (anchor: number, offsetMinutes: number): DateSlot => {
  const from = anchor - offsetMinutes * MINUTE_MS;
  const to = from + MINUTE_MS;
  const displayMs = to - 1000;
  return {
    from: new Date(from).toISOString(),
    to: new Date(to).toISOString(),
    midpoint: new Date(from + MINUTE_MS / 2).toISOString(),
    pickerDate: moment.utc(displayMs).format(PICKER_DATE_FORMAT),
    shortDate: moment.utc(displayMs).format(SHORT_DATE_FORMAT),
    timestamp: displayMs,
  };
};

const computeDateSlots = (anchorMs: number): DateSlots => {
  const anchor = Math.floor(anchorMs / MINUTE_MS) * MINUTE_MS;
  return {
    anchor,
    hosts: buildSlot(anchor, SLOT_OFFSET_MINUTES.hosts),
    hostsWithoutData: buildSlot(anchor, SLOT_OFFSET_MINUTES.hostsWithoutData),
    k8sHosts: buildSlot(anchor, SLOT_OFFSET_MINUTES.k8sHosts),
    semconvHosts: buildSlot(anchor, SLOT_OFFSET_MINUTES.semconvHosts),
    containers: buildSlot(anchor, SLOT_OFFSET_MINUTES.containers),
    pods: buildSlot(anchor, SLOT_OFFSET_MINUTES.pods),
  };
};

interface TemporalRange {
  start: string;
  end: string;
}

const getReferenceDataStream = async (esClient: EsClient) => {
  const { data_streams: dataStreams } = await esClient.indices.getDataStream({
    name: REFERENCE_DATA_STREAM,
  });
  return dataStreams[0] as (typeof dataStreams)[number] & {
    time_series?: { temporal_ranges?: TemporalRange[] };
  };
};

/**
 * Creates the reference data stream (empty) if it does not exist yet, so its writable
 * window can be read before any data is ingested. Requires the Fleet `system` package
 * templates, which the synthtrace client installs on initialization. Call this from the
 * code path that ingests (global setup, sequential `beforeAll`) — not from test workers,
 * where a missing stream means setup never ran and must surface as an error instead.
 */
export const ensureReferenceDataStream = async (esClient: EsClient): Promise<void> => {
  try {
    await esClient.indices.createDataStream({ name: REFERENCE_DATA_STREAM });
  } catch (error) {
    const type = (error as { body?: { error?: { type?: string } } })?.body?.error?.type;
    if (type !== 'resource_already_exists_exception') {
      throw error;
    }
  }
};

/**
 * Derives the synthtrace data slots from the reference data stream's writable TSDS window.
 * Deterministic across processes: the anchor is computed from the immutable `start` of the
 * oldest temporal range, so global setup and every test worker resolve identical slots.
 * Falls back to the backing index creation date when the stream is not TSDS (no
 * `temporal_ranges`), where no write-window constraint exists but the same shared,
 * immutable anchor is still needed.
 */
export const resolveDateSlots = async (esClient: EsClient): Promise<DateSlots> => {
  let dataStream: Awaited<ReturnType<typeof getReferenceDataStream>>;
  try {
    dataStream = await getReferenceDataStream(esClient);
  } catch (error) {
    const statusCode = (error as { statusCode?: number })?.statusCode;
    if (statusCode === 404) {
      throw new Error(
        `Data stream "${REFERENCE_DATA_STREAM}" not found — synthtrace data must be ingested ` +
          `first (the parallel suite's global setup, or the sequential suite's beforeAll)`
      );
    }
    throw error;
  }

  const temporalRanges = dataStream.time_series?.temporal_ranges ?? [];
  if (temporalRanges.length === 0) {
    // Not a TSDS stream: no write-window constraint, but the anchor must still be a value
    // every process derives identically — use the (immutable) backing index creation date
    // shifted like a default TSDS `start` (creation − 2h) would be.
    const firstBackingIndex = dataStream.indices[0].index_name;
    const settings = await esClient.indices.getSettings({ index: firstBackingIndex });
    const creationDate = Number(settings[firstBackingIndex]?.settings?.index?.creation_date);
    if (!Number.isFinite(creationDate)) {
      throw new Error(
        `Cannot derive synthtrace windows: "${REFERENCE_DATA_STREAM}" has no ` +
          `time_series.temporal_ranges and the creation date of "${firstBackingIndex}" is unavailable`
      );
    }
    return computeDateSlots(creationDate - 2 * 60 * MINUTE_MS + ANCHOR_OFFSET_FROM_RANGE_START_MS);
  }

  const rangeStart = Date.parse(temporalRanges[0].start);
  const rangeEnd = Date.parse(temporalRanges[temporalRanges.length - 1].end);
  const slots = computeDateSlots(rangeStart + ANCHOR_OFFSET_FROM_RANGE_START_MS);

  // `rangeEnd` keeps advancing while the stream lives, so this bound only tightens after
  // this check; it guards against unusual window shapes (non-default look_back/look_ahead,
  // pre-existing streams that just rolled over on a shared cluster).
  const deepestFrom = Date.parse(slots.pods.from);
  if (deepestFrom < rangeStart || slots.anchor > rangeEnd - 10 * MINUTE_MS) {
    throw new Error(
      `Computed synthtrace windows [${slots.pods.from} .. ${new Date(
        slots.anchor
      ).toISOString()}] do not fit the writable TSDS window of "${REFERENCE_DATA_STREAM}" ` +
        `(temporal_ranges: ${JSON.stringify(temporalRanges)})`
    );
  }

  return slots;
};
