/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react';
import type { DataTableRecord } from '@kbn/discover-utils';
import { TestProviders } from '../../../../common/mock';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';
import { useUserPrivileges } from '../../../../common/components/user_privileges';
import { getUserPrivilegesMockDefaultValue } from '../../../../common/components/user_privileges/__mocks__';
import { getEndpointPrivilegesInitialStateMock } from '../../../../common/components/user_privileges/endpoint/mocks';
import { CUSTOM_YARA_SIGNATURE_ENTRY_ID_FIELD_NAME } from '../../../../timelines/components/timeline/body/renderers/constants';
import { getCustomYaraSignaturesListPath } from '../../../../management/common/routing';
import { CustomYaraSignaturesApiClient } from '../../../../management/pages/custom_yara_signatures/service/api_client';
import {
  HIGHLIGHTED_FIELDS_CUSTOM_YARA_SIGNATURE_NOT_FOUND_TEST_ID,
  HIGHLIGHTED_FIELDS_LINKED_CELL_TEST_ID,
} from './test_ids';
import {
  CustomYaraSignatureHighlightedFieldLink,
  isCustomYaraSignatureHighlightedField,
} from './custom_yara_signature_highlighted_field_link';

jest.mock('../../../../management/pages/custom_yara_signatures/service/api_client', () => ({
  CustomYaraSignaturesApiClient: {
    getInstance: jest.fn(),
  },
}));

jest.mock('../../../../common/hooks/use_experimental_features');
jest.mock('../../../../common/components/user_privileges');
jest.mock('../../../../common/lib/kibana', () => {
  const actual = jest.requireActual('../../../../common/lib/kibana');
  return {
    ...actual,
    useAppUrl: () => ({
      getAppUrl: ({ path }: { path: string }) => path,
    }),
  };
});

const mockUseIsExperimentalFeatureEnabled = useIsExperimentalFeatureEnabled as jest.Mock;
const mockUseUserPrivileges = useUserPrivileges as jest.Mock;
const mockGetInstance = CustomYaraSignaturesApiClient.getInstance as jest.Mock;

const ENTRY_ID = '123-456';
const ITEM_ID = 'artifact-item-id';
const SIGNATURE_NOT_FOUND_TOOLTIP = 'YARA signature does not exist.';

const getArtifactMock = jest.fn();

const createHit = (entryId?: string): DataTableRecord =>
  ({
    id: '1',
    raw: {},
    flattened: entryId ? { [CUSTOM_YARA_SIGNATURE_ENTRY_ID_FIELD_NAME]: entryId } : {},
    isAnchor: false,
  } as DataTableRecord);

const renderLink = (hit?: DataTableRecord) =>
  render(
    <TestProviders>
      <CustomYaraSignatureHighlightedFieldLink hit={hit}>
        <span data-test-subj="cysChild">{'User defined entry name'}</span>
      </CustomYaraSignatureHighlightedFieldLink>
    </TestProviders>
  );

describe('isCustomYaraSignatureHighlightedField', () => {
  it('returns true for CYS highlighted field names', () => {
    expect(isCustomYaraSignatureHighlightedField('rule.custom_yara_signature.entry_name')).toBe(
      true
    );
    expect(
      isCustomYaraSignatureHighlightedField('rule.custom_yara_signature.rule_identifier')
    ).toBe(true);
  });

  it('returns false for other fields', () => {
    expect(isCustomYaraSignatureHighlightedField('rule.name')).toBe(false);
    expect(isCustomYaraSignatureHighlightedField('rule.custom_yara_signature.entry_id')).toBe(
      false
    );
  });
});

