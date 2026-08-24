/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GLOBAL_SPACE_ID } from '../../../../common/threat_intel';
import { fetchUrl, redactUrl } from '../http_client';
import { buildFingerprint } from '../fingerprint';
import { DEFAULT_SEVERITY_LEVEL, DEFAULT_SEVERITY_SCORE } from '../severity';
import { buildReportContent, collapseWhitespace, truncate } from '../text';
import type { AdapterRunContext, FetchAdapter, NormalizedReport, SourceHit } from '../types';
import { composeStixBody, composeStixTitle, splitStixBundle } from '../stix/split_bundle';

const TITLE_MAX_LENGTH = 280;
const BODY_TEXT_MAX_LENGTH = 32_000;
const TAXII_ACCEPT = 'application/taxii+json;version=2.1, application/json';
const TAXII_CONNECTOR_POLL_SUB_ACTION = 'pollCollection';

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
  context: AdapterRunContext
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
      subActionParams: { collectionUrl },
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
    const log = context.logger.get('taxii-adapter');
    const url = readCollectionUrl(source);
    if (!url) {
      log.warn(`Source ${source._id} has no config.url — skipping`);
      return [];
    }

    const connectorId = readConnectorId(source);
    let envelope: unknown;
    if (connectorId) {
      log.debug(
        `Polling TAXII collection ${url} via connector ${connectorId} for source ${source._id}`
      );
      envelope = await fetchViaConnector(connectorId, url, context);
    } else {
      const response = await fetchUrl(url, {
        abortSignal: context.abortSignal,
        headers: { Accept: TAXII_ACCEPT },
        fetchFn: context.fetchFn,
        lookupFn: context.lookupFn,
      });
      if (response.status >= 400) {
        throw new Error(
          `TAXII poll ${redactUrl(url)} failed: HTTP ${response.status} ${response.statusText}`
        );
      }
      envelope = safeParseJson(response.body);
      if (envelope == null) {
        throw new Error(`TAXII response at ${redactUrl(url)} was not valid JSON`);
      }
    }

    const sdos = splitStixBundle(envelope);
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
