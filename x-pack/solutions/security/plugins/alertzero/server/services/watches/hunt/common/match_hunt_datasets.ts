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
const GENERIC_VENDOR_TOKENS: ReadonlySet<string> = new Set(['system', 'generic', 'log', 'logs']);

/** Prompt budget: enough IOCs to hint at the platform without drowning the dataset list. */
const MAX_PROMPT_IOCS = 25;
const MAX_PROMPT_TEXT_CHARS = 6000;

/** Lower-cases and strips everything that is not `[a-z0-9]`, so 'Cisco ASA' and 'cisco_asa' compare equal. */
export const normalizeVendorToken = (value: string): string =>
  value.toLowerCase().replace(/[^a-z0-9]/g, '');

/**
 * Matches datasets to a report by vendor and product tokens alone. A dataset
 * matches when its vendor token appears inside the report's vendor or product,
 * or the report's vendor appears inside the dataset's full name (so 'Cisco'
 * still finds `cisco_asa`, whose vendor token is the whole name). Tokens
 * shorter than three characters are ignored on both sides, and category-like
 * dataset vendor tokens (`system`, `generic`) never match through the report's
 * product text. Returns [] when the
 * report has neither vendor nor product. No alias table: an unmatched vendor
 * falls through to the model matcher.
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

  return datasets.filter((dataset) => {
    const datasetVendor = normalizeVendorToken(dataset.vendor);
    const datasetName = normalizeVendorToken(dataset.dataset);

    const vendorTokenInReport =
      datasetVendor.length >= MIN_TOKEN_LENGTH &&
      !GENERIC_VENDOR_TOKENS.has(datasetVendor) &&
      (reportVendor.includes(datasetVendor) || reportProduct.includes(datasetVendor));
    const reportVendorInDatasetName =
      reportVendor.length >= MIN_TOKEN_LENGTH && datasetName.includes(reportVendor);

    return vendorTokenInReport || reportVendorInDatasetName;
  });
};

export interface ModelDatasetMatch {
  matches: DiscoveredDataset[];
  confidence: number;
}

const datasetMatchSchema = z.object({
  datasets: z.array(z.string()),
  confidence: z.number().min(0).max(1),
});

type DatasetMatchOutput = z.infer<typeof datasetMatchSchema>;

const SYSTEM_PROMPT = `You are a security analyst deciding which log datasets in an environment a threat report is relevant to.
You will be given the list of datasets that actually exist, then the report's context.
Pick only datasets whose vendor or product the report concerns, or whose events would directly record the described activity.
Return the exact dataset names from the list; never invent a name.
Prefer returning no datasets over guessing. Report your confidence (0 to 1) that the chosen datasets are the right scope.`;

const buildPrompt = (datasets: DiscoveredDataset[], report: HuntScopeReportContext): string => {
  const sections: string[] = [SYSTEM_PROMPT];

  sections.push(
    `--- AVAILABLE DATASETS (dataset | index_pattern) ---\n${datasets
      .map((dataset) => `${dataset.dataset} | ${dataset.index_pattern}`)
      .join('\n')}`
  );

  const reportLines: string[] = [];
  if (report.vendor) reportLines.push(`Vendor: ${report.vendor}`);
  if (report.product) reportLines.push(`Product: ${report.product}`);
  if (report.techniques && report.techniques.length > 0) {
    reportLines.push(`Techniques: ${report.techniques.join(', ')}`);
  }
  if (report.iocs && report.iocs.length > 0) {
    reportLines.push(
      `IOCs: ${report.iocs
        .slice(0, MAX_PROMPT_IOCS)
        .map((ioc) => ioc.value)
        .join(', ')}`
    );
  }
  if (reportLines.length > 0) {
    sections.push(`--- REPORT CONTEXT ---\n${reportLines.join('\n')}`);
  }

  if (report.text) {
    sections.push(`--- REPORT TEXT ---\n${report.text.slice(0, MAX_PROMPT_TEXT_CHARS)}`);
  }

  return sections.join('\n\n');
};

/**
 * Asks the model which discovered datasets a report is relevant to. Returned
 * names are checked against the real option list (exact match on `dataset`) so
 * a hallucinated name never reaches the hunt. Returns undefined, never throws,
 * when there is nothing to choose from, the call fails, nothing real was
 * chosen, or the model's confidence is below `HUNT_DATASET_MATCH_MIN_CONFIDENCE`.
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

  let output: DatasetMatchOutput;
  try {
    const structured = model.chatModel.withStructuredOutput(datasetMatchSchema);
    output = (await structured.invoke(buildPrompt(datasets, report))) as DatasetMatchOutput;
  } catch (err) {
    logger?.warn(
      `Hunt dataset model matching failed: ${err instanceof Error ? err.message : String(err)}`
    );
    return undefined;
  }

  const chosen = new Set(output.datasets ?? []);
  const matches = datasets.filter((dataset) => chosen.has(dataset.dataset));
  if (matches.length === 0) {
    logger?.debug('Hunt dataset model matching returned no dataset from the option list');
    return undefined;
  }

  const confidence = output.confidence;
  if (confidence < HUNT_DATASET_MATCH_MIN_CONFIDENCE) {
    logger?.debug(
      `Hunt dataset model matching dropped ${matches.length} match(es): confidence ${confidence} below threshold ${HUNT_DATASET_MATCH_MIN_CONFIDENCE}`
    );
    return undefined;
  }

  return { matches, confidence };
};
