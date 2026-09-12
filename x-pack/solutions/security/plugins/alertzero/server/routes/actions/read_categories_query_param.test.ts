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

import { httpServerMock } from '@kbn/core-http-server-mocks';
import { readActionCategoriesQueryParam } from './read_categories_query_param';
import { ACTION_CATEGORIES_QUERY_PARAM_MAX_ITEMS } from './constants';

const requestWithQuery = (query: Record<string, string | string[]> | undefined) =>
  httpServerMock.createKibanaRequest({ path: '/internal/alertzero/actions', query });

describe('readActionCategoriesQueryParam', () => {
  it('returns undefined when the param is absent', () => {
    expect(readActionCategoriesQueryParam(requestWithQuery(undefined))).toBeUndefined();
  });

  it('returns undefined for empty / blank values', () => {
    expect(readActionCategoriesQueryParam(requestWithQuery({ categories: '' }))).toBeUndefined();
    expect(readActionCategoriesQueryParam(requestWithQuery({ categories: '  ' }))).toBeUndefined();
  });

  it('returns the single category as a one-element array', () => {
    expect(readActionCategoriesQueryParam(requestWithQuery({ categories: 'contain' }))).toEqual([
      'contain',
    ]);
  });

  it('returns the multi-valued param as an OR-set', () => {
    expect(
      readActionCategoriesQueryParam(requestWithQuery({ categories: ['contain', 'escalate'] }))
    ).toEqual(['contain', 'escalate']);
  });

  it('splits a comma-joined single value', () => {
    expect(
      readActionCategoriesQueryParam(requestWithQuery({ categories: 'contain,tune' }))
    ).toEqual(['contain', 'tune']);
  });

  it('rejects more than the max values even when comma-joined', () => {
    expect(() =>
      readActionCategoriesQueryParam(
        requestWithQuery({ categories: Array(21).fill('c').join(',') })
      )
    ).toThrow(/at most 20/);
  });

  it('trims whitespace around values', () => {
    expect(readActionCategoriesQueryParam(requestWithQuery({ categories: ' contain ' }))).toEqual([
      'contain',
    ]);
  });

  it('rejects more than the max values', () => {
    const tooMany = Array.from(
      { length: ACTION_CATEGORIES_QUERY_PARAM_MAX_ITEMS + 1 },
      (_, i) => `c${i}`
    );
    expect(() => readActionCategoriesQueryParam(requestWithQuery({ categories: tooMany }))).toThrow(
      /at most \d+ values/
    );
  });
});
