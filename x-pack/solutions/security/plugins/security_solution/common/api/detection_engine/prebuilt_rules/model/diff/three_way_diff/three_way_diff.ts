/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ThreeWayDiffOutcome } from './three_way_diff_outcome';
import type { ThreeWayDiffConflict } from './three_way_diff_conflict';
import type { ThreeWayMergeOutcome } from './three_way_merge_outcome';

/**
 * A symbol that represents a missing value and used when a base version of a
 * rule is not available. We need a mechanism that helps us distinguish two
 * situations:
 * - the base version is found, and its value is `undefined` or `null`
 * - the base version is not found
 *
 */
export const MissingVersion = Symbol('MissingVersion');
export type MissingVersion = typeof MissingVersion;

/**
 * Three versions of a value to pass to a diff algorithm.
 */
export interface ThreeVersionsOf<TValue> {
  /**
   * Corresponds to the stock version of the currently installed prebuilt rule.
   * This field is optional because the base version is not always available in the package.
   */
  base_version: TValue | MissingVersion;

  /**
   * Corresponds exactly to the currently installed prebuilt rule:
   *   - to the customized version (if it's customized)
   *   - to the stock version (if it's not customized)
   */
  current_version: TValue;

  /**
   * Corresponds to the "new" stock version that the user is trying to upgrade to.
   */
  target_version: TValue;
}

/**
 * Represents a result of an abstract three-way diff/merge operation on a value
 * (could be a whole rule JSON or a given rule field).
 *
 * Typical situations:
 *
 * 1. base=A, current=A, target=A => merged=A, conflict=false
 *    Stock rule, the value hasn't changed.
 *
 * 2. base=A, current=A, target=B => merged=B, conflict=false
 *    Stock rule, the value has changed.
 *
 * 3. base=A, current=B, target=A => merged=B, conflict=false
 *    Customized rule, the value hasn't changed.
 *
 * 4. base=A, current=B, target=B => merged=B, conflict=false
 *    Customized rule, the value has changed exactly the same way as in the user customization.
 *
 * 5. base=A, current=B, target=C => merged=D, conflict=false
 *    Customized rule, the value has changed, conflict between B and C resolved automatically.
 *
 * 6. base=A, current=B, target=C => merged=C, conflict=true
 *    Customized rule, the value has changed, conflict between B and C couldn't be resolved automatically.
 */
export interface ThreeWayDiff<TValue> {
  /**
   * Corresponds to the stock version of the currently installed prebuilt rule.
   * This field is optional because the base version is not always available in the package.
   * This type is part of the API response, so the type of this field is replaced from possibly
   * a MissingVersion (a JS Symbol), which can't be serialized in JSON, to possibly `undefined`.
   */
  base_version: TValue | undefined;

  /**
   * Corresponds exactly to the currently installed prebuilt rule:
   *   - to the customized version (if it's customized)
   *   - to the stock version (if it's not customized)
   */
  current_version: TValue;

  /**
   * Corresponds to the "new" stock version that the user is trying to upgrade to.
   */
  target_version: TValue;

  /**
   * The result of an automatic three-way merge of three values:
   *   - base version
   *   - current version
   *   - target version
   *
   * Exact merge algorithm depends on the value:
   *   - one algo could be used for single-line strings and keywords (e.g. rule name)
   *   - another one could be used for multiline text (e.g. rule description)
   *   - another one could be used for arrays of keywords (e.g. rule tags)
   *   - another one could be used for the MITRE ATT&CK data structure
   *   - etc
   *
   * Merged version always has a value. We do our best to resolve conflicts automatically.
   * If they can't be resolved automatically, merged version is equal to target version.
   */
  merged_version: TValue;

  /**
   * Tells which combination corresponds to the three input versions of the value for this specific diff.
   */
  diff_outcome: ThreeWayDiffOutcome;

  /**
   * The type of result of an automatic three-way merge of three values:
   *   - current version
   *   - target version
   *   - merged version
   */
  merge_outcome: ThreeWayMergeOutcome;

  /**
   * Boolean which determines if a base version was found and returned for the three-way-diff of the field
   * - true: the base version of the field was found and is either defined or undefined
   * - false: the base version of the field was not found
   */
  has_base_version: boolean;

  /**
   * Tells if the value has changed in the target version and the current version could be updated.
   * True if:
   *   - base=A, current=A, target=B
   *   - base=A, current=B, target=C
   *   - base=<missing>, current=A, target=B
   */
  has_update: boolean;

  /**
   * Enum of possible conflict outcomes of a three-way diff.
   */
  conflict: ThreeWayDiffConflict;
}

/**
 * Given the three versions of a value, calculates a three-way diff for it.
 */
export type ThreeWayDiffAlgorithm<TValue> = (
  versions: ThreeVersionsOf<TValue>
) => ThreeWayDiff<TValue>;
