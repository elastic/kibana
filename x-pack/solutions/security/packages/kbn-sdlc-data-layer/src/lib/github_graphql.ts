/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License 2.0.
 */

export const ORG_PROJECTS_LIST_QUERY = `
query SdlcOrgProjectsList($org: String!, $cursor: String) {
  organization(login: $org) {
    projectsV2(first: 50, after: $cursor) {
      pageInfo { hasNextPage endCursor }
      nodes {
        id
        number
        title
        url
      }
    }
  }
}
`;

export const PROJECTS_QUERY = `
query SdlcProjectsSync($org: String!, $projectNumber: Int!, $cursor: String) {
  organization(login: $org) {
    projectV2(number: $projectNumber) {
      id
      title
      url
      number
      fields(first: 50) {
        nodes {
          ... on ProjectV2Field { id name }
          ... on ProjectV2SingleSelectField {
            id name
            options { id name }
          }
          ... on ProjectV2IterationField {
            id name
            configuration { iterations { id title startDate duration } }
          }
        }
      }
      views(first: 50) {
        nodes { id name number filter }
      }
      items(first: 100, after: $cursor) {
        pageInfo { hasNextPage endCursor }
        nodes {
          id
          fieldValues(first: 30) {
            nodes {
              ... on ProjectV2ItemFieldSingleSelectValue {
                name
                field { ... on ProjectV2SingleSelectField { name } }
              }
              ... on ProjectV2ItemFieldTextValue {
                text
                field { ... on ProjectV2Field { name } }
              }
            }
          }
          content {
            ... on Issue {
              id
              number
              title
              state
              url
              repository { nameWithOwner }
              labels(first: 30) { nodes { name } }
              assignees(first: 10) { nodes { login } }
            }
            ... on PullRequest {
              id
              number
              title
              state
              url
              merged
              mergedAt
              repository { nameWithOwner }
            }
          }
        }
      }
    }
  }
}
`;

export const ORG_TEAMS_LIST_QUERY = `
query SdlcOrgTeamsList($org: String!, $cursor: String) {
  organization(login: $org) {
    teams(first: 15, after: $cursor) {
      pageInfo { hasNextPage endCursor }
      nodes {
        id
        slug
        name
        description
        members { totalCount }
      }
    }
  }
}
`;

export const ORG_TEAM_REPOS_QUERY = `
query SdlcOrgTeamRepos($org: String!, $teamSlug: String!, $cursor: String) {
  organization(login: $org) {
    team(slug: $teamSlug) {
      repositories(first: 30, after: $cursor) {
        pageInfo { hasNextPage endCursor }
        nodes { name nameWithOwner }
      }
    }
  }
}
`;

export const ORG_TEAM_MEMBERS_QUERY = `
query SdlcOrgTeamMembers($org: String!, $teamSlug: String!, $cursor: String) {
  organization(login: $org) {
    team(slug: $teamSlug) {
      members(first: 30, after: $cursor) {
        pageInfo { hasNextPage endCursor }
        nodes { login }
      }
    }
  }
}
`;

/** @deprecated Prefer ORG_TEAMS_LIST_QUERY with per-team detail queries for large orgs. */
export const ORG_TEAMS_QUERY = ORG_TEAMS_LIST_QUERY;

export const ORG_REPOS_QUERY = `
query SdlcOrgRepos($org: String!, $cursor: String) {
  organization(login: $org) {
    repositories(first: 25, after: $cursor, orderBy: { field: UPDATED_AT, direction: DESC }) {
      pageInfo { hasNextPage endCursor }
      nodes {
        id
        name
        nameWithOwner
        url
        description
        isPrivate
        defaultBranchRef { name }
        updatedAt
        createdAt
      }
    }
  }
}
`;

export interface GraphQlResponse<T> {
  data?: T;
  errors?: Array<{ message: string }>;
}

const RETRYABLE_GITHUB_HTTP_STATUSES = new Set([429, 502, 503, 504]);
const DEFAULT_MAX_ATTEMPTS = 5;
const DEFAULT_INITIAL_RETRY_DELAY_MS = 3_000;
const DEFAULT_REQUEST_TIMEOUT_MS = 120_000;

const sleep = (durationMs: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, durationMs);
  });

const isRetryableGitHubHttpStatus = (status: number): boolean =>
  RETRYABLE_GITHUB_HTTP_STATUSES.has(status);

export const fetchGitHubGraphQl = async <T>({
  token,
  query,
  variables,
  maxAttempts = DEFAULT_MAX_ATTEMPTS,
  initialRetryDelayMs = DEFAULT_INITIAL_RETRY_DELAY_MS,
  requestTimeoutMs = DEFAULT_REQUEST_TIMEOUT_MS,
}: {
  token: string;
  query: string;
  variables: Record<string, unknown>;
  maxAttempts?: number;
  initialRetryDelayMs?: number;
  requestTimeoutMs?: number;
}): Promise<T> => {
  let attempt = 0;
  let retryDelayMs = initialRetryDelayMs;

  while (attempt < maxAttempts) {
    attempt += 1;

    try {
      const response = await fetch('https://api.github.com/graphql', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: 'application/vnd.github+json',
        },
        body: JSON.stringify({ query, variables }),
        signal: AbortSignal.timeout(requestTimeoutMs),
      });

      if (!response.ok) {
        if (isRetryableGitHubHttpStatus(response.status) && attempt < maxAttempts) {
          await sleep(retryDelayMs);
          retryDelayMs *= 2;
          continue;
        }
        throw new Error(`GitHub GraphQL request failed with status ${response.status}`);
      }

      const payload = (await response.json()) as GraphQlResponse<T>;
      if (payload.errors?.length) {
        throw new Error(payload.errors.map((error) => error.message).join('; '));
      }
      if (!payload.data) {
        throw new Error('GitHub GraphQL response did not include data');
      }
      return payload.data;
    } catch (error) {
      const isLastAttempt = attempt >= maxAttempts;
      if (isLastAttempt || !(error instanceof Error)) {
        throw error;
      }

      const isRetryableFetchError =
        error.message.includes('fetch failed') ||
        error.message.includes('network') ||
        error.message.includes('ECONNRESET') ||
        error.message.includes('ETIMEDOUT') ||
        error.message.includes('TimeoutError') ||
        error.message.includes('aborted due to timeout');

      if (!isRetryableFetchError) {
        throw error;
      }

      await sleep(retryDelayMs);
      retryDelayMs *= 2;
    }
  }

  throw new Error('GitHub GraphQL request failed after retries');
};

export const fieldValuesToMap = (
  nodes: ReadonlyArray<Record<string, unknown>>
): Record<string, string> => {
  const map: Record<string, string> = {};
  for (const node of nodes) {
    const field = node.field as { name?: string } | undefined;
    const name = field?.name;
    if (!name) {
      continue;
    }
    if (typeof node.name === 'string') {
      map[name] = node.name;
    } else if (typeof node.text === 'string') {
      map[name] = node.text;
    }
  }
  return map;
};
