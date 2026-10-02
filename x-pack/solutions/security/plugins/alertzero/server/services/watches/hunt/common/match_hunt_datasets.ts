/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { Logger } from '@kbn/core/server';
import type { ScopedModel } from '@kbn/agent-builder-server';
import type { HuntIoc } from '@kbn/alertzero-common';
import type { DiscoveredDataset } from './discover_hunt_datasets';

/** What a report contributes to scope matching. All optional. */
export interface HuntScopeReportContext {
  vendor?: string;
  product?: string;
  text?: string;
  iocs?: HuntIoc[];
  techniques?: string[];
}

/** Model matches below this confidence are dropped rather than widening the hunt on a guess. */
export const HUNT_DATASET_MATCH_MIN_CONFIDENCE = 0.5;

/** Tokens shorter than this match too many things ('aw', 'ok') to be trusted as substrings. */
const MIN_TOKEN_LENGTH = 3;

/**
 * Dataset vendor tokens that name a category rather than a vendor. Matching
 * them against a report's product text ('Windows Operating System') would pull
 * `system.*` or `generic.*` datasets into every hunt, so the vendor-token rule
 * skips them; the report-vendor-in-dataset-name rule still applies.
 */
const GENERIC_VENDOR_TOKENS: ReadonlySet<string> = new Set([
  'system',
  'generic',
  'log',
  'logs',
  // Elastic Defend's dataset token; "Endpoint Manager" products (Ivanti EPMM, Motex) are 195
  // KEV entries that would otherwise pull `endpoint.events.*` into scope.
  'endpoint',
]);

/** Prompt budget: enough IOCs to hint at the platform without drowning the dataset list. */
const MAX_PROMPT_IOCS = 25;

/**
 * Cap on the datasets offered to the model. Discovery is uncapped, so a large
 * estate could put thousands of lines in one prompt and blow the connector's
 * context window, which would read as the model declining. Before the cut the
 * options are ranked so datasets the report mentions come first (see
 * `rankOptionsForModel`); the cut is deterministic and logged.
 */
export const MAX_MODEL_DATASET_OPTIONS = 200;

/**
 * Orders the model's options so any dataset whose vendor token, or a segment of
 * it, appears in the report's vendor, product, text, or IOC values comes first,
 * keeping the original order within each half. A Zscaler report in a cluster with
 * two hundred alphabetically earlier datasets still gets `zscaler.*` in front of
 * the model; without this the cap would make later datasets unmatchable for good.
 */
export const rankOptionsForModel = (
  datasets: DiscoveredDataset[],
  report: HuntScopeReportContext
): DiscoveredDataset[] => {
  const haystack = normalizeVendorToken(
    [
      report.vendor ?? '',
      report.product ?? '',
      report.text?.slice(0, MAX_PROMPT_TEXT_CHARS) ?? '',
      ...(report.iocs ?? []).slice(0, MAX_PROMPT_IOCS).map((ioc) => ioc.value),
    ].join(' ')
  );
  if (haystack === '') return datasets;
  const mentioned = (dataset: DiscoveredDataset): boolean =>
    [normalizeVendorToken(dataset.vendor), ...vendorSegments(dataset.vendor)].some(
      (token) =>
        token.length >= MIN_TOKEN_LENGTH &&
        !GENERIC_VENDOR_TOKENS.has(token) &&
        haystack.includes(token)
    );
  return [...datasets.filter(mentioned), ...datasets.filter((dataset) => !mentioned(dataset))];
};
const MAX_PROMPT_TEXT_CHARS = 6000;

/** Lower-cases and strips everything that is not `[a-z0-9]`, so 'Cisco ASA' and 'cisco_asa' compare equal. */
export const normalizeVendorToken = (value: string): string =>
  value.toLowerCase().replace(/[^a-z0-9]/g, '');

/**
 * Report vendors whose Fleet dataset vendor token is not derivable from the
 * name (KEV says 'Palo Alto Networks', the integration is `panw`), keyed by
 * normalized report vendor -> normalized dataset vendor tokens. Consulted
 * before the length check so a short vendor like `f5` can still match. Extend
 * when live runs show a miss.
 */
export const HUNT_VENDOR_ALIASES: Readonly<Record<string, readonly string[]>> = {
  paloaltonetworks: ['panw'],
  f5: ['f5bigip'],
  vmware: ['vsphere'],
  amazon: ['aws'],
  amazonwebservices: ['aws'],
  fortigate: ['fortinetfortigate'],
};

