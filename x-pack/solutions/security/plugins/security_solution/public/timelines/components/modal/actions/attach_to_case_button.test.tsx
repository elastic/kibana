/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { waitForEuiPopoverOpen } from '@elastic/eui/lib/test/rtl';
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
jest.mock('react-redux', () => {
  const original = jest.requireActual('react-redux');
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
    useKibanaMock().services.application.navigateToApp = navigateToApp;
  });

  it('should render the 2 options in the popover when clicking on the button', () => {
    const { getByTestId } = renderAttachToCaseButton();

    const button = getByTestId('timeline-modal-attach-to-case-dropdown-button');

    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent('Attach to case');

    button.click();

    expect(getByTestId('timeline-modal-attach-timeline-to-new-case')).toBeInTheDocument();
    expect(getByTestId('timeline-modal-attach-timeline-to-new-case')).toHaveTextContent(
      'Attach to new case'
    );

    expect(getByTestId('timeline-modal-attach-timeline-to-existing-case')).toBeInTheDocument();
    expect(getByTestId('timeline-modal-attach-timeline-to-existing-case')).toHaveTextContent(
      'Attach to existing case'
    );
  });

  it('should navigate to the create case page when clicking on attach to new case', async () => {
    const here = jest.fn();
    useKibanaMock().services.cases.ui.getAllCasesSelectorModal = here.mockImplementation(
      ({ onRowClick }) => {
        onRowClick();
        return <></>;
      }
    );

    const { getByTestId } = renderAttachToCaseButton();

    getByTestId('timeline-modal-attach-to-case-dropdown-button').click();

    await waitForEuiPopoverOpen();

    getByTestId('timeline-modal-attach-timeline-to-existing-case').click();

    expect(navigateToApp).toHaveBeenCalledWith('securitySolutionUI', {
      path: '/create',
      deepLinkId: SecurityPageName.case,
    });
  });

  it('should open modal and navigate to the case page when clicking on attach to existing case', async () => {
    useKibanaMock().services.cases.ui.getAllCasesSelectorModal = jest
      .fn()
      .mockImplementation(({ onRowClick }) => {
        onRowClick({ id: 'case-id' });
        return <></>;
      });

    const { getByTestId } = renderAttachToCaseButton();

    getByTestId('timeline-modal-attach-to-case-dropdown-button').click();

    await waitForEuiPopoverOpen();

    getByTestId('timeline-modal-attach-timeline-to-existing-case').click();

    expect(navigateToApp).toHaveBeenCalledWith('securitySolutionUI', {
      path: '/case-id',
      deepLinkId: SecurityPageName.case,
    });
  });
});
