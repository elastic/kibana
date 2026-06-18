/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import AdmZip from 'adm-zip';
import type { estypes } from '@elastic/elasticsearch';
import type { KibanaRequest } from '@kbn/core/server';
import { createRouteValidationFunction, toNumberRt } from '@kbn/io-ts-utils';
import { enableSynthtraceCapture } from '@kbn/observability-plugin/common';
import { kqlQuery, termQuery } from '@kbn/observability-plugin/server';
import { ENVIRONMENT_ALL } from '@kbn/apm-types';
import {
  CAPTURE_MAX_WINDOW_MS,
  Scrubber,
  getApmCaptureDocs,
  reconstructTrace,
  generateScenario,
} from '@kbn/synthtrace-scenario-codegen';
import * as rt from 'io-ts';
import type { InfraBackendLibs } from '../../lib/infra_types';
import type { InfraPluginRequestHandlerContext } from '../../types';
import { getInfraMetricsClient } from '../../lib/helpers/get_infra_metrics_client';
import { getApmDataAccessClient } from '../../lib/helpers/get_apm_data_access_client';
import { DEFAULT_SCHEMA } from '../../../common/constants';
import { generateInfraScenario } from './codegen';
import { getInfraCaptureDocs } from './get_capture_docs';
import { reconstructInfra } from './reconstruct';
import type { InfraCapturedSource } from './reconstruct';

/**
 * Document cap, distributed across slices (see the handler). The generated scenario emits the
 * capture as a JSON data literal + a fixed builder loop, so it no longer hits the JS engine's
 * per-function variable ceiling; this cap now exists only to bound Elasticsearch scan cost.
 */
const SYNTHTRACE_CAPTURE_MAX_DOCS = 150000;
/**
 * The capture window is split into sub-windows of at most this duration, each captured and emitted
 * as its own self-contained scenario file. Slicing keeps every Elasticsearch query bounded and,
 * crucially, keeps each generated file small enough to parse on replay: a single multi-hundred-MB
 * file serialized as one literal would exhaust the heap of `node scripts/synthtrace`.
 */
const SYNTHTRACE_CAPTURE_SLICE_MS = 2 * 60 * 60 * 1000;
/** Hard ceiling on the number of slices, so a misconfiguration can't fan out into thousands of queries. */
const SYNTHTRACE_CAPTURE_MAX_SLICES = 200;
/** How many slices to capture in parallel. Bounded so we don't hammer Elasticsearch. */
const SYNTHTRACE_CAPTURE_SLICE_CONCURRENCY = 5;
/** Floor for the per-slice document budget so a heavily-sliced capture keeps each slice meaningful. */
const SYNTHTRACE_CAPTURE_MIN_DOCS_PER_SLICE = 2000;
/**
 * Soft ceiling on the combined size of all generated scenario files. Once exceeded, remaining
 * (most recent) slices are dropped and the zip is flagged partial. Kept low enough that the
 * base64-encoded response stays downloadable in the browser and cheap to build server-side.
 */
const SYNTHTRACE_CAPTURE_MAX_TOTAL_BYTES = 60 * 1024 * 1024;

/**
 * APM-capture budgets, mirroring the standalone APM capture route. The Hosts page lists a union of
 * hosts that have host metrics and hosts derived purely from APM data; when APM-only hosts exist we
 * additionally capture their real traces so they reappear on replay (their APM docs carry
 * `host.name`). These caps bound the extra Elasticsearch scan and the generated file sizes.
 */
const SYNTHTRACE_APM_CAPTURE_MAX_SERVICES = 500;
const SYNTHTRACE_APM_CAPTURE_TRACES_PER_SERVICE = 500;
const SYNTHTRACE_APM_CAPTURE_MAX_DOCS = 150000;
const SYNTHTRACE_APM_CAPTURE_MAX_METRIC_DOCS = 75000;
const SYNTHTRACE_APM_CAPTURE_MIN_DOCS_PER_SLICE = 2000;
const SYNTHTRACE_APM_CAPTURE_MIN_METRIC_DOCS_PER_SLICE = 1000;
/** Distinct APM host names to consider. Matches the apm-data-access `getHostNames` ceiling. */
const SYNTHTRACE_APM_CAPTURE_MAX_HOSTS = 1000;

