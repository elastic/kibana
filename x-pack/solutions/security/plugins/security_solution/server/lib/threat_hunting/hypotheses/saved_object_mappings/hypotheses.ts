/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SECURITY_SOLUTION_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import type { SavedObjectsType } from '@kbn/core/server';

export const hypothesisSavedObjectType = 'security-threat-hunting-hypothesis';

export const hypothesisSavedObjectMappings: SavedObjectsType['mappings'] = {
  dynamic: false,
  properties: {
    // the bold text at the top of the card
    title: {
      type: 'text',
    },
    // the text below the title
    summary: {
      type: 'text',
    },
    // if the hypothesis is mutable or not
    managed: {
      type: 'boolean',
    },
    // where the hypothesis came from currently either pre_built or ai_generated
    source_type: {
      type: 'keyword',
    },
    // for reconciliation, see https://github.com/elastic/security-team/issues/14404
    version: {
      type: 'keyword',
    },
    // A selection of the ECS threat fields used by rules
    threat: {
      properties: {
        framework: {
          type: 'keyword',
        },
        tactic: {
          properties: {
            id: {
              type: 'keyword',
            },
            name: {
              type: 'keyword',
            },
            reference: {
              type: 'keyword',
            },
          },
        },
        technique: {
          properties: {
            id: {
              type: 'keyword',
            },
            name: {
              type: 'keyword',
            },
            reference: {
              type: 'keyword',
            },
            // subtechniques might be too granular for hypotheses, but included for completeness
            subtechnique: {
              properties: {
                id: {
                  type: 'keyword',
                },
                name: {
                  type: 'keyword',
                },
                reference: {
                  type: 'keyword',
                },
              },
            },
          },
        },
      },
    },
    // tags associated with the hypothesis
    // we could consider having a text mapping here for more advanced searching
    tags: {
      type: 'keyword',
    },
    // data sources required to test this hypothesis
    // e.g., ["windows", "linux", "cloud", "risk_score", "entity_analytics"]
    required_data_sources: {
      type: 'keyword',
    },
    // the LLM model that generated the hypothesis
    // we may want to expand this in future to include model version, provider, etc.
    model: {
      properties: {
        name: {
          type: 'keyword',
        },
      },
    },
    // optional prompt to help generate queries for testing this hypothesis
    // this prompt can be used by LLMs to generate ES|QL, KQL, or other query languages
    // to investigate the hypothesis
    query_generation_prompt: {
      type: 'text',
    },
    // combined searchable text field for matching user prompts to hypotheses
    // this field should contain title + summary + tags combined for semantic/keyword search
    // populated automatically when hypothesis is created/updated
    searchable_text: {
      type: 'text',
    },
  },
};

export const hypothesisType: SavedObjectsType = {
  name: hypothesisSavedObjectType,
  indexPattern: SECURITY_SOLUTION_SAVED_OBJECT_INDEX,
  hidden: false,
  namespaceType: 'agnostic',
  mappings: hypothesisSavedObjectMappings,
};
