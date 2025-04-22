/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RenderResult } from '@testing-library/react';
// eslint-disable-next-line import/no-extraneous-dependencies
import { act, fireEvent, waitFor } from '@testing-library/react';
import { createTestSubjGenerator } from '../../mocks/utils';

/**
 * Get a list of test ids for the policy selector comonent
 * @param dataTestSubj
 */
const getTestIdList = (dataTestSubj: string) => {
  const generateTestId = createTestSubjGenerator(dataTestSubj);

  return {
    root: dataTestSubj,
    policy: (policyId: string) => generateTestId(`policy-${policyId}`),
    policyLink: (policyId: string) => generateTestId(`policy-${policyId}-policyLink`),
    policyCheckbox: (policyId: string) => generateTestId(`policy-${policyId}-checkbox`),
    get noPoliciesFound() {
      return generateTestId('noPolicies');
    },
    get searchbarInput() {
      return generateTestId('searchbar');
    },
    get viewSelectedButton() {
      return generateTestId('viewSelectedButton');
    },
    get isFetchingProgress() {
      return generateTestId('isFetching');
    },
    get selectAllButton() {
      return generateTestId('selectAllButton');
    },
    get unselectAllButton() {
      return generateTestId('unselectAllButton');
    },
    get policyList() {
      return generateTestId('list');
    },
    get policyFetchTotal() {
      return generateTestId('policyFetchTotal');
    },
    get pagination() {
      return generateTestId('pagination');
    },
  } as const;
};

/**
 * Returns an object with most of the test subjects used by the PolicySelector component.
 * @param dataTestSubj
 * @param renderResult
 */
const getTestHelpers = (
  /** The `data-test-subj` that was passed to the `PolicySelector` component */
  dataTestSubj: string,
  /** The render result of the test being evaluated */
  renderResult: RenderResult
) => {
  const testIds = getTestIdList(dataTestSubj);

  return {
    testIds,

    isPolicySelected(policyId: string): boolean {
      return (
        renderResult.getByTestId(testIds.policy(policyId)).getAttribute('aria-checked') === 'true'
      );
    },

    isPolicyDisabled(policyId: string): boolean {
      return (
        renderResult.getByTestId(testIds.policy(policyId)).getAttribute('aria-disabled') === 'true'
      );
    },

    waitForDataToLoad: async (): Promise<void> => {
      await waitFor(() => {
        expect(renderResult.queryByTestId(testIds.isFetchingProgress)).toBeNull();
      });
    },

    clickOnPolicy: (policyId: string) => {
      act(() => {
        fireEvent.click(renderResult.getByTestId(testIds.policy(policyId)));
      });
    },

    clickOnSelectAll: () => {
      act(() => {
        fireEvent.click(renderResult.getByTestId(testIds.selectAllButton));
      });
    },

    clickOnUnSelectAll: () => {
      act(() => {
        fireEvent.click(renderResult.getByTestId(testIds.unselectAllButton));
      });
    },

    clickOnViewSelected: () => {
      act(() => {
        fireEvent.click(renderResult.getByTestId(testIds.viewSelectedButton));
      });
    },
  } as const;
};

export const policySelectorMocks = Object.freeze({
  getTestIdList,

  getTestHelpers,
});