const SynthtraceScenarioQueryRT = rt.intersection([
  rt.type({
    start: toNumberRt,
    end: toNumberRt,
  }),
  rt.partial({
    kuery: rt.string,
    hostName: rt.string,
  }),
]);

/** Runs `fn` over `items` with a bounded number of concurrent executions, preserving order. */
async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;
  const runWorker = async (): Promise<void> => {
    while (true) {
      const index = cursor++;
      if (index >= items.length) {
        return;
      }
      results[index] = await fn(items[index]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(Math.max(1, limit), items.length) }, runWorker));
  return results;
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Reads the raw `host.name` from a captured host metric `_source`, covering both ECS (top-level
 * `host.name`) and semconv/OTel (`resource.attributes`, stored with a literal dotted key) shapes.
 * Used to compute which hosts the infra capture reproduces, so we can tell which Hosts-page hosts
 * exist only in APM data.
 */
const getRawMetricHostName = (source: InfraCapturedSource): string | undefined => {
  const resourceAttributes = (source.resource as Record<string, unknown> | undefined)?.attributes;
  if (isPlainObject(resourceAttributes)) {
    const value = resourceAttributes['host.name'];
    const unwrapped = Array.isArray(value) ? value[0] : value;
    if (typeof unwrapped === 'string') return unwrapped;
  }

  const host = source.host;
  if (isPlainObject(host) && typeof host.name === 'string') return host.name;

  const literal = (source as Record<string, unknown>)['host.name'];
  const unwrappedLiteral = Array.isArray(literal) ? literal[0] : literal;
  return typeof unwrappedLiteral === 'string' ? unwrappedLiteral : undefined;
};

/**
 * Developer tool, gated behind the off-by-default `observability:enableSynthtraceCapture`
 * advanced setting. Turns the host/system metrics behind the current Infrastructure page into a
 * runnable `@kbn/synthtrace` scenario built on the `infra.host(...)` DSL.
 *
 * Wide windows are split into 2h slices that are each emitted as a self-contained scenario and
 * bundled into a zip (mirroring the APM capture), so a dense, multi-host deployment produces a
 * batch of small, replayable files instead of one giant file that OOMs the replayer.
 *
 * The Hosts page lists a union of hosts that have host metrics and hosts derived purely from APM
 * data. When APM-only hosts are detected we additionally capture the real APM traces for every
 * Hosts-page host that has APM data and bundle them into the same zip, using a single shared scrub
 * map so each raw host maps to one synthetic name across the infra and APM files. This makes the
 * APM-only hosts reappear on replay (their APM docs carry `host.name`).
 */
