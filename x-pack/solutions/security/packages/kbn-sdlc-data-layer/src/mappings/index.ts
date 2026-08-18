/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License 2.0.
 */

import type { SdlcIndexName } from '../constants/indices';
import { SDLC_INDEX_NAMES } from '../constants/indices';
import { ENTITY_PROPERTIES, SYNC_META_PROPERTIES } from './common';

export interface IndexDefinition {
  readonly index: SdlcIndexName;
  readonly settings: Record<string, unknown>;
  readonly mappings: Record<string, unknown>;
}

const defaultSettings = {
  number_of_shards: 1,
  number_of_replicas: 0,
};

export const SDLC_INDEX_DEFINITIONS: Record<SdlcIndexName, IndexDefinition> = {
  [SDLC_INDEX_NAMES.GITHUB_SYNC_STATE]: {
    index: SDLC_INDEX_NAMES.GITHUB_SYNC_STATE,
    settings: defaultSettings,
    mappings: {
      properties: {
        ...SYNC_META_PROPERTIES,
        entity_type: { type: 'keyword' },
        org: {
          properties: {
            login: { type: 'keyword' },
          },
        },
        project: {
          properties: {
            number: { type: 'integer' },
          },
        },
        cursor: { type: 'keyword' },
        watermark: { type: 'date' },
        last_run_at: { type: 'date' },
        last_run_status: { type: 'keyword' },
        stats: { type: 'object', enabled: true },
      },
    },
  },
  [SDLC_INDEX_NAMES.GITHUB_INTEL_PROJECTS]: {
    index: SDLC_INDEX_NAMES.GITHUB_INTEL_PROJECTS,
    settings: defaultSettings,
    mappings: {
      properties: {
        ...SYNC_META_PROPERTIES,
        project: {
          properties: {
            id: { type: 'keyword' },
            number: { type: 'integer' },
            title: { type: 'text', fields: { keyword: { type: 'keyword' } } },
            url: { type: 'keyword' },
          },
        },
        fields: {
          type: 'nested',
          properties: {
            field_id: { type: 'keyword' },
            name: { type: 'keyword' },
            type: { type: 'keyword' },
            options: {
              type: 'nested',
              properties: {
                id: { type: 'keyword' },
                name: { type: 'keyword' },
              },
            },
          },
        },
      },
    },
  },
  [SDLC_INDEX_NAMES.GITHUB_INTEL_PROJECT_ITEMS]: {
    index: SDLC_INDEX_NAMES.GITHUB_INTEL_PROJECT_ITEMS,
    settings: defaultSettings,
    mappings: {
      properties: {
        ...SYNC_META_PROPERTIES,
        ...ENTITY_PROPERTIES,
        project: {
          properties: {
            id: { type: 'keyword' },
            number: { type: 'integer' },
            title: { type: 'keyword' },
            url: { type: 'keyword' },
          },
        },
        fields: {
          type: 'nested',
          properties: {
            field_id: { type: 'keyword' },
            name: { type: 'keyword' },
            type: { type: 'keyword' },
            value: { type: 'keyword' },
            text: { type: 'text' },
            option_id: { type: 'keyword' },
          },
        },
        hierarchy: {
          properties: {
            ticket_type: { type: 'keyword' },
            epic: { type: 'keyword' },
            parent_issue: { type: 'keyword' },
          },
        },
        roadmap: {
          properties: {
            id: { type: 'keyword' },
            product: { type: 'keyword' },
            stage: { type: 'keyword' },
            initiative: { type: 'keyword' },
            release_milestone: { type: 'keyword' },
          },
        },
        content_ref: {
          properties: {
            type: { type: 'keyword' },
            id: { type: 'keyword' },
            repo: { type: 'keyword' },
            number: { type: 'integer' },
            url: { type: 'keyword' },
          },
        },
        team_attribution: {
          properties: {
            engineering_team: { type: 'keyword' },
            org_teams: { type: 'keyword' },
            attribution_source: { type: 'keyword' },
          },
        },
        delivery: {
          properties: {
            coverage_status: { type: 'keyword' },
            coverage_pct: { type: 'integer' },
            issue_state: { type: 'keyword' },
            linked_prs: { type: 'keyword' },
            pr_summary: {
              properties: {
                total: { type: 'integer' },
                open: { type: 'integer' },
                merged: { type: 'integer' },
                closed_unmerged: { type: 'integer' },
              },
            },
          },
        },
        membership: {
          properties: {
            views: { type: 'integer' },
          },
        },
        pull_request: {
          properties: {
            merged: { type: 'boolean' },
            draft: { type: 'boolean' },
            title: { type: 'text' },
          },
        },
      },
    },
  },
  [SDLC_INDEX_NAMES.GITHUB_INTEL_PROJECT_VIEWS]: {
    index: SDLC_INDEX_NAMES.GITHUB_INTEL_PROJECT_VIEWS,
    settings: defaultSettings,
    mappings: {
      properties: {
        ...SYNC_META_PROPERTIES,
        project: {
          properties: {
            number: { type: 'integer' },
            id: { type: 'keyword' },
          },
        },
        view: {
          properties: {
            id: { type: 'keyword' },
            number: { type: 'integer' },
            name: { type: 'keyword' },
            filter: { type: 'text' },
          },
        },
      },
    },
  },
  [SDLC_INDEX_NAMES.GITHUB_INTEL_REPOS]: {
    index: SDLC_INDEX_NAMES.GITHUB_INTEL_REPOS,
    settings: defaultSettings,
    mappings: {
      properties: {
        ...SYNC_META_PROPERTIES,
        ...ENTITY_PROPERTIES,
        repo: {
          properties: {
            name: { type: 'keyword' },
            full_name: { type: 'keyword' },
            description: { type: 'text' },
            default_branch: { type: 'keyword' },
            is_private: { type: 'boolean' },
          },
        },
      },
    },
  },
  [SDLC_INDEX_NAMES.GITHUB_INTEL_ISSUES]: {
    index: SDLC_INDEX_NAMES.GITHUB_INTEL_ISSUES,
    settings: defaultSettings,
    mappings: {
      properties: {
        ...SYNC_META_PROPERTIES,
        ...ENTITY_PROPERTIES,
        content: {
          properties: {
            title: { type: 'text' },
            body: { type: 'text' },
            searchable: { type: 'text' },
          },
        },
        hierarchy: {
          properties: {
            epic: { type: 'keyword' },
            ticket_type: { type: 'keyword' },
            parent_issue_ref: { type: 'keyword' },
          },
        },
        team_attribution: {
          properties: {
            engineering_team: { type: 'keyword' },
            org_teams: { type: 'keyword' },
            attribution_source: { type: 'keyword' },
          },
        },
        delivery: {
          properties: {
            linked_prs: { type: 'keyword' },
            coverage_status: { type: 'keyword' },
          },
        },
        metrics: {
          properties: {
            comments_count: { type: 'integer' },
          },
        },
        flags: {
          properties: {
            ai_generated: { type: 'boolean' },
            eng_validated: { type: 'boolean' },
          },
        },
      },
    },
  },
  [SDLC_INDEX_NAMES.GITHUB_INTEL_PULL_REQUESTS]: {
    index: SDLC_INDEX_NAMES.GITHUB_INTEL_PULL_REQUESTS,
    settings: defaultSettings,
    mappings: {
      properties: {
        ...SYNC_META_PROPERTIES,
        ...ENTITY_PROPERTIES,
        hierarchy: {
          properties: {
            epic: { type: 'keyword' },
            ticket_type: { type: 'keyword' },
          },
        },
        pull_request: {
          properties: {
            merged: { type: 'boolean' },
            merged_at: { type: 'date' },
            draft: { type: 'boolean' },
            title: { type: 'text' },
            body: { type: 'text' },
          },
        },
        links: {
          properties: {
            linked_issues: { type: 'keyword' },
            closing_issues: { type: 'keyword' },
            project_items: { type: 'keyword' },
          },
        },
        change: {
          properties: {
            files_count: { type: 'integer' },
            additions: { type: 'integer' },
            deletions: { type: 'integer' },
            files: { type: 'keyword' },
          },
        },
      },
    },
  },
  [SDLC_INDEX_NAMES.GITHUB_INTEL_COMMENTS]: {
    index: SDLC_INDEX_NAMES.GITHUB_INTEL_COMMENTS,
    settings: defaultSettings,
    mappings: {
      properties: {
        ...SYNC_META_PROPERTIES,
        ...ENTITY_PROPERTIES,
        comment: {
          properties: {
            body: { type: 'text' },
            author: { type: 'keyword' },
            issue_ref: { type: 'keyword' },
          },
        },
      },
    },
  },
  [SDLC_INDEX_NAMES.GITHUB_INTEL_PEOPLE]: {
    index: SDLC_INDEX_NAMES.GITHUB_INTEL_PEOPLE,
    settings: defaultSettings,
    mappings: {
      properties: {
        ...SYNC_META_PROPERTIES,
        person: {
          properties: {
            login: { type: 'keyword' },
            name: { type: 'keyword' },
            id: { type: 'keyword' },
            url: { type: 'keyword' },
            org_teams: { type: 'keyword' },
            github_teams: { type: 'keyword' },
          },
        },
      },
    },
  },
  [SDLC_INDEX_NAMES.GITHUB_INTEL_TEAMS]: {
    index: SDLC_INDEX_NAMES.GITHUB_INTEL_TEAMS,
    settings: defaultSettings,
    mappings: {
      properties: {
        ...SYNC_META_PROPERTIES,
        team: {
          properties: {
            slug: { type: 'keyword' },
            name: { type: 'keyword' },
            org: { type: 'keyword' },
            members_count: { type: 'integer' },
            members: { type: 'keyword' },
            repositories: { type: 'keyword' },
          },
        },
      },
    },
  },
  [SDLC_INDEX_NAMES.GITHUB_INTEL_RELATIONSHIPS]: {
    index: SDLC_INDEX_NAMES.GITHUB_INTEL_RELATIONSHIPS,
    settings: defaultSettings,
    mappings: {
      properties: {
        ...SYNC_META_PROPERTIES,
        from: { type: 'keyword' },
        to: { type: 'keyword' },
        relation: { type: 'keyword' },
        weight: { type: 'float' },
        metadata: { type: 'object', enabled: true },
      },
    },
  },
  [SDLC_INDEX_NAMES.SDLC_TEAM_DIMENSION]: {
    index: SDLC_INDEX_NAMES.SDLC_TEAM_DIMENSION,
    settings: defaultSettings,
    mappings: {
      properties: {
        org_team: {
          properties: {
            key: { type: 'keyword' },
            name: { type: 'keyword' },
            members_count: { type: 'integer' },
          },
        },
        subteams: { type: 'keyword' },
        aliases: {
          properties: {
            project_team_values: { type: 'keyword' },
            github_labels: { type: 'keyword' },
            github_org_slugs: { type: 'keyword' },
          },
        },
      },
    },
  },
  [SDLC_INDEX_NAMES.SDLC_EPIC_PHASES]: {
    index: SDLC_INDEX_NAMES.SDLC_EPIC_PHASES,
    settings: defaultSettings,
    mappings: {
      properties: {
        ...SYNC_META_PROPERTIES,
        roadmap: {
          properties: {
            id: { type: 'keyword' },
            title: { type: 'text', fields: { keyword: { type: 'keyword' } } },
            product: { type: 'keyword' },
          },
        },
        epic: {
          properties: {
            key: { type: 'keyword' },
            display_id: { type: 'keyword' },
            title: { type: 'text', fields: { keyword: { type: 'keyword' } } },
            summary: { type: 'text' },
            owner: { type: 'keyword' },
            owner_initials: { type: 'keyword' },
            teams: { type: 'keyword' },
            url: { type: 'keyword' },
            project_item_id: { type: 'keyword' },
            issue_ref: {
              properties: {
                repo: { type: 'keyword' },
                number: { type: 'integer' },
                node_id: { type: 'keyword' },
              },
            },
          },
        },
        teams: {
          properties: {
            own_org_team: { type: 'keyword' },
            own_engineering_team: { type: 'keyword' },
            contributing_org_teams: { type: 'keyword' },
            contributing_engineering_teams: { type: 'keyword' },
            cross_team: { type: 'boolean' },
            team_count: { type: 'float' },
          },
        },
        release: {
          properties: {
            milestone: { type: 'keyword' },
            priority: { type: 'keyword' },
            roadmap_stage: { type: 'keyword' },
            initiative: { type: 'keyword' },
            serverless_iteration: { type: 'keyword' },
            deck_feature: { type: 'keyword' },
            deck_bucket: { type: 'keyword' },
          },
        },
        metadata: {
          properties: {
            seed: { type: 'keyword' },
            demo: { type: 'boolean' },
          },
        },
        links: {
          properties: {
            project_url: { type: 'keyword' },
            prd_url: { type: 'keyword' },
            arch_url: { type: 'keyword' },
          },
        },
        phases: {
          properties: {
            p1_prd: { type: 'object', enabled: true },
            p2_arch: { type: 'object', enabled: true },
            p3_ai_coverage: { type: 'object', enabled: true },
            p4_tickets: { type: 'object', enabled: true },
            p5_prs: { type: 'object', enabled: true },
            p6_defects: { type: 'object', enabled: true },
            p7_production: { type: 'object', enabled: true },
            p8_telemetry: { type: 'object', enabled: true },
          },
        },
        rollup: {
          properties: {
            coverage_pct: { type: 'integer' },
            delivery_coverage_pct: { type: 'integer' },
            gates_passed_pct: { type: 'integer' },
            gates_applicable: { type: 'integer' },
            gates_passed: { type: 'integer' },
            status: { type: 'keyword' },
          },
        },
        tickets_by_repo: {
          type: 'nested',
          properties: {
            repo: { type: 'keyword' },
            items: {
              type: 'nested',
              properties: {
                issue_ref: { type: 'keyword' },
                number: { type: 'integer' },
                title: { type: 'keyword' },
                status: { type: 'keyword' },
                pr_refs: { type: 'keyword' },
              },
            },
          },
        },
      },
    },
  },
  [SDLC_INDEX_NAMES.SDLC_RELEASE_CALENDAR]: {
    index: SDLC_INDEX_NAMES.SDLC_RELEASE_CALENDAR,
    settings: defaultSettings,
    mappings: {
      properties: {
        ...SYNC_META_PROPERTIES,
        release_line: { type: 'keyword' },
        product: { type: 'keyword' },
        version: { type: 'keyword' },
        milestone: { type: 'keyword' },
        target_date: { type: 'date' },
        status: { type: 'keyword' },
        release_manager: { type: 'keyword' },
        source: {
          properties: {
            type: { type: 'keyword' },
            spreadsheet_id: { type: 'keyword' },
            sheet_gid: { type: 'keyword' },
            sheet_name: { type: 'keyword' },
            slack_channel: { type: 'keyword' },
            message_ts: { type: 'keyword' },
            permalink: { type: 'keyword' },
            raw_text: { type: 'text' },
          },
        },
      },
    },
  },
};

export const getIndexDefinition = (indexName: SdlcIndexName): IndexDefinition =>
  SDLC_INDEX_DEFINITIONS[indexName];
