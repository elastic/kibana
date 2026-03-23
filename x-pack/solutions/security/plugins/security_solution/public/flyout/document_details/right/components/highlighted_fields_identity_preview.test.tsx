/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { buildDataTableRecord, type EsHitRecord } from '@kbn/discover-utils';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import type { EntityStoreEuidApi } from '@kbn/entity-store/public';
import { useEntityStoreEuidApi } from '@kbn/entity-store/public';
import { HighlightedFields } from './highlighted_fields';
import { useHighlightedFields } from '../../../../flyout_v2/document/hooks/use_highlighted_fields';
import { TestProviders } from '../../../../common/mock';
import { useRuleIndexPattern } from '../../../../detection_engine/rule_creation_ui/pages/form';
import { mockContextValue } from '../../shared/mocks/mock_context';
import { DocumentDetailsContext } from '../../shared/context';
import { useHighlightedFieldsPrivilege } from '../../shared/hooks/use_highlighted_fields_privilege';
import { useRuleDetails } from '../../../rule_details/hooks/use_rule_details';
import type { RuleResponse } from '../../../../../common/api/detection_engine';
import { mockFlyoutApi } from '../../shared/mocks/mock_flyout_context';
import { HostPreviewPanelKey } from '../../../entity_details/host_right';
import { HOST_PREVIEW_BANNER } from './host_entity_overview';
import { HIGHLIGHTED_FIELDS_LINKED_CELL_TEST_ID } from './test_ids';
import { useEntityFromStore } from '../../../entity_details/shared/hooks/use_entity_from_store';

jest.mock('../../../../flyout_v2/document/hooks/use_highlighted_fields');
jest.mock('../../../../detection_engine/rule_management/logic/use_rule_with_fallback');
jest.mock('../../../../detection_engine/rule_creation_ui/pages/form');
jest.mock('../../shared/hooks/use_highlighted_fields_privilege');
jest.mock('../../../rule_details/hooks/use_rule_details');
jest.mock('@kbn/expandable-flyout', () => ({
  useExpandableFlyoutApi: jest.fn(),
  ExpandableFlyoutProvider: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

jest.mock('@kbn/entity-store/public', () => {
  const actual = jest.requireActual('@kbn/entity-store/public');
  return {
    ...actual,
    useEntityStoreEuidApi: jest.fn(),
  };
});

jest.mock('../../../entity_details/shared/hooks/use_entity_from_store');

const emptyEntityFromStore = {
  entity: null,
  entityRecord: null,
  firstSeen: null,
  lastSeen: null,
  isLoading: false,
  error: null,
  refetch: jest.fn(),
};

describe('<HighlightedFields /> host.name preview and document identity entityId', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useExpandableFlyoutApi).mockReturnValue(mockFlyoutApi);
    (useHighlightedFieldsPrivilege as jest.Mock).mockReturnValue({
      isDisabled: false,
      tooltipContent: 'tooltip content',
    });
    (useRuleIndexPattern as jest.Mock).mockReturnValue({
      indexPattern: { fields: ['field'] },
      isIndexPatternLoading: false,
    });
    (useRuleDetails as jest.Mock).mockReturnValue({
      rule: { id: '123' } as RuleResponse,
      isExistingRule: true,
      loading: false,
    });
    (useHighlightedFields as jest.Mock).mockReturnValue({
      'host.name': { values: ['hostName'] },
    });
    jest.mocked(useEntityFromStore).mockReturnValue(emptyEntityFromStore);
    jest.mocked(useEntityStoreEuidApi).mockReturnValue({
      euid: {
        getEntityIdentifiersFromDocument: jest.fn((entityType: string) =>
          entityType === 'host'
            ? { 'host.name': 'hostName', 'entity.id': 'identity-fields-entity-id' }
            : null
        ),
        getEuidFromObject: jest.fn(() => null),
      },
    } as unknown as EntityStoreEuidApi);
  });

  it('opens host preview with entityId derived from document identity fields when clicking host.name', () => {
    const { getByTestId } = render(
      <TestProviders>
        <DocumentDetailsContext.Provider value={mockContextValue}>
          <HighlightedFields
            hit={buildDataTableRecord(mockContextValue.searchHit as EsHitRecord)}
            investigationFields={[]}
            scopeId="alerts-page"
            showCellActions
            showEditButton={false}
          />
        </DocumentDetailsContext.Provider>
      </TestProviders>
    );

    getByTestId(HIGHLIGHTED_FIELDS_LINKED_CELL_TEST_ID).click();

    expect(mockFlyoutApi.openPreviewPanel).toHaveBeenCalledWith({
      id: HostPreviewPanelKey,
      params: {
        hostName: 'hostName',
        scopeId: 'alerts-page',
        banner: HOST_PREVIEW_BANNER,
        contextID: 'alerts-page',
        entityId: 'identity-fields-entity-id',
      },
    });
  });
});
