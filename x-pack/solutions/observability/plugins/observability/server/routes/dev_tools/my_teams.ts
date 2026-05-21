/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { exec, type ExecException } from 'child_process';
import type { IRouter, Logger } from '@kbn/core/server';
import { REPO_ROOT } from '@kbn/repo-info';
import { findOwnerForPath, getManifestIndex } from './manifest_index';

export interface MyTeamsResponse {
  /** Git `user.email` we used to attribute commits; undefined when not configured. */
  detectedEmail?: string;
  /**
   * Teams suggested for the current developer, sorted by `evidenceCount`
   * descending. Empty when no signal is available (e.g. shallow clone, brand
   * new contributor, or `user.email` is not set in `git config`).
   */
  suggestedTeams: Array<{ team: string; evidenceCount: number }>;
  /** Total number of commit-touched files we attributed to a known plugin. */
  matchedFileCount: number;
  /** Total files returned by `git log` (some may not map to any plugin). */
  scannedFileCount: number;
  /** ISO timestamp – callers can use it to display "as of …" in the UI. */
  detectedAt: string;
}

const ROUTE_PATH = '/internal/observability/dev_tools/my_teams' as const;

/** Hard cap on how many recent commits we inspect — bounds `git log` cost. */
const MAX_COMMITS = 500;

/** Hard cap on the response wait — prevents a hung git process from blocking. */
const GIT_TIMEOUT_MS = 5_000;

let cached: MyTeamsResponse | null = null;

interface GitExecResult {
  stdout: string;
  stderr: string;
}

const runGit = (args: string[]): Promise<GitExecResult> => {
  return new Promise((resolve, reject) => {
    // We pass the args array via shell-safe quoting. Email addresses are the
    // only piece of user-influenced input here; quoting them as a single
    // argument keeps shell-special characters (`(`, `+`, etc.) from causing
    // surprises across different developer machines.
    const cmd = `git ${args.map((a) => `'${a.replace(/'/g, `'\\''`)}'`).join(' ')}`;
    exec(
      cmd,
      { cwd: REPO_ROOT, timeout: GIT_TIMEOUT_MS, maxBuffer: 10 * 1024 * 1024 },
      (err: ExecException | null, stdout, stderr) => {
        if (err) {
          reject(err);
          return;
        }
        resolve({ stdout: stdout.toString(), stderr: stderr.toString() });
      }
    );
  });
};

const detectGitEmail = async (logger: Logger): Promise<string | undefined> => {
  try {
    const { stdout } = await runGit(['config', '--get', 'user.email']);
    const email = stdout.trim();
    return email.length > 0 ? email : undefined;
  } catch (err) {
    logger.debug(`my_teams: git config user.email failed: ${(err as Error).message ?? err}`);
    return undefined;
  }
};

const listFilesForAuthor = async (email: string, logger: Logger): Promise<string[]> => {
  try {
    const { stdout } = await runGit([
      'log',
      `--author=${email}`,
      `-n`,
      String(MAX_COMMITS),
      '--pretty=format:',
      '--name-only',
      '--no-renames',
    ]);
    // `--pretty=format:` emits one blank line per commit + one file per line.
    // Splitting on newline and filtering empties is enough — no shelling out
    // to `awk` or `sort` needed.
    return stdout
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
  } catch (err) {
    logger.debug(`my_teams: git log failed: ${(err as Error).message ?? err}`);
    return [];
  }
};

/**
 * Build the suggestions object from a list of file paths the developer has
 * touched. Each path is mapped to the deepest owning plugin (per the manifest
 * index); each owning team's evidence count is incremented once per file.
 * Files that don't map to any plugin (e.g. `.github/`, root config files,
 * `docs/`) are still counted in `scannedFileCount` so the UI can show
 * "X of Y files attributed".
 */
const tallyTeams = async (
  filePaths: string[],
  logger: Logger
): Promise<{
  suggestedTeams: Array<{ team: string; evidenceCount: number }>;
  matchedFileCount: number;
}> => {
  if (filePaths.length === 0) {
    return { suggestedTeams: [], matchedFileCount: 0 };
  }
  const index = await getManifestIndex(REPO_ROOT, logger);
  if (index.entries.length === 0) {
    return { suggestedTeams: [], matchedFileCount: 0 };
  }
  const counts = new Map<string, number>();
  let matchedFileCount = 0;
  for (const path of filePaths) {
    const entry = findOwnerForPath(index, path);
    if (!entry) continue;
    matchedFileCount++;
    for (const team of entry.owners) {
      counts.set(team, (counts.get(team) ?? 0) + 1);
    }
  }
  const suggestedTeams = [...counts.entries()]
    .map(([team, evidenceCount]) => ({ team, evidenceCount }))
    .sort((a, b) => b.evidenceCount - a.evidenceCount || a.team.localeCompare(b.team));
  return { suggestedTeams, matchedFileCount };
};

const buildResponse = async (logger: Logger): Promise<MyTeamsResponse> => {
  const detectedEmail = await detectGitEmail(logger);
  if (!detectedEmail) {
    return {
      detectedEmail: undefined,
      suggestedTeams: [],
      matchedFileCount: 0,
      scannedFileCount: 0,
      detectedAt: new Date().toISOString(),
    };
  }
  const filePaths = await listFilesForAuthor(detectedEmail, logger);
  const { suggestedTeams, matchedFileCount } = await tallyTeams(filePaths, logger);
  return {
    detectedEmail,
    suggestedTeams,
    matchedFileCount,
    scannedFileCount: filePaths.length,
    detectedAt: new Date().toISOString(),
  };
};

export const registerMyTeamsRoute = (router: IRouter, logger: Logger): void => {
  router.get(
    {
      path: ROUTE_PATH,
      security: {
        authz: {
          enabled: false,
          reason:
            "Dev-mode-only endpoint that derives the current developer's likely GitHub teams from local `git config user.email` + `git log` over their own commits in this checkout; contains no user-supplied data, no Kibana session data, and no secrets.",
        },
      },
      options: { access: 'internal' },
      validate: false,
    },
    async (_ctx, _req, res) => {
      if (!cached) {
        try {
          cached = await buildResponse(logger);
          logger.debug(
            `my_teams: detected ${cached.detectedEmail ?? '<none>'} -> ${
              cached.suggestedTeams.length
            } teams from ${cached.matchedFileCount}/${cached.scannedFileCount} files`
          );
        } catch (err) {
          logger.warn(
            `my_teams: failed to build response (${
              (err as Error).message ?? err
            }); responding with empty suggestions`
          );
          return res.ok({
            body: {
              detectedEmail: undefined,
              suggestedTeams: [],
              matchedFileCount: 0,
              scannedFileCount: 0,
              detectedAt: new Date().toISOString(),
            } satisfies MyTeamsResponse,
          });
        }
      }
      return res.ok({ body: cached });
    }
  );
};

/** Test-only: drop the cached response so the next call recomputes. */
export const __resetMyTeamsCacheForTests = (): void => {
  cached = null;
};

export const MY_TEAMS_ROUTE_PATH = ROUTE_PATH;