describe('CustomYaraSignatureHighlightedFieldLink', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getArtifactMock.mockResolvedValue({ id: ENTRY_ID, item_id: ITEM_ID });
    mockGetInstance.mockReturnValue({ get: getArtifactMock });
    mockUseIsExperimentalFeatureEnabled.mockReturnValue(true);
    mockUseUserPrivileges.mockReturnValue(getUserPrivilegesMockDefaultValue());
  });

  it('renders a link to the CYS view page when the signature exists', async () => {
    const { findByTestId, getByTestId } = renderLink(createHit(ENTRY_ID));

    const link = await findByTestId(HIGHLIGHTED_FIELDS_LINKED_CELL_TEST_ID);
    expect(mockGetInstance).toHaveBeenCalled();
    expect(getArtifactMock).toHaveBeenCalledWith(undefined, ENTRY_ID);
    expect(link).toHaveAttribute(
      'href',
      expect.stringContaining(getCustomYaraSignaturesListPath({ show: 'view', itemId: ITEM_ID }))
    );
    expect(link).toHaveAttribute('target', '_blank');
    expect(getByTestId('cysChild')).toBeInTheDocument();
  });

  it('shows an info tooltip instead of the link when the signature cannot be found', async () => {
    getArtifactMock.mockRejectedValue({ body: { statusCode: 404 } });
    const { findByTestId, getByTestId, queryByTestId } = renderLink(createHit(ENTRY_ID));

    expect(
      await findByTestId(HIGHLIGHTED_FIELDS_CUSTOM_YARA_SIGNATURE_NOT_FOUND_TEST_ID)
    ).toHaveTextContent(SIGNATURE_NOT_FOUND_TOOLTIP);
    expect(queryByTestId(HIGHLIGHTED_FIELDS_LINKED_CELL_TEST_ID)).not.toBeInTheDocument();
    expect(getByTestId('cysChild')).toBeInTheDocument();
  });

  it('renders plain text when looking up the signature fails for another reason', async () => {
    getArtifactMock.mockRejectedValue({ body: { statusCode: 500 } });
    const { getByTestId, queryByTestId, queryByLabelText } = renderLink(createHit(ENTRY_ID));

    await waitFor(() => expect(getArtifactMock).toHaveBeenCalledWith(undefined, ENTRY_ID));
    expect(queryByTestId(HIGHLIGHTED_FIELDS_LINKED_CELL_TEST_ID)).not.toBeInTheDocument();
    expect(queryByLabelText(SIGNATURE_NOT_FOUND_TOOLTIP)).not.toBeInTheDocument();
    expect(
      queryByTestId(HIGHLIGHTED_FIELDS_CUSTOM_YARA_SIGNATURE_NOT_FOUND_TEST_ID)
    ).not.toBeInTheDocument();
    expect(getByTestId('cysChild')).toBeInTheDocument();
  });

  it('renders plain text when the feature flag is disabled', () => {
    mockUseIsExperimentalFeatureEnabled.mockReturnValue(false);

    const { queryByTestId, getByTestId } = renderLink(createHit(ENTRY_ID));

    expect(mockGetInstance).not.toHaveBeenCalled();
    expect(getArtifactMock).not.toHaveBeenCalled();
    expect(queryByTestId(HIGHLIGHTED_FIELDS_LINKED_CELL_TEST_ID)).not.toBeInTheDocument();
    expect(getByTestId('cysChild')).toBeInTheDocument();
  });

  it('renders plain text when the user cannot read custom YARA signatures', () => {
    mockUseUserPrivileges.mockReturnValue(
      getUserPrivilegesMockDefaultValue({
        endpointPrivileges: getEndpointPrivilegesInitialStateMock({
          canReadCustomYaraSignatures: false,
        }),
      })
    );

    const { queryByTestId, getByTestId } = renderLink(createHit(ENTRY_ID));

    expect(mockGetInstance).not.toHaveBeenCalled();
    expect(getArtifactMock).not.toHaveBeenCalled();
    expect(queryByTestId(HIGHLIGHTED_FIELDS_LINKED_CELL_TEST_ID)).not.toBeInTheDocument();
    expect(getByTestId('cysChild')).toBeInTheDocument();
  });

  it('renders plain text when entry_id is missing', () => {
    const { queryByTestId, getByTestId } = renderLink(createHit());

    expect(mockGetInstance).not.toHaveBeenCalled();
    expect(getArtifactMock).not.toHaveBeenCalled();
    expect(queryByTestId(HIGHLIGHTED_FIELDS_LINKED_CELL_TEST_ID)).not.toBeInTheDocument();
    expect(getByTestId('cysChild')).toBeInTheDocument();
  });
});