export const initSynthtraceScenarioRoute = (libs: InfraBackendLibs) => {
  const { framework } = libs;

  framework.registerRoute(
    {
      method: 'get',
      path: '/api/infra/synthtrace_scenario',
      validate: {
        query: createRouteValidationFunction(SynthtraceScenarioQueryRT),
      },
    },
    async (requestContext, request, response) => {
      const { start, end, kuery = '', hostName } = request.query;

      // Defense in depth: this developer tool is gated behind an off-by-default ui setting.
      const { uiSettings } = await requestContext.core;
      const isEnabled = await uiSettings.client.get<boolean>(enableSynthtraceCapture);
      if (!isEnabled) {
        return response.forbidden({
          body: `The "${enableSynthtraceCapture}" advanced setting must be enabled to capture synthtrace scenarios.`,
        });
      }

      // Clamp the scan to the most recent window so a huge selection (e.g. "last 10 years")
      // can't trigger an unbounded scan; capture the most recent data the user is looking at.
      const captureStart = Math.max(start, end - CAPTURE_MAX_WINDOW_MS);
      const windowClamped = captureStart > start;

      const infraMetricsClient = await getInfraMetricsClient({
        request,
        libs,
        context: requestContext,
      });

      // Split the (clamped) window into bounded slices. Each slice is captured independently so no
      // single Elasticsearch query has to span the whole range, then emitted as its own scenario.
      const span = Math.max(0, end - captureStart);
      const sliceCount = Math.min(
        Math.max(1, Math.ceil(span / SYNTHTRACE_CAPTURE_SLICE_MS)),
        SYNTHTRACE_CAPTURE_MAX_SLICES
      );
      const sliceMs = Math.ceil(span / sliceCount) || span || 1;
      const slices = Array.from({ length: sliceCount }, (_, index) => {
        const sliceStart = captureStart + index * sliceMs;
        return { index, start: sliceStart, end: Math.min(end, sliceStart + sliceMs) };
      }).filter((slice) => slice.start < slice.end || sliceCount === 1);

      // Distribute a single global document budget across the slices, rather than letting every
      // slice capture up to the full cap (which over a wide, dense range would emit one max-size
      // file per slice and overwhelm both the response and the replayer).
      const perSliceMaxDocs = Math.max(
        SYNTHTRACE_CAPTURE_MIN_DOCS_PER_SLICE,
        Math.ceil(SYNTHTRACE_CAPTURE_MAX_DOCS / sliceCount)
      );

      // One scrub map shared across every infra and APM slice, so the same raw host name always
      // maps to the same synthetic name (no duplicate hosts on replay).
      const scrubber = new Scrubber();

      const captureInfraSlice = async (slice: {
        index: number;
        start: number;
        end: number;
      }): Promise<{ index: number; scenario: string; hostNames: string[] } | null> => {
        const { docs, truncated } = await getInfraCaptureDocs({
          infraMetricsClient,
          start: slice.start,
          end: slice.end,
          kuery,
          hostName,
          maxDocs: perSliceMaxDocs,
        });

        if (docs.length === 0) {
          return null;
        }

        const reconstructed = reconstructInfra(docs, { scrub: true, scrubber });

        const windowText = `${new Date(slice.start).toISOString()} to ${new Date(
          slice.end
        ).toISOString()}`;
        const description =
          sliceCount > 1
            ? `Captured Infrastructure host metrics from ${windowText} (part ${slice.index + 1} of ${
                sliceCount
              }).`
            : windowClamped
            ? `Captured the most recent ${Math.round(
                CAPTURE_MAX_WINDOW_MS / (60 * 60 * 1000)
              )}h of Infrastructure host metrics (the selected range was wider and was clamped).`
            : `Captured the Infrastructure host metrics visible from ${windowText} (time range + filters).`;

        const scenario = generateInfraScenario(reconstructed, {
          description,
          truncated: truncated || windowClamped,
          scrubbed: true,
        });

        // Collect the raw host names this slice reproduces, so we can later detect Hosts-page hosts
        // that exist only in APM data (no host metrics).
        const hostNames = new Set<string>();
        for (const doc of docs) {
          const name = getRawMetricHostName(doc);
          if (name) {
            hostNames.add(name);
          }
        }

        return { index: slice.index, scenario, hostNames: [...hostNames] };
      };

      const infraCaptured = (
        await mapWithConcurrency(slices, SYNTHTRACE_CAPTURE_SLICE_CONCURRENCY, captureInfraSlice)
      )
        .filter(
          (result): result is { index: number; scenario: string; hostNames: string[] } =>
            result !== null
        )
        .sort((a, b) => a.index - b.index);

      if (infraCaptured.length === 0) {
        return response.notFound({
          body: {
            message: 'No host metric documents found for the current time range and filters.',
          },
        });
      }

      const metricHostNames = new Set<string>();
      for (const { hostNames } of infraCaptured) {
        for (const name of hostNames) {
          metricHostNames.add(name);
        }
      }

      // When the Hosts page surfaces hosts that come purely from APM data (no host metrics), capture
      // their real traces too so they reappear on replay. Best-effort: clusters without APM simply
      // skip this step.
      const apmCaptured = await captureApmForApmOnlyHosts({
        libs,
        context: requestContext,
        request,
        kuery,
        hostName,
        captureStart,
        end,
        sliceCount,
        slices,
        windowClamped,
        scrubber,
        metricHostNames,
      });

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

      // A single infra slice and no APM capture (the common case for narrow ranges) downloads as a
      // plain .ts.
      if (infraCaptured.length === 1 && apmCaptured.length === 0) {
        return response.ok({
          body: { scenario: infraCaptured[0].scenario, filename: `infra_capture_${timestamp}.ts` },
        });
      }

      // Otherwise bundle each slice (infra + APM) as its own scenario file in a zip, keeping the
      // combined size bounded so a hyper-dense multi-day capture can't OOM the response or produce a
      // huge archive.
      const zip = new AdmZip();
      let totalBytes = 0;
      let droppedSlices = 0;
      const infraPartNames: string[] = [];
      const apmPartNames: string[] = [];

      const addPart = (group: 'infra' | 'apm', partNames: string[], scenario: string): void => {
        const bytes = Buffer.byteLength(scenario, 'utf8');
        if (
          totalBytes + bytes > SYNTHTRACE_CAPTURE_MAX_TOTAL_BYTES &&
          infraPartNames.length + apmPartNames.length > 0
        ) {
          droppedSlices++;
          return;
        }
        totalBytes += bytes;
        const partName = `${group}_capture_part-${String(partNames.length + 1).padStart(
          3,
          '0'
        )}.ts`;
        partNames.push(partName);
        zip.addFile(partName, Buffer.from(scenario, 'utf8'));
      };

      for (const { scenario } of infraCaptured) {
        addPart('infra', infraPartNames, scenario);
      }
      for (const { scenario } of apmCaptured) {
        addPart('apm', apmPartNames, scenario);
      }

      zip.addFile(
        'README.txt',
        Buffer.from(buildCaptureReadmeText({ infraPartNames, apmPartNames, droppedSlices }), 'utf8')
      );

      return response.ok({
        body: {
          zipBase64: zip.toBuffer().toString('base64'),
          filename: `infra_capture_${timestamp}.zip`,
        },
      });
    }
  );
};

