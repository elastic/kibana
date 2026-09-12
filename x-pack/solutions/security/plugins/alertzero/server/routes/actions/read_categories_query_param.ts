/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0"; you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import { ACTION_CATEGORIES_QUERY_PARAM_MAX_ITEMS } from './constants';

/**
 * Reads the optional `categories` query param from the list-actions request.
 *
 * `categories` is a multi-valued query param (`?categories=contain&categories=escalate`);
 * a comma-joined single value (`?categories=contain,escalate`) is accepted and split.
 * The returned array is the OR-set the API filters on: an action is returned
 * when its declared category matches ANY of the requested categories.
 * Absent / empty param → `undefined`, meaning "no category filter, return all".
 *
 * The category vocabulary is solution-owned (alertzero, nightshift, …), so
 * nothing is validated against a fixed enum here — unknown categories simply
 * match nothing.
 */
/** Thrown when the `categories` query param is structurally invalid (too many values). */
export class InvalidCategoriesError extends Error {}

export const readActionCategoriesQueryParam = (request: KibanaRequest): string[] | undefined => {
  const raw = request.url.searchParams.getAll('categories').flatMap((value) => value.split(','));
  const trimmed = raw.map((value) => value.trim()).filter((value) => value.length > 0);
  if (trimmed.length === 0) {
    return undefined;
  }
  if (trimmed.length > ACTION_CATEGORIES_QUERY_PARAM_MAX_ITEMS) {
    throw new InvalidCategoriesError(
      `The categories query param accepts at most ${ACTION_CATEGORIES_QUERY_PARAM_MAX_ITEMS} values`
    );
  }
  return trimmed;
};
