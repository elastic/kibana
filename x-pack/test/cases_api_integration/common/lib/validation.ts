/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { AttachmentTotals, Case, RelatedCase } from '@kbn/cases-plugin/common/types/domain';
import { xorWith, isEqual } from 'lodash';
import { GetRelatedCasesByAlertResponse } from '@kbn/cases-plugin/common/types/api';

type AttachmentTotalsKeys = keyof AttachmentTotals;

export interface TestCaseWithTotals {
  caseInfo: Case;
  totals?: Partial<AttachmentTotals>;
}

/**
 * Ensure that the result of the alerts API request matches with the cases created for the test.
 */
export function validateCasesFromAlertIDResponse(
  casesFromAPIResponse: GetRelatedCasesByAlertResponse,
  createdCasesForTest: TestCaseWithTotals[]
) {
  const idToResponse = new Map<string, RelatedCase>(
    casesFromAPIResponse.map((response) => [response.id, response])
  );

  expect(idToResponse.size).to.be(createdCasesForTest.length);

  // only iterate over the test cases not the api response values
  for (const expectedTestInfo of createdCasesForTest) {
    expect(idToResponse.get(expectedTestInfo.caseInfo.id)?.title).to.be(
      expectedTestInfo.caseInfo.title
    );
    expect(idToResponse.get(expectedTestInfo.caseInfo.id)?.description).to.be(
      expectedTestInfo.caseInfo.description
    );
    expect(idToResponse.get(expectedTestInfo.caseInfo.id)?.status).to.be(
      expectedTestInfo.caseInfo.status
    );
    expect(idToResponse.get(expectedTestInfo.caseInfo.id)?.createdAt).to.be(
      expectedTestInfo.caseInfo.created_at
    );

    // only check the totals that are defined in the test case
    for (const totalKey of Object.keys(expectedTestInfo.totals ?? {}) as AttachmentTotalsKeys[]) {
      expect(idToResponse.get(expectedTestInfo.caseInfo.id)?.totals[totalKey]).to.be(
        expectedTestInfo.totals?.[totalKey]
      );
    }
  }
}
/**
 * Compares two arrays to determine if they are sort of equal. This function returns true if the arrays contain the same
 * elements but the ordering does not matter.
 */
export function arraysToEqual<T>(array1?: T[], array2?: T[]) {
  if (!array1 || !array2 || array1.length !== array2.length) {
    return false;
  }

  return xorWith(array1, array2, isEqual).length === 0;
}

/**
 * Regular expression to test if a string matches the RFC7234 specification (without warn-date) for warning headers. This pattern assumes that the warn code
 * is always 299. Further, this pattern assumes that the warn agent represents a version of Kibana.
 *
 * Example: 299 Kibana-8.2.0 "Deprecated endpoint"
 */
const WARNING_HEADER_REGEX =
  /299 Kibana-\d+.\d+.\d+(?:-(?:alpha|beta|rc)\\d+)?(?:-SNAPSHOT)? \".+\"/g;

export const assertWarningHeader = (warningHeader: string) => {
  const res = warningHeader.match(WARNING_HEADER_REGEX);
  expect(res).not.to.be(null);
};