/**
 * Captures the APM traces for every Hosts-page host that has APM data, but only when at least one
 * such host has no host metrics (i.e. it would otherwise be missing on replay). Returns the
 * generated scenarios per slice, or an empty array when there is nothing to capture (no APM data,
 * no APM-only hosts, or no documents).
 */
async function captureApmForApmOnlyHosts({
  libs,
  context,
  request,
  kuery,
  hostName,
  captureStart,
  end,
  sliceCount,
  slices,
  windowClamped,
  scrubber,
  metricHostNames,
}: {
  libs: InfraBackendLibs;
  context: InfraPluginRequestHandlerContext;
  request: KibanaRequest;
  kuery: string;
  hostName?: string;
  captureStart: number;
  end: number;
  sliceCount: number;
  slices: Array<{ index: number; start: number; end: number }>;
  windowClamped: boolean;
  scrubber: Scrubber;
  metricHostNames: Set<string>;
}): Promise<Array<{ index: number; scenario: string }>> {
  const apmDataAccessClient = getApmDataAccessClient({ libs, context, request });
  const apmDataAccessServices = await apmDataAccessClient.getServices();
  if (!apmDataAccessServices) {
    return [];
  }

  const apmDocumentSources = await apmDataAccessServices.getDocumentSources({
    start: captureStart,
    end,
  });

  // Mirror the Hosts page filters (KQL bar + an optional single-host scope) when resolving which
  // hosts have APM data.
  const apmHostNameQuery: estypes.QueryDslQueryContainer = {
    bool: {
      filter: [...kqlQuery(kuery), ...termQuery('host.name', hostName)],
    },
  };

  const apmHostNames = await apmDataAccessServices.getHostNames({
    documentSources: apmDocumentSources,
    query: apmHostNameQuery,
    start: captureStart,
    end,
    size: SYNTHTRACE_APM_CAPTURE_MAX_HOSTS,
    schema: DEFAULT_SCHEMA,
  });

  // Only run the (relatively expensive) APM capture when the page surfaces a host that has no host
  // metrics; otherwise the infra capture already reproduces every host on the page.
  const hasApmOnlyHosts = apmHostNames.some((name) => !metricHostNames.has(name));
  if (apmHostNames.length === 0 || !hasApmOnlyHosts) {
    return [];
  }

  const perSliceMaxDocs = Math.max(
    SYNTHTRACE_APM_CAPTURE_MIN_DOCS_PER_SLICE,
    Math.ceil(SYNTHTRACE_APM_CAPTURE_MAX_DOCS / sliceCount)
  );
  const perSliceMaxMetricDocs = Math.max(
    SYNTHTRACE_APM_CAPTURE_MIN_METRIC_DOCS_PER_SLICE,
    Math.ceil(SYNTHTRACE_APM_CAPTURE_MAX_METRIC_DOCS / sliceCount)
  );

  const captureApmSlice = async (slice: {
    index: number;
    start: number;
    end: number;
  }): Promise<{ index: number; scenario: string } | null> => {
    const { docs, truncated } = await getApmCaptureDocs({
      search: (operationName, searchParams) =>
        apmDataAccessServices.apmEventClient.search(operationName, searchParams),
      start: slice.start,
      end: slice.end,
      // The host-name set already reflects the page filters; the Hosts-page KQL targets metric
      // fields and is not valid against APM documents, so we scope by host name only.
      environment: ENVIRONMENT_ALL.value,
      kuery: '',
      hostNames: apmHostNames,
      maxServices: SYNTHTRACE_APM_CAPTURE_MAX_SERVICES,
      tracesPerService: SYNTHTRACE_APM_CAPTURE_TRACES_PER_SERVICE,
      maxDocs: perSliceMaxDocs,
      maxMetricDocs: perSliceMaxMetricDocs,
    });

    if (docs.length === 0) {
      return null;
    }

    const reconstructedTrace = reconstructTrace(docs, { scrub: true, scrubber });

    const windowText = `${new Date(slice.start).toISOString()} to ${new Date(
      slice.end
    ).toISOString()}`;
    const description =
      sliceCount > 1
        ? `Captured APM data for the Hosts-page hosts from ${windowText} (part ${
            slice.index + 1
          } of ${sliceCount}).`
        : windowClamped
        ? `Captured the most recent ${Math.round(
            CAPTURE_MAX_WINDOW_MS / (60 * 60 * 1000)
          )}h of APM data for the Hosts-page hosts (the selected range was wider and was clamped).`
        : `Captured the APM data for the Hosts-page hosts visible from ${windowText}.`;

    const scenario = generateScenario(reconstructedTrace, {
      description,
      truncated: truncated || windowClamped,
      scrubbed: true,
    });

    return { index: slice.index, scenario };
  };

  return (await mapWithConcurrency(slices, SYNTHTRACE_CAPTURE_SLICE_CONCURRENCY, captureApmSlice))
    .filter((result): result is { index: number; scenario: string } => result !== null)
    .sort((a, b) => a.index - b.index);
}