/** Normalized segments of a dataset vendor token: `cisco_asa` -> ['cisco', 'asa']. */
const vendorSegments = (datasetVendor: string): string[] =>
  datasetVendor
    .split(/[_-]/)
    .map(normalizeVendorToken)
    .filter((segment) => segment !== '');

/**
 * Matches datasets to a report by vendor and product tokens alone. A dataset
 * matches when (a) its vendor token appears inside the report's vendor or
 * product, (b) the report's vendor equals one of the `_`-separated segments of
 * the dataset's vendor token (so 'Cisco' finds `cisco_asa.log` and
 * `cisco_ise.log`, but 'Intel' does not find `zeek.intel`), or (c) its vendor
 * token is listed under the report's vendor or product in
 * `HUNT_VENDOR_ALIASES`. Tokens shorter than three characters are ignored for
 * (a) and (b), and category-like dataset vendor tokens (`system`, `generic`)
 * never match through the report's product text. Returns [] when the report
 * has neither vendor nor product; an unmatched vendor falls through to the
 * model matcher.
 */
export const matchDatasetsDeterministic = ({
  datasets,
  vendor,
  product,
}: {
  datasets: DiscoveredDataset[];
  vendor?: string;
  product?: string;
}): DiscoveredDataset[] => {
  const reportVendor = vendor ? normalizeVendorToken(vendor) : '';
  const reportProduct = product ? normalizeVendorToken(product) : '';
  if (reportVendor === '' && reportProduct === '') return [];

  const aliases = new Set([
    ...(HUNT_VENDOR_ALIASES[reportVendor] ?? []),
    ...(HUNT_VENDOR_ALIASES[reportProduct] ?? []),
  ]);

  return datasets.filter((dataset) => {
    const datasetVendor = normalizeVendorToken(dataset.vendor);
    if (aliases.has(datasetVendor)) return true;

    const vendorTokenInReport =
      datasetVendor.length >= MIN_TOKEN_LENGTH &&
      !GENERIC_VENDOR_TOKENS.has(datasetVendor) &&
      (reportVendor.includes(datasetVendor) || reportProduct.includes(datasetVendor));
    const reportVendorIsVendorSegment =
      reportVendor.length >= MIN_TOKEN_LENGTH &&
      vendorSegments(dataset.vendor).includes(reportVendor);

    return vendorTokenInReport || reportVendorIsVendorSegment;
  });
};

export interface ModelDatasetMatch {
  /** Datasets that cleared the threshold, in option-list order. */
  matches: DiscoveredDataset[];
  /** Lowest confidence among the accepted matches. */
  confidence: number;
  /** Every accepted match with its own confidence, for logging. */
  scored: Array<{ dataset: string; confidence: number }>;
}

const datasetMatchSchema = z.object({
  datasets: z.array(
    z.object({
      dataset: z.string(),
      confidence: z.number().min(0).max(1),
    })
  ),
});

type DatasetMatchOutput = z.infer<typeof datasetMatchSchema>;

const SYSTEM_PROMPT = `You are a security analyst deciding which log datasets in an environment a threat report is relevant to.
You will be given the report's vendor and product, then the list of datasets that actually exist, then the rest of the report's context.
The vendor and product are the primary criterion: pick only datasets from this vendor/product; a dataset from a different vendor is not relevant even if it could record similar activity.
Return the exact dataset names from the list; never invent a name.
Prefer returning no datasets over guessing. For each dataset you return, report your confidence (0 to 1) that it belongs in the scope.`;

const buildPrompt = (datasets: DiscoveredDataset[], report: HuntScopeReportContext): string => {
  const sections: string[] = [SYSTEM_PROMPT];

  const subjectLines: string[] = [];
  if (report.vendor) subjectLines.push(`Vendor: ${report.vendor}`);
  if (report.product) subjectLines.push(`Product: ${report.product}`);
  if (subjectLines.length > 0) {
    sections.push(`--- REPORT VENDOR AND PRODUCT ---\n${subjectLines.join('\n')}`);
  }

  sections.push(
    `--- AVAILABLE DATASETS (dataset | index_pattern) ---\n${datasets
      .map((dataset) => `${dataset.dataset} | ${dataset.index_pattern}`)
      .join('\n')}`
  );

  const contextLines: string[] = [];
  if (report.techniques && report.techniques.length > 0) {
    contextLines.push(`Techniques: ${report.techniques.join(', ')}`);
  }
  if (report.iocs && report.iocs.length > 0) {
    contextLines.push(
      `IOCs: ${report.iocs
        .slice(0, MAX_PROMPT_IOCS)
        .map((ioc) => ioc.value)
        .join(', ')}`
    );
  }
  if (contextLines.length > 0) {
    sections.push(`--- REPORT CONTEXT ---\n${contextLines.join('\n')}`);
  }

  if (report.text) {
    sections.push(`--- REPORT TEXT ---\n${report.text.slice(0, MAX_PROMPT_TEXT_CHARS)}`);
  }

  return sections.join('\n\n');
};

