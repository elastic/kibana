/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  buildActorSliceBoundaryQuery,
  parseActorSliceBoundaryResult,
} from './build_actor_slice_boundary_query';
import type { RelationshipIntegrationConfig } from './types';

const systemAuthConfig: RelationshipIntegrationConfig = {
  source: 'logs',
  kind: 'standard',
  id: 'system_auth',
  name: 'System Auth',
  indexPattern: (ns) => `logs-system.auth-${ns}`,
  relationshipKey: 'communicates_with',
  targetEntityType: 'host',
  customActor: { fields: ['user.email', 'user.name'] },
  esqlWhereClause: 'event.action == "ssh_login" AND event.outcome == "success"',
};

describe('buildActorSliceBoundaryQuery', () => {
  it('builds boundary extension query for standard config', () => {
    const query = buildActorSliceBoundaryQuery(
      systemAuthConfig,
      'default',
      '2026-06-26T00:00:00.000Z',
      '2026-06-27T00:00:00.000Z'
    );
    expect(query).toMatchInlineSnapshot(`
      "SET unmapped_fields=\\"nullify\\";
      FROM logs-system.auth-default
      | WHERE @timestamp >= \\"2026-06-26T00:00:00.000Z\\" AND @timestamp < NOW()
          AND event.action == \\"ssh_login\\" AND event.outcome == \\"success\\"
          AND ((\`user.email\` IS NOT NULL AND \`user.email\` != \\"\\") OR (\`user.name\` IS NOT NULL AND \`user.name\` != \\"\\"))
      | EVAL _src_entity_source0 = MV_FIRST(TO_STRING(event.module)),
       _src_entity_source1 = MV_FIRST(TO_STRING(event.dataset)),
       _src_entity_source2 = MV_FIRST(TO_STRING(data_stream.dataset)),
       _src_entity_source = COALESCE(CASE(_src_entity_source0 IS NOT NULL AND _src_entity_source0 != \\"\\", _src_entity_source0), CASE(_src_entity_source1 IS NOT NULL AND _src_entity_source1 != \\"\\", _src_entity_source1), CASE(_src_entity_source2 IS NOT NULL AND _src_entity_source2 != \\"\\", _src_entity_source2)),
       entity.source = CASE(_src_entity_source IS NULL OR _src_entity_source == \\"\\", NULL, _src_entity_source)
      | EVAL _src_entity_namespace0 = MV_FIRST(TO_STRING(event.module)),
       _src_entity_namespace1 = MV_FIRST(SPLIT(MV_FIRST(TO_STRING(data_stream.dataset)), \\".\\")),
       _src_entity_namespace = COALESCE(CASE(_src_entity_namespace0 IS NOT NULL AND _src_entity_namespace0 != \\"\\", _src_entity_namespace0), CASE(_src_entity_namespace1 IS NOT NULL AND _src_entity_namespace1 != \\"\\", _src_entity_namespace1)),
       _eval_entity_namespace_arm0 = (TO_STRING(user.name) IS NOT NULL AND TO_STRING(user.name) != \\"\\" AND TO_STRING(host.id) IS NOT NULL AND TO_STRING(host.id) != \\"\\" AND NOT (TO_STRING(user.name) IN (\\"root\\", \\"bin\\", \\"daemon\\", \\"sys\\", \\"nobody\\", \\"jenkins\\", \\"ansible\\", \\"deploy\\", \\"terraform\\", \\"gitlab-runner\\", \\"postgres\\", \\"mysql\\", \\"redis\\", \\"elasticsearch\\", \\"kafka\\", \\"admin\\", \\"operator\\", \\"service\\")) AND (MV_CONTAINS(TO_STRING(event.kind), \\"asset\\") OR NOT (MV_CONTAINS(TO_STRING(event.kind), \\"asset\\") OR (TO_STRING(event.kind) != \\"enrichment\\" OR TO_STRING(event.kind) IS NULL) AND MV_CONTAINS(TO_STRING(event.category), \\"iam\\") AND (MV_CONTAINS(TO_STRING(event.type), \\"user\\") OR MV_CONTAINS(TO_STRING(event.type), \\"creation\\") OR MV_CONTAINS(TO_STRING(event.type), \\"deletion\\") OR MV_CONTAINS(TO_STRING(event.type), \\"group\\"))))),
       _eval_entity_namespace_arm1 = (MV_CONTAINS(TO_STRING(event.kind), \\"asset\\") AND MV_CONTAINS(TO_STRING(event.module), \\"asset_discovery\\")),
       entity.namespace = COALESCE(CASE(COALESCE(_eval_entity_namespace_arm0, FALSE), \\"local\\"), CASE(COALESCE(_eval_entity_namespace_arm1, FALSE), CASE(MV_FIRST(TO_STRING(cloud.provider)) == \\"aws\\", \\"aws\\", MV_FIRST(TO_STRING(cloud.provider)) == \\"gcp\\", \\"gcp\\", MV_FIRST(TO_STRING(cloud.provider)) == \\"azure\\", \\"entra_id\\")), CASE(COALESCE(_src_entity_namespace IN (\\"okta\\", \\"entityanalytics_okta\\"), FALSE), \\"okta\\"), CASE(COALESCE(_src_entity_namespace IN (\\"azure\\", \\"entityanalytics_entra_id\\"), FALSE), \\"entra_id\\"), CASE(COALESCE(_src_entity_namespace IN (\\"o365\\", \\"o365_metrics\\"), FALSE), \\"microsoft_365\\"), CASE(COALESCE(_src_entity_namespace IN (\\"entityanalytics_ad\\"), FALSE), \\"active_directory\\"), CASE(_src_entity_namespace IS NULL OR _src_entity_namespace == \\"\\", \\"unknown\\"), _src_entity_namespace),
       user_name_present = TO_STRING(user.name) IS NOT NULL AND TO_STRING(user.name) != \\"\\",
       host_id_present = TO_STRING(host.id) IS NOT NULL AND TO_STRING(host.id) != \\"\\",
       entity_namespace_present = TO_STRING(entity.namespace) IS NOT NULL AND TO_STRING(entity.namespace) != \\"\\",
       user_email_present = TO_STRING(user.email) IS NOT NULL AND TO_STRING(user.email) != \\"\\",
       user_id_present = TO_STRING(user.id) IS NOT NULL AND TO_STRING(user.id) != \\"\\",
       user_domain_present = TO_STRING(user.domain) IS NOT NULL AND TO_STRING(user.domain) != \\"\\",
       user_name_present_or_null = CASE(user_name_present, TO_STRING(user.name)),
       host_id_present_or_null = CASE(host_id_present, TO_STRING(host.id)),
       entity_namespace_present_or_null = CASE(entity_namespace_present, TO_STRING(entity.namespace)),
       user_email_present_or_null = CASE(user_email_present, TO_STRING(user.email)),
       user_id_present_or_null = CASE(user_id_present, TO_STRING(user.id)),
       user_domain_present_or_null = CASE(user_domain_present, TO_STRING(user.domain)),
       _euid_branch_0_formula = CONCAT(user_name_present_or_null, \\"@\\", host_id_present_or_null, \\"@\\", entity_namespace_present_or_null),
       _euid_branch_0_cond = (TO_STRING(entity.namespace) == \\"local\\"),
       _euid_branch_1_formula = COALESCE(CONCAT(user_email_present_or_null, \\"@\\", entity_namespace_present_or_null), CONCAT(user_id_present_or_null, \\"@\\", entity_namespace_present_or_null), CONCAT(user_name_present_or_null, \\"@\\", user_domain_present_or_null, \\"@\\", entity_namespace_present_or_null), CONCAT(user_name_present_or_null, \\"@\\", entity_namespace_present_or_null)),
       actorUserId = CONCAT(\\"user:\\", CASE(_euid_branch_0_cond, _euid_branch_0_formula,
      TRUE, _euid_branch_1_formula, NULL))
      | WHERE COALESCE(actorUserId, \\"\\") != \\"\\"
      | STATS _firstEvent = MIN(@timestamp), _lastEvent = MAX(@timestamp) BY actorUserId
      | WHERE _firstEvent <= \\"2026-06-27T00:00:00.000Z\\"
      | STATS extendedSliceEnd = MAX(_lastEvent)"
    `);
  });
});

describe('parseActorSliceBoundaryResult', () => {
  it('returns null when no rows returned', () => {
    const result = parseActorSliceBoundaryResult([{ name: 'extendedSliceEnd', type: 'date' }], []);
    expect(result).toBeNull();
  });

  it('returns the extendedSliceEnd timestamp from the first row', () => {
    const result = parseActorSliceBoundaryResult(
      [{ name: 'extendedSliceEnd', type: 'date' }],
      [['2026-06-27T23:59:59.999Z']]
    );
    expect(result).toBe('2026-06-27T23:59:59.999Z');
  });

  it('returns null when extendedSliceEnd value is null', () => {
    const result = parseActorSliceBoundaryResult(
      [{ name: 'extendedSliceEnd', type: 'date' }],
      [[null]]
    );
    expect(result).toBeNull();
  });
});
