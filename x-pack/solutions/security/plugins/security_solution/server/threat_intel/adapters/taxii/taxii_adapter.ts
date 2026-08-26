/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GLOBAL_SPACE_ID } from '../../../../common/threat_intel';
import { fetchUrlForContext, redactUrl } from '../http_client';
import { buildFingerprint } from '../fingerprint';
import { DEFAULT_SEVERITY_LEVEL, DEFAULT_SEVERITY_SCORE } from '../../content/severity';
import { buildReportContent, collapseWhitespace, truncate } from '../../content/text';
import type { AdapterRunContext, FetchAdapter, NormalizedReport, SourceHit } from '../types';
import { composeStixBody, composeStixTitle, splitStixBundle } from '../stix/split_bundle';

const TITLE_MAX_LENGTH = 280;
const BODY_TEXT_MAX_LENGTH = 32_000;
const TAXII_ACCEPT = 'application/taxii+json;version=2.1, application/json';
const TAXII_CONNECTOR_POLL_SUB_ACTION = 'pollCollection';

/**
 * Bound on TAXII 2.1 continuation pages per run. A server that always answers
 * `more: true` would otherwise spin forever; the next scheduled run resumes.
 */
const MAX_TAXII_PAGES = 50;

/** TAXII 2.1 envelope paging fields. */
const readEnvelopePaging = (envelope: unknown): { more: boolean; next?: string } => {
  const env = envelope as { more?: unknown; next?: unknown } | null | undefined;
  const next = typeof env?.next === 'string' && env.next.length > 0 ? env.next : undefined;
  return { more: env?.more === true, next };
};

/** TAXII 2.1 passes the continuation token as the `next` query parameter. */
const withNextParam = (url: string, next: string): string => {
  const parsed = new URL(url);
  parsed.searchParams.set('next', next);
  return parsed.toString();
};

const deriveCollectionId = (url: string): string => {
  const match = /\/collections\/([^/]+)/.exec(url);
  return match ? match[1] : 'unknown';
};

const readCollectionUrl = (source: SourceHit): string | undefined => {
  const url = source._source.config.url;
  return typeof url === 'string' && url.length > 0 ? url : undefined;
};

const readConnectorId = (source: SourceHit): string | undefined => {
  const id = source._source.config.connector_id;
  return typeof id === 'string' && id.length > 0 ? id : undefined;
};

const safeParseJson = (body: string): unknown => {
  try {
    return JSON.parse(body);
  } catch {
    return undefined;
  }
};

const fetchViaConnector = async (
  connectorId: string,
  collectionUrl: string,
  context: AdapterRunContext,
  next?: string
): Promise<unknown> => {
  if (!context.getActionsClient) {
    throw new Error(
      `Source has connector_id "${connectorId}" but the actions plugin is not available in the workflow execution context`
    );
  }
  const actionsClient = await context.getActionsClient();
  if (!actionsClient) {
    throw new Error(
      `Source has connector_id "${connectorId}" but no ActionsClient could be resolved (actions plugin not started?)`
    );
  }
  const result = await actionsClient.execute({
    actionId: connectorId,
    params: {
      subAction: TAXII_CONNECTOR_POLL_SUB_ACTION,
      subActionParams: { collectionUrl, ...(next ? { next } : {}) },
    },
  });
  if (result.status !== 'ok') {
    const reason = result.message ?? result.serviceMessage ?? 'unknown';
    throw new Error(`TAXII connector "${connectorId}" pollCollection failed: ${reason}`);
  }
  return result.data;
};

/** TAXII 2.1 collection poll; credentialed via connector_id or anonymous fetch. */
export const taxiiAdapter: FetchAdapter = {
  adapterType: 'taxii',
  async run(source, context: AdapterRunContext) {
    const fetchUrl = fetchUrlForContext(context);
    const log = context.logger.get('taxii-adapter');
    const url = readCollectionUrl(source);
    if (!url) {
      log.warn(`Source ${source._id} has no config.url — skipping`);
      return [];
    }

    const connectorId = readConnectorId(source);
    if (connectorId) {
      log.debug(
        `Polling TAXII collection ${url} via connector ${connectorId} for source ${source._id}`
      );
    }

    const fetchEnvelope = async (next?: string): Promise<unknown> => {
      if (connectorId) {
        return fetchViaConnector(connectorId, url, context, next);
      }
      const pageUrl = next ? withNextParam(url, next) : url;
      const response = await fetchUrl(pageUrl, {
        abortSignal: context.abortSignal,
        headers: { Accept: TAXII_ACCEPT },
      });
      if (response.status >= 400) {
        throw new Error(
          `TAXII poll ${redactUrl(pageUrl)} failed: HTTP ${response.status} ${response.statusText}`
        );
      }
      const parsed = safeParseJson(response.body);
      if (parsed == null) {
        throw new Error(`TAXII response at ${redactUrl(pageUrl)} was not valid JSON`);
      }
      return parsed;
    };

    // TAXII 2.1 pages collections with `more` + `next`. Reading only the first
    // envelope silently dropped every later page on every run, so a collection
    // larger than the server page size was never fully ingested.
    const sdos: ReturnType<typeof splitStixBundle> = [];
    let nextToken: string | undefined;
    let pages = 0;
    do {
      const envelope = await fetchEnvelope(nextToken);
      sdos.push(...splitStixBundle(envelope));
      pages += 1;

      const paging = readEnvelopePaging(envelope);
      nextToken = paging.more ? paging.next : undefined;

      if (nextToken && pages >= MAX_TAXII_PAGES) {
        log.warn(
          `TAXII collection at ${url} still reported more pages after ${MAX_TAXII_PAGES} for ` +
            `source ${source._id}; stopping and resuming on the next run`
        );
        break;
      }
    } while (nextToken && !context.abortSignal.aborted);

    if (pages > 1) {
      log.debug(
        `TAXII collection at ${url} returned ${sdos.length} objects across ${pages} pages for source ${source._id}`
      );
    }

    if (sdos.length === 0) {
      log.debug(
        `TAXII collection at ${url} returned 0 reportable objects for source ${source._id}`
      );
      return [];
    }

    const ingestedAt = context.now().toISOString();
    const spaceId = source._source.space_id ?? GLOBAL_SPACE_ID;
    const adapterId = `taxii:${source._id}`;
    const collectionId = deriveCollectionId(url);
    const sourceDocRefIndex = `taxii:collection:${collectionId}`;

    const reports: NormalizedReport[] = [];
    for (const { object } of sdos) {
      const title = collapseWhitespace(composeStixTitle(object));
      const bodyText = truncate(composeStixBody(object), BODY_TEXT_MAX_LENGTH);
      const versionStamp = object.modified ?? object.created ?? '';
      const fingerprint = buildFingerprint([url, object.id, versionStamp]);
      reports.push({
        '@timestamp': ingestedAt,
        content_fingerprint: fingerprint,
        space_id: spaceId,
        source: {
          type: 'taxii',
          name: source._source.name,
          url,
          adapter_id: adapterId,
        },
        content: buildReportContent({
          title: truncate(title, TITLE_MAX_LENGTH),
          bodyText,
          language: 'en',
        }),
        severity: {
          level: DEFAULT_SEVERITY_LEVEL,
          score: DEFAULT_SEVERITY_SCORE,
        },
        lineage: {
          ingested_at: ingestedAt,
          extraction_method: 'pending',
          source_doc_ref: {
            index: sourceDocRefIndex,
            id: object.id,
          },
        },
      });
    }
    return reports;
  },
};
