/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { findSecurityMlJobsSkill } from './find_security_ml_jobs_skill';
import type { FindSecurityMlJobsSkillsContext } from './find_security_ml_jobs_skill';
import { SECURITY_GET_ENTITY_TOOL_ID } from '../../tools';

const buildSkill = (isEntityStoreV2Enabled: boolean) =>
  findSecurityMlJobsSkill({ isEntityStoreV2Enabled } as FindSecurityMlJobsSkillsContext);

describe('findSecurityMlJobsSkill', () => {
  describe('skill definition', () => {
    it('has correct id and name', () => {
      const skill = buildSkill(false);
      expect(skill.id).toBe('find-security-ml-jobs');
      expect(skill.name).toBe('find-security-ml-jobs');
    });

    it('returns the expected registry tool IDs', () => {
      expect(buildSkill(false).getRegistryTools?.()).toEqual([
        'platform.core.execute_esql',
        'platform.core.generate_esql',
      ]);
      expect(buildSkill(true).getRegistryTools?.()).toEqual([
        'platform.core.execute_esql',
        'platform.core.generate_esql',
        SECURITY_GET_ENTITY_TOOL_ID,
      ]);
    });
  });

  describe.each([false, true])('tool discipline guards (isEntityStoreV2Enabled=%s)', (flag) => {
    const content = buildSkill(flag).content;

    it('reuses job and anomaly results already in the conversation', () => {
      expect(content).toContain('Reuse results already in the conversation');
      expect(content).toContain('never call the same tool again with the same inputs');
    });

    it('forbids speculative generate_esql / execute_esql calls', () => {
      expect(content).toContain('No speculative ES|QL calls');
      expect(content).toContain('never call them at all when activeJobIds is empty');
      expect(content).toContain(
        'Do not generate or execute ES|QL against any index other than .ml-anomalies-*'
      );
      // Pins the sequencing precondition: generation/execution must wait for
      // find.security.ml.jobs to return (machine review r4019242533).
      expect(content).toContain(
        "Never call 'platform.core.generate_esql' or 'platform.core.execute_esql' before 'find.security.ml.jobs' has returned"
      );
    });

    it('bounds the ES|QL query loop to one pass', () => {
      expect(content).toContain('One query pass, bounded');
      expect(content).toContain("At most two 'platform.core.execute_esql' calls per user question");
      expect(content).toContain('do not rephrase the query and retry');
    });

    it('forbids post-run tool calls after the summary', () => {
      expect(content).toContain('No post-run calls');
      expect(content).toContain('unless the user asks a follow-up question');
    });
  });
});
