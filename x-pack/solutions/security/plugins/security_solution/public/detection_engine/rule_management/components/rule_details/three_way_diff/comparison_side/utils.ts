/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import stringify from 'json-stable-stringify';
import { Version } from './versions_picker/constants';
import {
  ThreeWayDiffOutcome,
  type ThreeWayDiff,
  ThreeWayDiffConflict,
} from '../../../../../../../common/api/detection_engine';
import { VersionsPickerOptionEnum } from './versions_picker/versions_picker';
import { assertUnreachable } from '../../../../../../../common/utility_types';
import * as i18n from './translations';

/**
 * Picks the field value for a given version either from a three-way diff object or from a user-set resolved value.
 *
 * @param version - The version for which the field value is to be picked.
 * @param fieldThreeWayDiff - The three-way diff object containing the field values for different versions.
 * @param resolvedValue - A value field will be upgraded to.
 * @returns - The field value for the specified version
 */
export function pickFieldValueForVersion(
  version: Version,
  fieldThreeWayDiff: ThreeWayDiff<unknown>,
  resolvedValue: unknown
): unknown {
  if (version === Version.Final) {
    return resolvedValue;
  }

  const versionFieldToPick = `${version}_version` as const;
  return fieldThreeWayDiff[versionFieldToPick];
}

/**
 * Stringifies a field value to an alphabetically sorted JSON string.
 */
export const stringifyToSortedJson = (fieldValue: unknown): string => {
  if (fieldValue === undefined) {
    return '';
  }

  if (typeof fieldValue === 'string') {
    return fieldValue;
  }

  return stringify(fieldValue, { space: 2 });
};

interface OptionDetails {
  title: string;
  description: string;
}

/**
 * Returns the title and description for a given versions picker option.
 */
export function getOptionDetails(option: VersionsPickerOptionEnum): OptionDetails {
  switch (option) {
    case VersionsPickerOptionEnum.MyChanges:
      return {
        title: i18n.MY_CHANGES_AND_FINAL_UPDATES_TITLE,
        description: i18n.MY_CHANGES_AND_FINAL_UPDATES_EXPLANATION,
      };
    case VersionsPickerOptionEnum.MyOriginalChanges:
      return {
        title: i18n.MY_ORIGINAL_CHANGES_TITLE,
        description: i18n.MY_ORIGINAL_CHANGES_EXPLANATION,
      };
    case VersionsPickerOptionEnum.UpdateFromElastic:
      return {
        title: i18n.UPDATE_FROM_ELASTIC_TITLE,
        description: i18n.UPDATE_FROM_ELASTIC_EXPLANATION,
      };
    case VersionsPickerOptionEnum.Merged:
      return {
        title: i18n.MERGED_CHANGES_TITLE,
        description: i18n.MERGED_CHANGES_EXPLANATION,
      };
    default:
      return assertUnreachable(option);
  }
}

/**
 * Returns the versions to be compared based on the selected versions picker option.
 */
export function getVersionsForComparison(
  selectedOption: VersionsPickerOptionEnum,
  hasBaseVersion: boolean
): [Version, Version] {
  switch (selectedOption) {
    case VersionsPickerOptionEnum.MyChanges:
      return hasBaseVersion ? [Version.Base, Version.Final] : [Version.Current, Version.Final];
    case VersionsPickerOptionEnum.MyOriginalChanges:
      return [Version.Base, Version.Current];
    case VersionsPickerOptionEnum.UpdateFromElastic:
      return hasBaseVersion ? [Version.Base, Version.Target] : [Version.Current, Version.Target];
    case VersionsPickerOptionEnum.Merged:
      return [Version.Base, Version.Final];
    default:
      return assertUnreachable(selectedOption);
  }
}

/**
 * Returns the versions picker options available for a given field diff outcome.
 */
export const getComparisonOptionsForDiffOutcome = (
  diffOutcome: ThreeWayDiffOutcome,
  conflict: ThreeWayDiffConflict,
  hasResolvedValueDifferentFromSuggested: boolean
): VersionsPickerOptionEnum[] => {
  switch (diffOutcome) {
    case ThreeWayDiffOutcome.StockValueCanUpdate: {
      const options = [];

      if (hasResolvedValueDifferentFromSuggested) {
        options.push(VersionsPickerOptionEnum.MyChanges);
      }
      options.push(VersionsPickerOptionEnum.UpdateFromElastic);

      return options;
    }
    case ThreeWayDiffOutcome.CustomizedValueNoUpdate:
      return [VersionsPickerOptionEnum.MyChanges];
    case ThreeWayDiffOutcome.CustomizedValueSameUpdate:
      return [VersionsPickerOptionEnum.MyChanges, VersionsPickerOptionEnum.UpdateFromElastic];
    case ThreeWayDiffOutcome.CustomizedValueCanUpdate: {
      if (conflict === ThreeWayDiffConflict.SOLVABLE) {
        return [
          hasResolvedValueDifferentFromSuggested
            ? VersionsPickerOptionEnum.MyChanges
            : VersionsPickerOptionEnum.Merged,
          VersionsPickerOptionEnum.UpdateFromElastic,
          VersionsPickerOptionEnum.MyOriginalChanges,
        ];
      }

      if (conflict === ThreeWayDiffConflict.NON_SOLVABLE) {
        const options = [
          VersionsPickerOptionEnum.MyChanges,
          VersionsPickerOptionEnum.UpdateFromElastic,
        ];

        if (hasResolvedValueDifferentFromSuggested) {
          options.push(VersionsPickerOptionEnum.MyOriginalChanges);
        }

        return options;
      }
    }
    case ThreeWayDiffOutcome.MissingBaseCanUpdate: {
      const options = [];

      if (hasResolvedValueDifferentFromSuggested) {
        options.push(VersionsPickerOptionEnum.MyChanges);
      }
      options.push(VersionsPickerOptionEnum.UpdateFromElastic);

      return options;
    }
    default:
      return [];
  }
};
