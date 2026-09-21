/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import type { EscalationModalRenderProps } from '@kbn/agentic-investigations-common';
import type { Investigation } from '@kbn/agentic-investigations-common';
import {
  useListEscalations,
  useCreateEscalation,
  useAddToEscalation,
  useCurrentUserProfile,
  useSuggestUserProfiles,
} from '@kbn/agentic-investigations-plugin/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { ConnectedEscalationModal } from './connected_escalation_modal';

jest.mock('@kbn/agentic-investigations-plugin/public', () => ({
  useListEscalations: jest.fn(),
  useCreateEscalation: jest.fn(),
  useAddToEscalation: jest.fn(),
  useCurrentUserProfile: jest.fn(),
  useSuggestUserProfiles: jest.fn(),
}));

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: jest.fn(),
}));

jest.mock('@kbn/user-profile-components', () => ({
  getUserDisplayName: (user: { username?: string }) => user?.username ?? '',
  UserProfilesSelectable: () => <div data-test-subj="escalationModalCollaboratorPicker" />,
}));

jest.mock('@kbn/core-http-browser', () => ({
  isHttpFetchError: jest.fn(() => false),
}));

const mockUseListEscalations = useListEscalations as jest.MockedFunction<typeof useListEscalations>;
const mockUseCreateEscalation = useCreateEscalation as jest.MockedFunction<
  typeof useCreateEscalation
>;
const mockUseAddToEscalation = useAddToEscalation as jest.MockedFunction<typeof useAddToEscalation>;
const mockUseCurrentUserProfile = useCurrentUserProfile as jest.MockedFunction<
  typeof useCurrentUserProfile
>;
const mockUseSuggestUserProfiles = useSuggestUserProfiles as jest.MockedFunction<
  typeof useSuggestUserProfiles
>;
const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;

const createMutate = jest.fn();
const addMutate = jest.fn();
const onClose = jest.fn();

const investigation: Investigation = {
  id: 'inv-1',
  template_id: 'investigation',
  title: 'Suspicious login',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  watch_id: 'watch-1',
  watch_execution_id: 'exec-1',
  pendingProposalCount: 0,
  events: [],
  recordId: 'inv-1',
  conversationId: 'conv-1',
};

const defaultProps: EscalationModalRenderProps = {
  mode: 'create',
  investigation,
  onClose,
};

const renderModal = (props: Partial<EscalationModalRenderProps> = {}) =>
  render(
    <I18nProvider>
      <EuiProvider>
        <ConnectedEscalationModal {...defaultProps} {...props} />
      </EuiProvider>
    </I18nProvider>
  );

beforeEach(() => {
  mockUseListEscalations.mockReturnValue({
    data: { results: [], pagination: { total: 0, page: 1, per_page: 20 } },
    isLoading: false,
  } as unknown as ReturnType<typeof useListEscalations>);

  mockUseCreateEscalation.mockReturnValue({
    mutate: createMutate,
    isLoading: false,
  } as unknown as ReturnType<typeof useCreateEscalation>);

  mockUseAddToEscalation.mockReturnValue({
    mutate: addMutate,
    isLoading: false,
  } as unknown as ReturnType<typeof useAddToEscalation>);

  mockUseCurrentUserProfile.mockReturnValue({
    data: { uid: 'user-1', user: { username: 'alice' } },
    isLoading: false,
  } as unknown as ReturnType<typeof useCurrentUserProfile>);

  mockUseSuggestUserProfiles.mockReturnValue({
    data: [],
    isFetching: false,
  } as unknown as ReturnType<typeof useSuggestUserProfiles>);

  mockUseKibana.mockReturnValue({
    services: {
      notifications: { toasts: { addDanger: jest.fn() } },
    },
  } as unknown as ReturnType<typeof useKibana>);
});

afterEach(() => jest.clearAllMocks());

describe('ConnectedEscalationModal', () => {
  it('renders nothing when investigation has no conversationId', () => {
    const { container } = renderModal({
      investigation: { ...investigation, conversationId: undefined },
    });

    expect(container).toBeEmptyDOMElement();
  });

  it('renders the modal with the investigation title in the subtitle', () => {
    renderModal();

    expect(screen.getByTestId('escalationModal')).toBeInTheDocument();
    expect(screen.getByText(/Suspicious login/)).toBeInTheDocument();
  });

  it('starts in create mode when initialMode is create', () => {
    renderModal({ mode: 'create' });

    const createRadio = document.getElementById('escalation-mode-create') as HTMLInputElement;
    expect(createRadio.checked).toBe(true);
  });

  it('starts in addToExisting mode when initialMode is addToExisting', () => {
    renderModal({ mode: 'addToExisting' });

    const addRadio = document.getElementById('escalation-mode-add-to-existing') as HTMLInputElement;
    expect(addRadio.checked).toBe(true);
  });

  it('switches to addToExisting mode when that panel is clicked', () => {
    renderModal({ mode: 'create' });

    fireEvent.click(screen.getByTestId('escalationModalModeAddToExisting'));

    const addRadio = document.getElementById('escalation-mode-add-to-existing') as HTMLInputElement;
    expect(addRadio.checked).toBe(true);
  });

  it('switches back to create mode when the create panel is clicked', () => {
    renderModal({ mode: 'addToExisting' });

    fireEvent.click(screen.getByTestId('escalationModalModeCreate'));

    const createRadio = document.getElementById('escalation-mode-create') as HTMLInputElement;
    expect(createRadio.checked).toBe(true);
  });

  it('calls createEscalation.mutate when the create form is submitted', () => {
    renderModal({ mode: 'create' });

    fireEvent.click(screen.getByTestId('escalationModalOpenIncident'));

    expect(createMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        linked_investigation_id: 'conv-1',
        visibility: 'public',
      }),
      expect.any(Object)
    );
  });

  it('marks escalations already linked to the conversation as alreadyLinked', () => {
    mockUseListEscalations.mockReturnValue({
      data: {
        results: [
          {
            id: 'esc-1',
            title: 'Existing escalation',
            metadata: { linked_investigations: ['conv-1'] },
          },
        ],
        pagination: { total: 1, page: 1, per_page: 20 },
      },
      isLoading: false,
    } as unknown as ReturnType<typeof useListEscalations>);

    renderModal({ mode: 'addToExisting' });

    // The radio for the already-linked escalation should be disabled.
    const radio = document.getElementById('incident-esc-1') as HTMLInputElement;
    expect(radio).toBeDisabled();
  });
});
