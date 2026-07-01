/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { waitForEuiPopoverOpen } from '@elastic/eui/lib/test/rtl';
import {
  openAddToExistingCaseModalMock,
  openAddToNewCaseFlyoutMock,
} from '@kbn/cases-plugin/public/mocks';
import { SECURITY_TIMELINE_ATTACHMENT_TYPE } from '@kbn/cases-plugin/common';
import { useKibana } from '../../../../common/lib/kibana';
import { mockTimelineModel, TestProviders } from '../../../../common/mock';
import { AttachToCaseButton } from './attach_to_case_button';
import { SecurityPageName } from '../../../../../common/constants';

jest.mock('../../../../common/components/link_to', () => {
  const original = jest.requireActual('../../../../common/components/link_to');
  return {
    ...original,
    useFormatUrl: jest.fn().mockReturnValue({
      formatUrl: jest.fn(),
      search: '',
    }),
  };
});
jest.mock('react-redux-v7', () => {
  const original = jest.requireActual('react-redux-v7');
  return {
    ...original,
    useDispatch: () => jest.fn(),
    useSelector: () => mockTimelineModel,
  };
});
jest.mock('../../../../common/lib/kibana');

const useKibanaMock = useKibana as jest.Mocked<typeof useKibana>;

const renderAttachToCaseButton = () =>
  render(
    <TestProviders>
      <AttachToCaseButton timelineId={'timeline-1'} />
    </TestProviders>
  );

describe('AttachToCaseButton', () => {
  const navigateToApp = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    useKibanaMock().services.application.navigateToApp = navigateToApp;
    useKibanaMock().services.cases.config = {
      ...useKibanaMock().services.cases.config,
      attachmentsEnabled: false,
    };
  });

  it('should render the 2 options in the popover when clicking on the button', async () => {
    const { getByTestId } = renderAttachToCaseButton();

    const button = getByTestId('timeline-modal-attach-to-case-dropdown-button');

    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent('Attach to case');

    await userEvent.click(button);

    expect(getByTestId('timeline-modal-attach-timeline-to-new-case')).toBeInTheDocument();
    expect(getByTestId('timeline-modal-attach-timeline-to-new-case')).toHaveTextContent(
      'Attach to new case'
    );

    expect(getByTestId('timeline-modal-attach-timeline-to-existing-case')).toBeInTheDocument();
    expect(getByTestId('timeline-modal-attach-timeline-to-existing-case')).toHaveTextContent(
      'Attach to existing case'
    );
  });

  describe('legacy flow (attachments framework disabled)', () => {
    it('navigates to the create case page when clicking on attach to new case', async () => {
      useKibanaMock().services.cases.ui.getAllCasesSelectorModal = jest
        .fn()
        .mockImplementation(({ onRowClick }) => {
          onRowClick();
          return <></>;
        });

      const { getByTestId } = renderAttachToCaseButton();

      await userEvent.click(getByTestId('timeline-modal-attach-to-case-dropdown-button'));
      await waitForEuiPopoverOpen();
      await userEvent.click(getByTestId('timeline-modal-attach-timeline-to-existing-case'));

      expect(navigateToApp).toHaveBeenCalledWith('securitySolutionUI', {
        path: '/create',
        deepLinkId: SecurityPageName.case,
      });
    });

    it('opens modal and navigates to the case page when clicking on attach to existing case', async () => {
      useKibanaMock().services.cases.ui.getAllCasesSelectorModal = jest
        .fn()
        .mockImplementation(({ onRowClick }) => {
          onRowClick({ id: 'case-id' });
          return <></>;
        });

      const { getByTestId } = renderAttachToCaseButton();

      await userEvent.click(getByTestId('timeline-modal-attach-to-case-dropdown-button'));
      await waitForEuiPopoverOpen();
      await userEvent.click(getByTestId('timeline-modal-attach-timeline-to-existing-case'));

      expect(navigateToApp).toHaveBeenCalledWith('securitySolutionUI', {
        path: '/case-id',
        deepLinkId: SecurityPageName.case,
      });
    });

    it('does not invoke the unified attachments hooks', async () => {
      const { getByTestId } = renderAttachToCaseButton();

      await userEvent.click(getByTestId('timeline-modal-attach-to-case-dropdown-button'));
      await waitForEuiPopoverOpen();
      await userEvent.click(getByTestId('timeline-modal-attach-timeline-to-new-case'));

      expect(openAddToNewCaseFlyoutMock).not.toHaveBeenCalled();
      expect(openAddToExistingCaseModalMock).not.toHaveBeenCalled();
    });
  });

  describe('unified flow (attachments framework enabled)', () => {
    beforeEach(() => {
      useKibanaMock().services.cases.config = {
        ...useKibanaMock().services.cases.config,
        attachmentsEnabled: true,
      };
    });

    it('opens the cases create-new flyout with a security.timeline attachment', async () => {
      const { getByTestId } = renderAttachToCaseButton();

      await userEvent.click(getByTestId('timeline-modal-attach-to-case-dropdown-button'));
      await waitForEuiPopoverOpen();
      await userEvent.click(getByTestId('timeline-modal-attach-timeline-to-new-case'));

      expect(openAddToNewCaseFlyoutMock).toHaveBeenCalledTimes(1);
      expect(openAddToNewCaseFlyoutMock).toHaveBeenCalledWith({
        attachments: [
          {
            type: SECURITY_TIMELINE_ATTACHMENT_TYPE,
            attachmentId: mockTimelineModel.savedObjectId,
            metadata: { title: mockTimelineModel.title },
          },
        ],
      });
      expect(navigateToApp).not.toHaveBeenCalled();
    });

    it('opens the cases add-to-existing modal with a getAttachments returning the timeline attachment', async () => {
      const { getByTestId } = renderAttachToCaseButton();

      await userEvent.click(getByTestId('timeline-modal-attach-to-case-dropdown-button'));
      await waitForEuiPopoverOpen();
      await userEvent.click(getByTestId('timeline-modal-attach-timeline-to-existing-case'));

      expect(openAddToExistingCaseModalMock).toHaveBeenCalledTimes(1);
      const args = openAddToExistingCaseModalMock.mock.calls[0][0];
      expect(args.getAttachments()).toEqual([
        {
          type: SECURITY_TIMELINE_ATTACHMENT_TYPE,
          attachmentId: mockTimelineModel.savedObjectId,
          metadata: { title: mockTimelineModel.title },
        },
      ]);
      expect(navigateToApp).not.toHaveBeenCalled();
    });

    it('does not render the legacy cases selector modal', async () => {
      const legacyModal = jest.fn().mockImplementation(() => <div data-test-subj="legacy-modal" />);
      useKibanaMock().services.cases.ui.getAllCasesSelectorModal = legacyModal;

      const { getByTestId, queryByTestId } = renderAttachToCaseButton();

      await userEvent.click(getByTestId('timeline-modal-attach-to-case-dropdown-button'));
      await waitForEuiPopoverOpen();
      await userEvent.click(getByTestId('timeline-modal-attach-timeline-to-existing-case'));

      expect(legacyModal).not.toHaveBeenCalled();
      expect(queryByTestId('legacy-modal')).toBeNull();
    });
  });
});
