/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { PropertySelectionHandler, SelectionOption } from '@kbn/workflows/types/latest';
import { DEFAULT_ALERT_TAGS_KEY } from '../../../../common/constants';
import { KibanaServices } from '../../../common/lib/kibana';

/**
 * Maximum number of tag suggestions returned while browsing (empty query).
 */
const MAX_BROWSE_RESULTS = 15;

const toOption = (tag: string): SelectionOption<string> => ({ value: tag, label: tag });

// A non-error sentinel returned by `resolve` for values that are valid but have nothing to decorate
// (e.g. an empty tags array). The empty label suppresses the inline "✓" decoration while keeping the
// result non-null, which is what the validation pipeline treats as "no error".
const VALID_NO_DECORATION: SelectionOption<string> = { value: '', label: '' };

/**
 * The selection framework passes the raw property value to `search`/`resolve`/`getDetails`. For the
 * `tags_to_add` / `tags_to_remove` array fields this can be the whole array (during validation) or a
 * stringified value (during autocomplete), so every entry point coerces defensively to a string and
 * never assumes a scalar. See https://github.com/elastic/security-team/issues/17985 for the
 * follow-up that makes array-element selection a first-class concern.
 */
const toQueryString = (value: unknown): string => {
  if (typeof value === 'string') {
    return value;
  }
  if (Array.isArray(value)) {
    return value.length > 0 ? String(value[value.length - 1] ?? '') : '';
  }
  return value == null ? '' : String(value);
};

/**
 * Reads the configured default alert tags from the `securitySolution:alertTags` UI Setting.
 *
 * There is currently no endpoint that lists all alert tags in use, so this mirrors the first of
 * the two sources the alert bulk-tagging UI unions client-side (see `alert_bulk_tags.tsx`). A
 * follow-up will optionally union tags present on the alerts referenced by `input.alert_ids`.
 * See https://github.com/elastic/security-team/issues/17985
 */
const getDefaultAlertTags = (): string[] => {
  const tags = KibanaServices.get().uiSettings.get<string[]>(DEFAULT_ALERT_TAGS_KEY);
  return Array.isArray(tags) ? tags : [];
};

/**
 * Selection handler shared by the `tags_to_add` and `tags_to_remove` fields of the Set Alert Tags
 * step. It suggests the tags configured in the Security alert-tags UI Setting so workflow authors
 * get the same vocabulary as the in-app bulk-tagging control.
 */
export const alertTagsSelection: PropertySelectionHandler<string> = {
  search: async (input) => {
    const query = toQueryString(input).trim().toLowerCase();
    const tags = getDefaultAlertTags();
    const matches =
      query.length === 0 ? tags : tags.filter((tag) => tag.toLowerCase().includes(query));
    return matches.slice(0, MAX_BROWSE_RESULTS).map(toOption);
  },
  resolve: async (value) => {
    const tag = toQueryString(value).trim();
    // Both tag fields are optional and free-form: an empty list and an unknown tag are both valid.
    // Returning a non-null option here keeps the step-property validator from flagging a false error
    // (a `null` result for a non-null value is treated as an error). The "at least one of
    // tags_to_add / tags_to_remove" constraint is enforced separately via the schema `anyOf` marker.
    if (tag.length === 0) {
      return VALID_NO_DECORATION;
    }
    const found = getDefaultAlertTags().find((candidate) => candidate === tag);
    return found ? toOption(found) : toOption(tag);
  },
  getDetails: async (value, _context, option) => {
    const tag = option?.value ?? toQueryString(value);
    const isKnown = getDefaultAlertTags().some((candidate) => candidate === tag);
    if (isKnown) {
      return {
        message: i18n.translate(
          'xpack.securitySolution.workflows.steps.setAlertTags.selection.knownTag',
          {
            defaultMessage: '✓ `{tag}` is a configured alert tag.',
            values: { tag },
          }
        ),
      };
    }

    return {
      message: i18n.translate(
        'xpack.securitySolution.workflows.steps.setAlertTags.selection.customTag',
        {
          defaultMessage: '`{tag}` is not in the configured alert tags but can still be applied.',
          values: { tag },
        }
      ),
    };
  },
};

// The Set Alert Tags input schema is a `z.union` (so the "at least one tags array" constraint
// lowers to JSON Schema `anyOf` and surfaces in the editor). `EditorHandlers` only derives
// per-field input keys when the input schema is a `z.object`, so its `input` type collapses to
// `{}` for a union. The editor resolves handlers purely by property key at runtime
// (`scopeHandlers?.[key]` in `use_get_property_handler.ts`), so attaching handlers by key is safe.
// We type this object explicitly and pass it as a named variable to `createPublicStepDefinition`
// (a named variable is assignable to the `{}` input slot without excess-property errors).
export const alertTagsInputEditorHandlers: {
  input: Record<'tags_to_add' | 'tags_to_remove', { selection: PropertySelectionHandler<string> }>;
} = {
  input: {
    tags_to_add: { selection: alertTagsSelection },
    tags_to_remove: { selection: alertTagsSelection },
  },
};
