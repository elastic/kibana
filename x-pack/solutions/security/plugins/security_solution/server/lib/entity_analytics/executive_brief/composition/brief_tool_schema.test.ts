/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fromJSONSchema } from '@kbn/zod/v4/from_json_schema';
import {
  AREA_IDS,
  ATTENTION_LEVELS,
  OWNERS,
  URGENCIES,
} from '../../../../../common/entity_analytics/executive_brief/brief';
import { BRIEF_LIMITS } from '../../../../../common/entity_analytics/executive_brief/constants';
import { buildValidBrief } from '../verification/__fixtures__/evidence';
import { getSubmitBriefTool, SUBMIT_BRIEF_TOOL_NAME } from './brief_tool_schema';

type Node = Record<string, unknown>;

const at = (node: unknown, ...path: string[]): Node =>
  path.reduce<Node>((current, key) => current[key] as Node, node as Node);

describe('getSubmitBriefTool', () => {
  const { schema, description } = getSubmitBriefTool();

  it('is named submit_brief and has a description', () => {
    expect(SUBMIT_BRIEF_TOOL_NAME).toBe('submit_brief');
    expect(description.length).toBeGreaterThan(0);
  });

  it('derives the JSON schema from briefSchema', () => {
    expect(schema.type).toBe('object');
    expect(schema.required).toEqual(['verdict', 'areas', 'threats', 'actions']);
    expect(at(schema, 'properties', 'verdict', 'properties', 'level').enum).toEqual([
      ...ATTENTION_LEVELS,
    ]);
    const area = at(schema, 'properties', 'areas', 'items', 'properties');
    expect(at(area, 'id').enum).toEqual([...AREA_IDS]);
    const threats = at(schema, 'properties', 'threats');
    expect(threats.maxItems).toBe(BRIEF_LIMITS.maxThreats);
    const threat = at(threats, 'items', 'properties');
    expect(at(threat, 'entities').maxItems).toBe(BRIEF_LIMITS.maxEntitiesPerThreat);
    expect(at(threat, 'nextStep', 'properties', 'owner').enum).toEqual([...OWNERS]);
    const actions = at(schema, 'properties', 'actions');
    expect(actions.maxItems).toBe(BRIEF_LIMITS.maxActions);
    expect(at(actions, 'items', 'properties', 'urgency').enum).toEqual([...URGENCIES]);
    expect(at(actions, 'items').required).not.toContain('threat');
  });

  it('adds descriptions without changing the shape and drops meta keys', () => {
    expect(at(schema, 'properties', 'verdict', 'properties', 'evidence').description).toMatch(
      /F-n or L-n/
    );
    expect(
      at(schema, 'properties', 'threats', 'items', 'properties', 'entities').description
    ).toMatch(/connected/);
    expect(schema).not.toHaveProperty('$schema');
    expect(schema).not.toHaveProperty('~standard');
  });

  it('accepts a valid brief and rejects an invalid one when validated like the inference plugin', () => {
    const validator = fromJSONSchema(schema as unknown as Record<string, unknown>);
    if (!validator) {
      throw new Error('expected the tool schema to convert to a validator');
    }
    expect(validator.safeParse(buildValidBrief()).success).toBe(true);
    const invalid = {
      ...buildValidBrief(),
      verdict: { ...buildValidBrief().verdict, level: 'meh' },
    };
    expect(validator.safeParse(invalid).success).toBe(false);
  });

  it('is memoised', () => {
    expect(getSubmitBriefTool()).toBe(getSubmitBriefTool());
  });
});
