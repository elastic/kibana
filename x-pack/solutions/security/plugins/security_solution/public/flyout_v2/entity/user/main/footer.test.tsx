/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import React from 'react';
import { render, screen } from '@testing-library/react';
import { TestProviders } from '../../../../common/mock';
import { Footer } from './footer';
import type { EntityStoreRecord } from '../../../../flyout/entity_details/shared/hooks/use_entity_from_store';
import { ADD_TO_CASE_TEST_ID } from '../../../../../common/cases/attachments/entity/test_ids';

vi.mock('@kbn/entity-store/public', () => {
      const mocked = {
      useEntityStoreEuidApi: vi.fn(() => null),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../../../common/hooks/is_in_security_app', () => {
      const mocked = {
      useIsInSecurityApp: vi.fn(() => true),
    };
      return { ...mocked, default: mocked };
    });

const mockUseIsExperimentalFeatureEnabled = vi.fn();
vi.mock('../../../../common/hooks/use_experimental_features', () => {
      const mocked = {
      useIsExperimentalFeatureEnabled: () => mockUseIsExperimentalFeatureEnabled(),
    };
      return { ...mocked, default: mocked };
    });

const mockUseKibana = vi.fn();
vi.mock('../../../../common/lib/kibana', () => {
      const mocked = {
      useKibana: () => mockUseKibana(),
    };
      return { ...mocked, default: mocked };
    });

// Render additionalItems inline so tests can assert on them without opening the popover.
vi.mock('../../../../flyout/entity_details/shared/components/take_action', () => {
      const mocked = {
      TakeAction: ({
        additionalItems,
      }: {
        additionalItems?: (close: () => void) => React.ReactElement[];
      }) => <div data-test-subj="mockTakeAction">{additionalItems?.(() => {}) ?? []}</div>,
    };
      return { ...mocked, default: mocked };
    });

vi.mock(
  '../../../../entity_analytics/components/ai_assistant_button/ai_assistant_button',
  () => {
      const mocked = {
        AiAssistantButton: ({ entityName }: { entityName: string }) => (
          <div data-test-subj="mockAiAssistantButton">{entityName}</div>
        ),
      };
      return { ...mocked, default: mocked };
    }
);

vi.mock('../../../../cases/attachments/entity/components/add_to_case', () => {
      const mocked = {
      AddToCase: ({ 'data-test-subj': testSubj }: { 'data-test-subj': string }) => (
        <div data-test-subj={testSubj} />
      ),
    };
      return { ...mocked, default: mocked };
    });

const USER_IDENTITY_FIELDS = { 'user.name': 'alice' };
const ENTITY_STORE_RECORD = {
  entity: { id: 'entity-store-id-abc' },
} as unknown as EntityStoreRecord;

const renderFooter = (
  entityAttachmentsEnabled: boolean,
  attachmentsEnabled: boolean,
  entity?: EntityStoreRecord,
  identityFields: Record<string, string> = USER_IDENTITY_FIELDS,
  userName = 'alice'
) => {
  mockUseIsExperimentalFeatureEnabled.mockReturnValue(entityAttachmentsEnabled);
  mockUseKibana.mockReturnValue({
    services: {
      cases: {
        config: { attachmentsEnabled },
        helpers: {
          canUseCases: () => ({ create: true, update: true, createComment: true, read: true }),
        },
      },
    },
  });

  return render(
    <TestProviders>
      <Footer userName={userName} identityFields={identityFields} entity={entity} />
    </TestProviders>
  );
};

describe('Footer – entity attachment actions', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders the Add to case action when all conditions are met', () => {
    renderFooter(true, true, ENTITY_STORE_RECORD);

    expect(screen.getByTestId(ADD_TO_CASE_TEST_ID)).toBeInTheDocument();
  });

  it('renders no case actions when entityAttachmentsEnabled is false', () => {
    renderFooter(false, true, ENTITY_STORE_RECORD);

    expect(screen.queryByTestId(ADD_TO_CASE_TEST_ID)).not.toBeInTheDocument();
  });

  it('renders no case actions when cases attachmentsEnabled config is false', () => {
    renderFooter(true, false, ENTITY_STORE_RECORD);

    expect(screen.queryByTestId(ADD_TO_CASE_TEST_ID)).not.toBeInTheDocument();
  });

  it('renders no case actions when there is no entity store record (entityStoreId is undefined)', () => {
    renderFooter(true, true, undefined);

    expect(screen.queryByTestId(ADD_TO_CASE_TEST_ID)).not.toBeInTheDocument();
  });

  it('renders no case actions when userName resolves to an empty string', () => {
    renderFooter(true, true, ENTITY_STORE_RECORD, { 'user.name': '' });

    expect(screen.queryByTestId(ADD_TO_CASE_TEST_ID)).not.toBeInTheDocument();
  });
});

describe('Footer – AiAssistantButton entity name', () => {
  beforeEach(() => vi.clearAllMocks());

  it('passes the raw userName prop, not a value derived from identityFields', () => {
    // Regression for security-team/kibana#277619: for non-local users, identityFields can
    // resolve to user.email (ranked above user.name) with no user.name key at all. The footer
    // must still send the flyout's display name to "Add to chat" — the same value the
    // risk-score tab's AiAssistantButton sends for this entity — not the email.
    renderFooter(true, true, ENTITY_STORE_RECORD, { 'user.email': 'alice@example.com' }, 'alice');

    expect(screen.getByTestId('mockAiAssistantButton')).toHaveTextContent('alice');
  });
});
