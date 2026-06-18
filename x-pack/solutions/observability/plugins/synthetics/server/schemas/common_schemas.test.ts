/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expectPrettyError } from '@kbn/zod-helpers/v4';
import { monitorOptionSchema, monitorFiltersSchema } from './common_schemas';

describe('Common Schemas', () => {
  describe('monitorOptionSchema', () => {
    it('validates a valid monitor option', () => {
      const input = {
        label: 'Production',
        value: 'prod',
      };

      const validated = monitorOptionSchema.parse(input);
      expect(validated).toEqual(input);
    });

    it('throws on missing label', () => {
      const input = {
        value: 'prod',
      };

      expectPrettyError(monitorOptionSchema.safeParse(input)).toMatchInlineSnapshot(`
        "✖ Invalid input: expected string, received undefined
          → at label"
      `);
    });

    it('throws on missing value', () => {
      const input = {
        label: 'Production',
      };

      expectPrettyError(monitorOptionSchema.safeParse(input)).toMatchInlineSnapshot(`
        "✖ Invalid input: expected string, received undefined
          → at value"
      `);
    });

    it('throws on invalid label type', () => {
      const input = {
        label: 123,
        value: 'prod',
      };

      expectPrettyError(monitorOptionSchema.safeParse(input)).toMatchInlineSnapshot(`
        "✖ Invalid input: expected string, received number
          → at label"
      `);
    });

    it('throws on invalid value type', () => {
      const input = {
        label: 'Production',
        value: 123,
      };

      expectPrettyError(monitorOptionSchema.safeParse(input)).toMatchInlineSnapshot(`
        "✖ Invalid input: expected string, received number
          → at value"
      `);
    });
  });

  describe('monitorFiltersSchema', () => {
    it('validates filters with all fields populated', () => {
      const input = {
        projects: [
          { label: 'Project 1', value: 'project-1' },
          { label: 'Project 2', value: 'project-2' },
        ],
        tags: [{ label: 'Tag 1', value: 'tag-1' }],
        monitor_ids: [{ label: 'Monitor A', value: 'monitor-a' }],
        monitor_types: [{ label: 'HTTP', value: 'http' }],
        locations: [{ label: 'US East', value: 'us-east-1' }],
      };

      const validated = monitorFiltersSchema.parse(input);
      expect(validated).toEqual(input);
    });

    it('validates filters with only projects', () => {
      const input = {
        projects: [{ label: 'Project 1', value: 'project-1' }],
      };

      const validated = monitorFiltersSchema.parse(input);
      expect(validated).toEqual(input);
    });

    it('validates filters with only tags', () => {
      const input = {
        tags: [{ label: 'Tag 1', value: 'tag-1' }],
      };

      const validated = monitorFiltersSchema.parse(input);
      expect(validated).toEqual(input);
    });

    it('validates filters with only monitor_ids', () => {
      const input = {
        monitor_ids: [{ label: 'Monitor A', value: 'monitor-a' }],
      };

      const validated = monitorFiltersSchema.parse(input);
      expect(validated).toEqual(input);
    });

    it('validates filters with only monitor_types', () => {
      const input = {
        monitor_types: [{ label: 'Browser', value: 'browser' }],
      };

      const validated = monitorFiltersSchema.parse(input);
      expect(validated).toEqual(input);
    });

    it('validates filters with only locations', () => {
      const input = {
        locations: [{ label: 'EU West', value: 'eu-west-1' }],
      };

      const validated = monitorFiltersSchema.parse(input);
      expect(validated).toEqual(input);
    });

    it('validates empty filters object', () => {
      const input = {};

      const validated = monitorFiltersSchema.parse(input);
      expect(validated).toEqual(input);
    });

    it('validates filters with multiple options in each array', () => {
      const input = {
        projects: [
          { label: 'Project 1', value: 'project-1' },
          { label: 'Project 2', value: 'project-2' },
          { label: 'Project 3', value: 'project-3' },
        ],
        tags: [
          { label: 'Tag 1', value: 'tag-1' },
          { label: 'Tag 2', value: 'tag-2' },
        ],
        monitor_ids: [{ label: 'Monitor A', value: 'monitor-a' }],
      };

      const validated = monitorFiltersSchema.parse(input);
      expect(validated).toEqual(input);
    });

    it('throws on invalid projects array item', () => {
      const input = {
        projects: [{ label: 'Project 1' }], // missing 'value'
      };

      expectPrettyError(monitorFiltersSchema.safeParse(input)).toMatchInlineSnapshot(`
        "✖ Invalid input: expected string, received undefined
          → at projects[0].value"
      `);
    });

    it('throws on invalid tags array item', () => {
      const input = {
        tags: [{ value: 'tag-1' }], // missing 'label'
      };

      expectPrettyError(monitorFiltersSchema.safeParse(input)).toMatchInlineSnapshot(`
        "✖ Invalid input: expected string, received undefined
          → at tags[0].label"
      `);
    });

    it('throws on invalid monitor_ids array item', () => {
      const input = {
        monitor_ids: [{ label: 123, value: 'monitor-a' }], // invalid label type
      };

      expectPrettyError(monitorFiltersSchema.safeParse(input)).toMatchInlineSnapshot(`
        "✖ Invalid input: expected string, received number
          → at monitor_ids[0].label"
      `);
    });

    it('throws on invalid monitor_types array item', () => {
      const input = {
        monitor_types: [{ label: 'HTTP', value: 123 }], // invalid value type
      };

      expectPrettyError(monitorFiltersSchema.safeParse(input)).toMatchInlineSnapshot(`
        "✖ Invalid input: expected string, received number
          → at monitor_types[0].value"
      `);
    });

    it('throws on invalid locations array item', () => {
      const input = {
        locations: ['invalid'], // should be array of objects, not strings
      };

      expectPrettyError(monitorFiltersSchema.safeParse(input)).toMatchInlineSnapshot(`
        "✖ Invalid input: expected object, received string
          → at locations[0]"
      `);
    });

    it('throws on non-array projects value', () => {
      const input = {
        projects: { label: 'Project 1', value: 'project-1' }, // should be array
      };

      expectPrettyError(monitorFiltersSchema.safeParse(input)).toMatchInlineSnapshot(`
        "✖ Invalid input: expected array, received object
          → at projects"
      `);
    });

    it('validates filters with empty arrays', () => {
      const input = {
        projects: [],
        tags: [],
        monitor_ids: [],
        monitor_types: [],
        locations: [],
      };

      const validated = monitorFiltersSchema.parse(input);
      expect(validated).toEqual(input);
    });

    it('validates partial filters with subset of fields', () => {
      const input = {
        projects: [{ label: 'Project 1', value: 'project-1' }],
        locations: [{ label: 'US East', value: 'us-east-1' }],
        // tags, monitor_ids, and monitor_types are intentionally omitted
      };

      const validated = monitorFiltersSchema.parse(input);
      expect(validated).toEqual(input);
    });
  });
});
