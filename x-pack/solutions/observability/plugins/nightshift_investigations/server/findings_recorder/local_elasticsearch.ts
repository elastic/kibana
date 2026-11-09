/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { toBaseUrl, type ImpactMapDataSource } from '@kbn/agentic-investigations-plugin/common';

/** The Elasticsearch this Kibana runs against: what it is, and where a person or agent reaches it. */
export interface LocalElasticsearch {
  description: string;
  url?: string;
}

interface CloudInfo {
  isServerlessEnabled?: boolean;
  isCloudEnabled?: boolean;
  deploymentId?: string;
  serverless?: { projectId?: string; projectName?: string; projectType?: string };
}

/** Says what the local Elasticsearch is: a serverless project, a cloud deployment or a cluster. */
export const describeLocalElasticsearch = ({
  cloud,
  url,
}: {
  cloud?: CloudInfo;
  url?: string;
}): LocalElasticsearch => {
  const base = toBaseUrl(url);
  if (cloud?.isServerlessEnabled) {
    const { projectName, projectId, projectType } = cloud.serverless ?? {};
    const name = projectName || projectId;
    return {
      description: `Elastic Cloud Serverless ${projectType ? `${projectType} ` : ''}project${
        name ? ` ${name}` : ''
      }`,
      ...(base ? { url: base } : {}),
    };
  }
  if (cloud?.isCloudEnabled) {
    return {
      description: `Elastic Cloud deployment${cloud.deploymentId ? ` ${cloud.deploymentId}` : ''}`,
      ...(base ? { url: base } : {}),
    };
  }
  return { description: 'Self-managed cluster', ...(base ? { url: base } : {}) };
};

const isElasticsearch = (name: string) => /elasticsearch|elastic\b|\bes\|?ql\b/i.test(name);
const THIS_ONE = /\b(this|local|current|same|own)\b|kibana'?s/i;

const withFullEndpoint = (
  call: NonNullable<ImpactMapDataSource['api_call']>,
  baseUrl?: string
): NonNullable<ImpactMapDataSource['api_call']> =>
  baseUrl && call.endpoint?.startsWith('/')
    ? { ...call, endpoint: `${baseUrl}${call.endpoint}` }
    : call;

/**
 * Fills in what the model cannot know: which Elasticsearch is the local one, its URL, and the full
 * endpoint of each call, so the evidence can be reproduced from anywhere. Elasticsearch data with no
 * stated scope, or described as this one, is local; a remote one keeps what the model gave it.
 */
export const withLocalElasticsearch = <T extends { data_source?: ImpactMapDataSource }>(
  events: readonly T[],
  local?: LocalElasticsearch
): T[] =>
  events.map((event) => {
    const source = event.data_source;
    if (!source || !isElasticsearch(source.name)) return event;
    const isLocal =
      source.scope === 'local' ||
      (source.scope !== 'remote' &&
        !source.base_url &&
        (!source.instance || THIS_ONE.test(source.instance)));
    if (isLocal && local) {
      return {
        ...event,
        data_source: {
          ...source,
          scope: 'local' as const,
          instance: local.description,
          ...(local.url ? { base_url: local.url } : {}),
          ...(source.api_call ? { api_call: withFullEndpoint(source.api_call, local.url) } : {}),
        },
      };
    }
    const base = toBaseUrl(source.base_url);
    return {
      ...event,
      data_source: {
        ...source,
        ...(source.scope ? {} : { scope: 'remote' as const }),
        ...(base ? { base_url: base } : {}),
        ...(source.api_call ? { api_call: withFullEndpoint(source.api_call, base) } : {}),
      },
    };
  });
