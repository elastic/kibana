/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import { AppHeader } from '@kbn/app-header';
import { fireEvent, screen } from '@testing-library/react';
import React from 'react';
import { useKibana } from '../../../../hooks/use_kibana';
import { useFetchSloTemplateTags } from '../../../../hooks/use_fetch_slo_template_tags';
import { useFetchSloTemplates } from '../../../../hooks/use_fetch_slo_templates';
import { usePermissions } from '../../../../hooks/use_permissions';
import { render } from '../../../../utils/test_helper';
import { useCreateSloPrimaryAction } from './create_slo_btn';

vi.mock('../../../../hooks/use_kibana');
vi.mock('../../../../hooks/use_permissions');
vi.mock('../../../../hooks/use_fetch_slo_templates');
vi.mock('../../../../hooks/use_fetch_slo_template_tags');
vi.mock('../../../../hooks/use_composite_slo_enabled', () => {
  const mocked = {
    useCompositeSloEnabled: vi.fn().mockReturnValue(false),
  };
  return { ...mocked, default: mocked };
});

const mockNavigateToUrl = vi.fn();
const useKibanaMock = useKibana as Mock;
const usePermissionsMock = usePermissions as Mock;
const useFetchSloTemplatesMock = useFetchSloTemplates as Mock;
const useFetchSloTemplateTagsMock = useFetchSloTemplateTags as Mock;

function CreateSloPrimaryHarness() {
  const { primaryActionItem, templatesFlyout } = useCreateSloPrimaryAction();
  return (
    <>
      <AppHeader title="SLOs" menu={{ primaryActionItem }} />
      {templatesFlyout}
    </>
  );
}

describe('useCreateSloPrimaryAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

  it('renders a dropdown button', async () => {
    render(<CreateSloPrimaryHarness />);

    expect(await screen.findByTestId('slosPageCreateSloDropdown')).toBeTruthy();
  });

  it('disables the button when user lacks write permissions', async () => {
    usePermissionsMock.mockReturnValue({
      data: { hasAllReadRequested: true, hasAllWriteRequested: false },
    });

    render(<CreateSloPrimaryHarness />);

    expect(await screen.findByTestId('slosPageCreateSloDropdown')).toBeDisabled();
  });

  it('shows dropdown items on click', async () => {
    render(<CreateSloPrimaryHarness />);

    fireEvent.click(await screen.findByTestId('slosPageCreateSloDropdown'));

    expect(await screen.findByTestId('slosPageCreateNewSloButton')).toBeTruthy();
    expect(screen.getByTestId('slosPageCreateFromTemplateButton')).toBeTruthy();
  });

  it('navigates to create SLO page when "Create SLO" is clicked', async () => {
    render(<CreateSloPrimaryHarness />);

    fireEvent.click(await screen.findByTestId('slosPageCreateSloDropdown'));
    fireEvent.click(await screen.findByTestId('slosPageCreateNewSloButton'));

    expect(mockNavigateToUrl).toHaveBeenCalledWith('/app/slos/create');
  });

  it('opens flyout when "Create from template" is clicked', async () => {
    render(<CreateSloPrimaryHarness />);

    fireEvent.click(await screen.findByTestId('slosPageCreateSloDropdown'));
    fireEvent.click(await screen.findByTestId('slosPageCreateFromTemplateButton'));

    expect(await screen.findByTestId('sloTemplatesFlyout')).toBeTruthy();
  });
});
