/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GraphRoleAliasContext } from '@kbn/entity-store/server';
import {
  buildGraphAliasPrelude,
  KI_PROVENANCE_CONFIDENCE_FIELD,
  KI_PROVENANCE_FEATURE_UUID_FIELD,
} from './build_graph_alias_prelude';

const AZURE_STREAM = 'logs-azure.signinlogs-default';
const OKTA_STREAM = 'logs-okta.system-default';

const ctx = (overrides: Partial<GraphRoleAliasContext> = {}): GraphRoleAliasContext => ({
  streamName: AZURE_STREAM,
  indexPatterns: [AZURE_STREAM],
  aliases: new Map<string, readonly string[]>([
    ['user.email', ['azure.signinlogs.properties.user_principal_name']],
    ['service.target.name', ['azure.signinlogs.properties.resource_display_name']],
    ['event.action', ['azure.signinlogs.operation_name']],
  ]) as GraphRoleAliasContext['aliases'],
  featureUuid: 'azure-feature-1',
  confidence: 88,
  ...overrides,
});

describe('buildGraphAliasPrelude', () => {
  describe('off-by-default / no-op safety', () => {
    it('returns an empty prelude for undefined contexts', () => {
      const prelude = buildGraphAliasPrelude(undefined);
      expect(prelude.hasAliases).toBe(false);
      expect(prelude.esql).toBe('');
      expect(prelude.targetSourceFields).toEqual([]);
      expect(prelude.provenanceColumns).toEqual([]);
    });

    it('returns an empty prelude for an empty contexts array', () => {
      expect(buildGraphAliasPrelude([]).esql).toBe('');
    });

    it('drops a context whose stream/index cannot be resolved', () => {
      const prelude = buildGraphAliasPrelude([ctx({ indexPatterns: [] })]);
      expect(prelude.hasAliases).toBe(false);
    });

    it('drops a context with a malformed feature UUID before it reaches a literal', () => {
      const prelude = buildGraphAliasPrelude([ctx({ featureUuid: 'bad uuid "; DROP' })]);
      expect(prelude.hasAliases).toBe(false);
    });
  });

  describe('slot fills', () => {
    it('fills only null ECS slots (native ECS values win via leading COALESCE arg)', () => {
      const { esql } = buildGraphAliasPrelude([ctx()]);
      expect(esql).toContain('| EVAL `user.email` = COALESCE(`user.email`, CASE(');
      expect(esql).toContain('| EVAL `event.action` = COALESCE(`event.action`, CASE(');
      expect(esql).toContain(
        '| EVAL `service.target.name` = COALESCE(`service.target.name`, CASE('
      );
    });

    it('guards every slot fill with the stream _index/dataset guard', () => {
      const { esql } = buildGraphAliasPrelude([ctx()]);
      expect(esql).toContain(
        `CASE((_index LIKE "*${AZURE_STREAM}*" OR \`data_stream.dataset\` == "${AZURE_STREAM}"), COALESCE(MV_FIRST(\`azure.signinlogs.properties.user_principal_name\`)), null)`
      );
    });

    it('reads each source via MV_FIRST so multi-value fields collapse to a single value', () => {
      const { esql } = buildGraphAliasPrelude([ctx()]);
      expect(esql).toContain('MV_FIRST(`azure.signinlogs.properties.user_principal_name`)');
    });
  });

  describe('provenance', () => {
    it('writes feature_uuid and confidence provenance columns keyed off the fired flag', () => {
      const { esql, provenanceColumns } = buildGraphAliasPrelude([ctx()]);
      expect(esql).toContain(`| EVAL \`${KI_PROVENANCE_FEATURE_UUID_FIELD}\` = CASE(`);
      expect(esql).toContain('"azure-feature-1"');
      expect(esql).toContain(`| EVAL \`${KI_PROVENANCE_CONFIDENCE_FIELD}\` = CASE(`);
      expect(esql).toContain('88');
      expect(provenanceColumns).toEqual([
        KI_PROVENANCE_FEATURE_UUID_FIELD,
        KI_PROVENANCE_CONFIDENCE_FIELD,
      ]);
    });

    it('marks a context fired only when an ECS slot was null but a source supplied a value', () => {
      const { esql } = buildGraphAliasPrelude([ctx()]);
      expect(esql).toMatch(
        /\| EVAL _ki_fired_0 = \(.*\) AND \(\(`user\.email` IS NULL AND COALESCE\(MV_FIRST\(`azure\.signinlogs\.properties\.user_principal_name`\)\) IS NOT NULL\)/
      );
    });
  });

  describe('target source fields (DSL exists pre-filter)', () => {
    it('exposes target-role sources but not actor-role sources', () => {
      const { targetSourceFields } = buildGraphAliasPrelude([ctx()]);
      expect(targetSourceFields).toContain('azure.signinlogs.properties.resource_display_name');
      expect(targetSourceFields).not.toContain('azure.signinlogs.properties.user_principal_name');
      expect(targetSourceFields).not.toContain('azure.signinlogs.operation_name');
    });
  });

  describe('no cross-stream leakage', () => {
    it('guards each stream alias arm with its own stream guard', () => {
      const okta = ctx({
        streamName: OKTA_STREAM,
        indexPatterns: [OKTA_STREAM],
        aliases: new Map<string, readonly string[]>([
          ['user.email', ['okta.actor.alternate_id']],
        ]) as GraphRoleAliasContext['aliases'],
        featureUuid: 'okta-feature-2',
        confidence: 75,
      });

      const { esql } = buildGraphAliasPrelude([ctx(), okta]);

      // Azure source is only ever wrapped by the Azure guard…
      expect(esql).toContain(
        `CASE((_index LIKE "*${AZURE_STREAM}*" OR \`data_stream.dataset\` == "${AZURE_STREAM}"), COALESCE(MV_FIRST(\`azure.signinlogs.properties.user_principal_name\`)), null)`
      );
      // …and Okta source only by the Okta guard.
      expect(esql).toContain(
        `CASE((_index LIKE "*${OKTA_STREAM}*" OR \`data_stream.dataset\` == "${OKTA_STREAM}"), COALESCE(MV_FIRST(\`okta.actor.alternate_id\`)), null)`
      );
      // The Okta source never appears inside an Azure-guarded arm.
      expect(esql).not.toMatch(new RegExp(`${AZURE_STREAM}[^)]*okta\\.actor\\.alternate_id`));
    });
  });

  describe('vocabulary + injection guards', () => {
    it('drops destinations outside the closed graph vocabulary', () => {
      const withBadDest = ctx({
        aliases: new Map<string, readonly string[]>([
          ['user.email', ['azure.signinlogs.properties.user_principal_name']],
          ['user.roles', ['azure.signinlogs.properties.app_roles']],
        ]) as GraphRoleAliasContext['aliases'],
      });
      const { esql } = buildGraphAliasPrelude([withBadDest]);
      expect(esql).toContain('`user.email`');
      expect(esql).not.toContain('user.roles');
      expect(esql).not.toContain('app_roles');
    });

    it('drops source paths that fail the field-path guard but keeps valid siblings', () => {
      const withBadSource = ctx({
        aliases: new Map<string, readonly string[]>([
          ['user.email', ['azure.signinlogs.properties.user_principal_name', 'bad path"; DROP']],
        ]) as GraphRoleAliasContext['aliases'],
      });
      const { esql } = buildGraphAliasPrelude([withBadSource]);
      expect(esql).toContain('MV_FIRST(`azure.signinlogs.properties.user_principal_name`)');
      expect(esql).not.toContain('DROP');
      expect(esql).not.toContain('bad path');
    });

    it('drops index patterns that fail the index-pattern guard', () => {
      const prelude = buildGraphAliasPrelude([
        ctx({ indexPatterns: ['BAD PATTERN'], streamName: 'BAD PATTERN' }),
      ]);
      expect(prelude.hasAliases).toBe(false);
    });
  });
});