/**
 * Human-readable replay instructions bundled into the capture zip. Each part is a self-contained,
 * deterministic scenario anchored to absolute timestamps; replaying them all reconstructs the
 * full capture. Infra and APM parts target different data streams. Only the first run uses
 * `--clean` (which wipes existing synthtrace data); the rest append.
 */
function buildCaptureReadmeText({
  infraPartNames,
  apmPartNames,
  droppedSlices,
}: {
  infraPartNames: string[];
  apmPartNames: string[];
  droppedSlices: number;
}): string {
  const first = infraPartNames[0] ?? apmPartNames[0] ?? 'infra_capture_part-001.ts';
  return [
    'Infra synthtrace capture',
    '========================',
    '',
    `This archive contains ${infraPartNames.length} infra and ${apmPartNames.length} APM scenario`,
    'file(s), each covering a slice of the captured time range. They are independent @kbn/synthtrace',
    'scenarios; replay them all to reconstruct the full capture. Infra and APM parts target different',
    'data streams. Only the FIRST run should use --clean (it wipes existing synthtrace data); the',
    'rest append.',
    '',
    'BABEL_DISABLE_CACHE=1 avoids @babel/register accumulating a multi-MB on-disk transpile cache',
    "across the runs (which otherwise logs a harmless \"Cache too large\" RangeError); it doesn't",
    'affect the ingested data.',
    '',
    'From the Kibana repo root:',
    '',
    `  BABEL_DISABLE_CACHE=1 node scripts/synthtrace ${first} --clean`,
    '  for f in *_capture_part-*.ts; do',
    `    [ "$f" = "${first}" ] && continue`,
    '    BABEL_DISABLE_CACHE=1 node scripts/synthtrace "$f"',
    '  done',
    '',
    'Each file anchors its events to absolute timestamps, so set your Kibana time range to the',
    'captured window (shown in each file header) to see the data.',
    ...(droppedSlices > 0
      ? [
          '',
          `NOTE: ${droppedSlices} slice(s) were omitted because the capture exceeded the maximum`,
          'archive size. Narrow the time range to capture them.',
        ]
      : []),
    '',
  ].join('\n');
}