/**
 * Asks the model which discovered datasets a report is relevant to, scoring
 * each one separately so a confident pick is not diluted by a guess in the
 * same answer. Returned names are checked against the real option list (exact
 * match on `dataset`) so a hallucinated name never reaches the hunt, and every
 * item below `HUNT_DATASET_MATCH_MIN_CONFIDENCE` is dropped on its own.
 * Returns undefined, never throws, when there is nothing to choose from, the
 * call fails, or nothing real clears the threshold.
 */
export const matchDatasetsWithModel = async ({
  model,
  datasets,
  report,
  logger,
}: {
  model: ScopedModel;
  datasets: DiscoveredDataset[];
  report: HuntScopeReportContext;
  logger?: Logger;
}): Promise<ModelDatasetMatch | undefined> => {
  if (datasets.length === 0) return undefined;

  const ranked = rankOptionsForModel(datasets, report);
  const options =
    ranked.length > MAX_MODEL_DATASET_OPTIONS ? ranked.slice(0, MAX_MODEL_DATASET_OPTIONS) : ranked;
  if (options.length < datasets.length) {
    logger?.warn(
      `Hunt dataset model matching offered ${options.length} of ${datasets.length} discovered datasets; the rest cannot be matched by the model this run`
    );
  }

  let output: DatasetMatchOutput;
  try {
    const structured = model.chatModel.withStructuredOutput(datasetMatchSchema);
    const raw = await structured.invoke(buildPrompt(options, report));
    // The structured-output contract is only as good as the provider honours it: a
    // missing or NaN `confidence` would pass the threshold compare below, and a
    // non-array `datasets` would throw outside this try. Validate before trusting.
    const parsed = datasetMatchSchema.safeParse(raw);
    if (!parsed.success) {
      logger?.warn(
        `Hunt dataset model matching returned an invalid shape: ${parsed.error.message}`
      );
      return undefined;
    }
    output = parsed.data;
  } catch (err) {
    logger?.warn(
      `Hunt dataset model matching failed: ${err instanceof Error ? err.message : String(err)}`
    );
    return undefined;
  }

  const optionNames = new Set(options.map((dataset) => dataset.dataset));
  const confidenceByName = new Map<string, number>();
  let hallucinated = 0;
  let belowThreshold = 0;
  for (const item of output.datasets) {
    if (!optionNames.has(item.dataset)) {
      hallucinated += 1;
      continue;
    }
    if (item.confidence < HUNT_DATASET_MATCH_MIN_CONFIDENCE) {
      belowThreshold += 1;
      continue;
    }
    // The same name twice keeps its highest score.
    const previous = confidenceByName.get(item.dataset);
    if (previous === undefined || item.confidence > previous) {
      confidenceByName.set(item.dataset, item.confidence);
    }
  }

  if (hallucinated > 0 || belowThreshold > 0) {
    logger?.debug(
      `Hunt dataset model matching dropped ${
        hallucinated + belowThreshold
      } item(s): ${hallucinated} not in the option list, ${belowThreshold} below confidence threshold ${HUNT_DATASET_MATCH_MIN_CONFIDENCE}`
    );
  }

  const matches = datasets.filter((dataset) => confidenceByName.has(dataset.dataset));
  if (matches.length === 0) {
    if (hallucinated === 0 && belowThreshold === 0) {
      logger?.debug('Hunt dataset model matching returned no datasets');
    }
    return undefined;
  }

  const scored = matches.flatMap((dataset) => {
    const itemConfidence = confidenceByName.get(dataset.dataset);
    return itemConfidence === undefined
      ? []
      : [{ dataset: dataset.dataset, confidence: itemConfidence }];
  });
  const confidence = Math.min(...scored.map((item) => item.confidence));

  return { matches, confidence, scored };
};
