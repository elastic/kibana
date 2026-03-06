/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { waitForEuiPopoverOpen } from '@elastic/eui/lib/test/rtl';
import { fireEvent, screen } from '@testing-library/react';
import React from 'react';
import { useKibana } from '../../../../hooks/use_kibana';
import { useFetchSloTemplateTags } from '../../../../hooks/use_fetch_slo_template_tags';
import { useFetchSloTemplates } from '../../../../hooks/use_fetch_slo_templates';
import { usePermissions } from '../../../../hooks/use_permissions';
import { render } from '../../../../utils/test_helper';
import { CreateSloBtn } from './create_slo_btn';

jest.mock('../../../../hooks/use_kibana');
jest.mock('../../../../hooks/use_permissions');
jest.mock('../../../../hooks/use_fetch_slo_templates');
jest.mock('../../../../hooks/use_fetch_slo_template_tags');

const mockNavigateToUrl = jest.fn();
const useKibanaMock = useKibana as jest.Mock;
const usePermissionsMock = usePermissions as jest.Mock;
const useFetchSloTemplatesMock = useFetchSloTemplates as jest.Mock;
const useFetchSloTemplateTagsMock = useFetchSloTemplateTags as jest.Mock;

describe('CreateSloBtn', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useKibanaMock.mockReturnValue({
      services: {
        http: { basePath: { prepend: (path: string) => path } },
        application: { navigateToUrl: mockNavigateToUrl },
      },
    });
    usePermissionsMock.mockReturnValue({
      data: { hasAllReadRequested: true, hasAllWriteRequested: true },
    });
    useFetchSloTemplatesMock.mockReturnValue({
      data: { total: 0, page: 1, perPage: 20, results: [] },
      isLoading: false,
      isError: false,
    });
    useFetchSloTemplateTagsMock.mockReturnValue({
      data: { tags: [] },
      isLoading: false,
      isError: false,
    });
  });

  it('renders a dropdown button', () => {
    render(<CreateSloBtn />);

    expect(screen.getByTestId('slosPageCreateSloDropdown')).toBeTruthy();
  });

  it('disables the button when user lacks write permissions', () => {
    usePermissionsMock.mockReturnValue({
      data: { hasAllReadRequested: true, hasAllWriteRequested: false },
    });

    render(<CreateSloBtn />);

    expect(screen.getByTestId('slosPageCreateSloDropdown')).toBeDisabled();
  });

  it('shows dropdown items on click', async () => {
    render(<CreateSloBtn />);

    fireEvent.click(screen.getByTestId('slosPageCreateSloDropdown'));
    await waitForEuiPopoverOpen();

    expect(screen.getByTestId('slosPageCreateNewSloButton')).toBeTruthy();
    expect(screen.getByTestId('slosPageCreateFromTemplateButton')).toBeTruthy();
  });

  it('navigates to create SLO page when "Create SLO" is clicked', async () => {
    render(<CreateSloBtn />);

    fireEvent.click(screen.getByTestId('slosPageCreateSloDropdown'));
    await waitForEuiPopoverOpen();
    fireEvent.click(screen.getByTestId('slosPageCreateNewSloButton'));

    expect(mockNavigateToUrl).toHaveBeenCalledWith('/app/slos/create');
  });

  it('opens flyout when "Create from template" is clicked', async () => {
    render(<CreateSloBtn />);

    fireEvent.click(screen.getByTestId('slosPageCreateSloDropdown'));
    await waitForEuiPopoverOpen();
    fireEvent.click(screen.getByTestId('slosPageCreateFromTemplateButton'));

    expect(screen.getByTestId('sloTemplatesFlyout')).toBeTruthy();
  });
});
