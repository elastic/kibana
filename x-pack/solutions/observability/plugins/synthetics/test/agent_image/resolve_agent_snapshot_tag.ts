/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import semver from 'semver';
import type { ScoutLogger } from '@kbn/scout-oblt';

export const ELASTIC_AGENT_IMAGE = 'docker.elastic.co/elastic-agent/elastic-agent';
export const ELASTIC_AGENT_COMPLETE_IMAGE =
  'docker.elastic.co/elastic-agent/elastic-agent-complete';

const ARTIFACTS_VERSIONS_URL = 'https://artifacts-api.elastic.co/v1/versions';
const ARTIFACTS_FETCH_TIMEOUT_MS = 10 * 1000;

export type AgentImageKind = 'complete' | 'agent';

export interface ResolveAgentSnapshotTagDeps {
  hasManifest: (image: string) => boolean;
  fetchSnapshotVersions?: () => Promise<string[]>;
}

const toSnapshotTag = (version: string): string =>
  version.includes('-SNAPSHOT') ? version : `${version}-SNAPSHOT`;

const toReleaseVersion = (version: string): string => version.replace(/-SNAPSHOT$/, '');

const fetchPublishedSnapshotVersions = async (): Promise<string[]> => {
  const response = await fetch(ARTIFACTS_VERSIONS_URL, {
    signal: AbortSignal.timeout(ARTIFACTS_FETCH_TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText}`);
  }
  const { versions } = (await response.json()) as { versions: string[] };
  return versions.filter((version) => version.endsWith('-SNAPSHOT'));
};

/**
 * Resolves the Elastic Agent snapshot tag for the Kibana under test. Right after a minor
 * bump `elastic-agent:<version>-SNAPSHOT` may not be published yet, so this falls back to
 * the latest published snapshot of the same major, at most one minor behind Kibana. Anything
 * older would let the suite pass against an agent that is not the one under test.
 */
export const resolveAgentSnapshotTag = async (
  kibanaVersion: string,
  log: Pick<ScoutLogger, 'warning'>,
  agentImage: AgentImageKind,
  {
    hasManifest,
    fetchSnapshotVersions = fetchPublishedSnapshotVersions,
  }: ResolveAgentSnapshotTagDeps
): Promise<string> => {
  const hasRequiredImages = (tag: string): boolean =>
    hasManifest(`${ELASTIC_AGENT_IMAGE}:${tag}`) &&
    (agentImage !== 'complete' || hasManifest(`${ELASTIC_AGENT_COMPLETE_IMAGE}:${tag}`));

  const preferredTag = toSnapshotTag(kibanaVersion);
  if (hasRequiredImages(preferredTag)) {
    return preferredTag;
  }

  const warnFallback = (fallbackTag: string) =>
    log.warning(
      `${ELASTIC_AGENT_IMAGE}:${preferredTag} not published yet; falling back to ${fallbackTag}`
    );
  const targetRelease = toReleaseVersion(kibanaVersion);
  const target = semver.parse(targetRelease);
  if (!target) {
    return preferredTag;
  }

  const isWithinFallbackRange = (version: string): boolean =>
    semver.valid(version) !== null &&
    semver.lte(version, targetRelease) &&
    semver.major(version) === target.major &&
    semver.minor(version) >= target.minor - 1;

  try {
    const candidates = (await fetchSnapshotVersions())
      .map(toReleaseVersion)
      .filter(isWithinFallbackRange)
      .sort(semver.rcompare);

    for (const candidate of candidates) {
      const candidateTag = `${candidate}-SNAPSHOT`;
      if (candidateTag !== preferredTag && hasRequiredImages(candidateTag)) {
        warnFallback(candidateTag);
        return candidateTag;
      }
    }
  } catch (error) {
    log.warning(
      `Failed to resolve fallback snapshot from ${ARTIFACTS_VERSIONS_URL}: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }

  if (target.minor > 0 && target.patch === 0) {
    const previousMinorTag = `${target.major}.${target.minor - 1}.0-SNAPSHOT`;
    if (hasRequiredImages(previousMinorTag)) {
      warnFallback(previousMinorTag);
      return previousMinorTag;
    }
  }

  return preferredTag;
};
