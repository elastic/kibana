/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isMlJobCoverageLossUpgrade } from './is_ml_job_coverage_loss_upgrade';

// `v2_windows_rare_metadata_user` and `v3_windows_rare_metadata_user` are in the
// `affectedJobIds` allowlist; the `_ea` variant and `high_count_network_denies` are not.
const AFFECTED_JOB_ID = 'v2_windows_rare_metadata_user';
const ANOTHER_AFFECTED_JOB_ID = 'v3_windows_rare_metadata_user';
const REPLACEMENT_JOB_ID = 'v3_windows_rare_metadata_user_ea';
const UNAFFECTED_JOB_ID = 'high_count_network_denies';

describe('isMlJobCoverageLossUpgrade', () => {
  it('returns true when an affected job in the current version is dropped by the target', () => {
    expect(isMlJobCoverageLossUpgrade(AFFECTED_JOB_ID, REPLACEMENT_JOB_ID)).toBe(true);
  });

  it('returns false when the target version still references the affected job', () => {
    expect(
      isMlJobCoverageLossUpgrade([AFFECTED_JOB_ID], [AFFECTED_JOB_ID, REPLACEMENT_JOB_ID])
    ).toBe(false);
  });

  it('returns false when the current version references no affected job', () => {
    expect(isMlJobCoverageLossUpgrade(UNAFFECTED_JOB_ID, REPLACEMENT_JOB_ID)).toBe(false);
  });

  it('returns false when the value is unchanged even if it references an affected job', () => {
    expect(isMlJobCoverageLossUpgrade(AFFECTED_JOB_ID, AFFECTED_JOB_ID)).toBe(false);
  });

  it('handles array shapes: true when an affected job is dropped from a multi-job list', () => {
    expect(
      isMlJobCoverageLossUpgrade(
        [AFFECTED_JOB_ID, UNAFFECTED_JOB_ID],
        [UNAFFECTED_JOB_ID, REPLACEMENT_JOB_ID]
      )
    ).toBe(true);
  });

  it('handles array shapes: false when all affected jobs are retained', () => {
    expect(
      isMlJobCoverageLossUpgrade(
        [AFFECTED_JOB_ID, ANOTHER_AFFECTED_JOB_ID],
        [AFFECTED_JOB_ID, ANOTHER_AFFECTED_JOB_ID, REPLACEMENT_JOB_ID]
      )
    ).toBe(false);
  });

  it('handles mixed string/array shapes', () => {
    expect(isMlJobCoverageLossUpgrade(AFFECTED_JOB_ID, [REPLACEMENT_JOB_ID])).toBe(true);
    expect(isMlJobCoverageLossUpgrade([AFFECTED_JOB_ID], REPLACEMENT_JOB_ID)).toBe(true);
  });
});
