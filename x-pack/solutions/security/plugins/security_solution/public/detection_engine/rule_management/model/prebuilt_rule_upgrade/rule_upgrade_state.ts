/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  type ThreeWayDiffConflict,
  type RuleUpgradeInfoForReview,
} from '../../../../../common/api/detection_engine';
import type { FieldsUpgradeState } from './fields_upgrade_state';

export interface RuleUpgradeState extends RuleUpgradeInfoForReview {
  /**
   * Original rule conflict state calculated from fields diff.
   */
  conflict: ThreeWayDiffConflict;
  /**
   * Stores a record of customizable field names mapped to field upgrade state.
   */
  fieldsUpgradeState: FieldsUpgradeState;
  /**
   * Indicates whether there are conflicts blocking rule upgrading.
   */
  hasUnresolvedConflicts: boolean;
  /**
   * Indicates whether there are non-solvable conflicts blocking rule upgrading.
   */
  hasNonSolvableUnresolvedConflicts: boolean;
}
