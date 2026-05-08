/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import {
  getMockServerDependencies,
  setupMockServer,
  startMockServer,
} from '../../test/mock_server/mock_server';
import { renderWrapper } from '../../test/mock_server/mock_server_test_provider';
import { Configurations } from './configurations';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from '@kbn/shared-ux-router';
import { findingsNavigation } from '@kbn/cloud-security-posture';
import userEvent from '@testing-library/user-event';
import { FilterManager } from '@kbn/data-plugin/public';
import type { CspClientPluginStartDeps } from '@kbn/cloud-security-posture';
import * as statusHandlers from '../../../server/routes/status/status.handlers.mock';
import {
  searchFindingsHandler,
  generateCspFinding,
  generateMultipleCspFindings,
  rulesGetStatesHandler,
} from './configurations.handlers.mock';
import { useExpandableFlyoutCsp } from '../../common/hooks/use_expandable_flyout_csp';

jest.mock('../../common/hooks/use_expandable_flyout_csp', () => ({
  useExpandableFlyoutCsp: jest.fn(),
}));

const server = setupMockServer();

const renderFindingsPage = (dependencies = getMockServerDependencies()) => {
  return renderWrapper(
    <MemoryRouter initialEntries={[findingsNavigation.findings_default.path]}>
      <Configurations />
    </MemoryRouter>,
    dependencies
  );
};

// Failing: See https://github.com/elastic/kibana/issues/244001
describe.skip('<Findings />', () => {
  startMockServer(server);

  (useExpandableFlyoutCsp as jest.Mock).mockReturnValue({
    onExpandDocClick: jest.fn(),
  });

  beforeEach(() => {
    server.use(rulesGetStatesHandler);
  });

  it('renders integrations installation prompt if integration is not installed and there are no findings', async () => {
    server.use(statusHandlers.notInstalledHandler);
    renderFindingsPage();

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText(/add cspm integration/i)).toBeInTheDocument());
    expect(screen.getByText(/add kspm integration/i)).toBeInTheDocument();
  });

  it('verifies CSPM and KSPM integration buttons have link and are clickable', async () => {
    server.use(statusHandlers.notInstalledHandler);
    renderFindingsPage();

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
    const cspmButton = await waitFor(() =>
      screen.getByRole('link', { name: /add cspm integration/i })
    );
    const kspmButton = await waitFor(() =>
      screen.getByRole('link', { name: /add kspm integration/i })
    );

    expect(cspmButton).toHaveAttribute('href', expect.stringContaining('add-integration/cspm'));
    expect(cspmButton).toBeEnabled();
    expect(kspmButton).toHaveAttribute('href', expect.stringContaining('add-integration/kspm'));
    expect(kspmButton).toBeEnabled();
  });

  it("renders the 'latest misconfigurations findings' DataTable component when the CSPM/KSPM integration status is not installed but there are findings", async () => {
    const finding1 = generateCspFinding('0003', 'failed');
    const finding2 = generateCspFinding('0004', 'passed');

    server.use(statusHandlers.notInstalledHasMisconfigurationsFindingsHandler);
    server.use(searchFindingsHandler([finding1, finding2]));
    renderFindingsPage();

    // Loading while checking the status API and fetching the findings
    expect(screen.getByText(/loading/i)).toBeInTheDocument();

    await waitFor(() => expect(screen.getByText(/2 findings/i)).toBeInTheDocument());

    const fieldsToCheck = [
      finding1.resource.name,
      finding1.resource.id,
      finding1.rule.benchmark.rule_number as string,
      finding1.rule.name,
      finding1.rule.section,
      finding2.resource.name,
      finding2.resource.id,
      finding2.rule.benchmark.rule_number as string,
      finding2.rule.name,
      finding2.rule.section,
    ];

    fieldsToCheck.forEach((fieldValue) => {
      expect(screen.getByText(fieldValue)).toBeInTheDocument();
    });
  });

  it("renders the 'latest findings' DataTable component when the CSPM/KSPM integration status is 'indexed' grouped by 'none'", async () => {
    const finding1 = generateCspFinding('0001', 'failed');
    const finding2 = generateCspFinding('0002', 'passed');

    server.use(statusHandlers.indexedHandler);
    server.use(searchFindingsHandler([finding1, finding2]));
    renderFindingsPage();

    // Loading while checking the status API
    expect(screen.getByText(/loading/i)).toBeInTheDocument();

    await waitFor(() => expect(screen.getByText(/2 findings/i)).toBeInTheDocument());

    expect(screen.getByText(finding1.resource.name)).toBeInTheDocument();
    expect(screen.getByText(finding1.resource.id)).toBeInTheDocument();
    expect(screen.getByText(finding1.rule.benchmark.rule_number as string)).toBeInTheDocument();
    expect(screen.getByText(finding1.rule.name)).toBeInTheDocument();
    expect(screen.getByText(finding1.rule.section)).toBeInTheDocument();

    expect(screen.getByText(finding2.resource.name)).toBeInTheDocument();
    expect(screen.getByText(finding2.resource.id)).toBeInTheDocument();
    expect(screen.getByText(finding2.rule.benchmark.rule_number as string)).toBeInTheDocument();
    expect(screen.getByText(finding2.rule.name)).toBeInTheDocument();
    expect(screen.getByText(finding2.rule.section)).toBeInTheDocument();

    expect(screen.getByText(/group findings by: none/i)).toBeInTheDocument();
  });

  describe('SearchBar', () => {
    it('set search query', async () => {
      const finding1 = generateCspFinding('0001', 'failed');
      const finding2 = generateCspFinding('0002', 'passed');

      server.use(statusHandlers.indexedHandler);
      server.use(searchFindingsHandler([finding1, finding2]));

      renderFindingsPage();

      // Loading while checking the status API
      expect(screen.getByText(/loading/i)).toBeInTheDocument();

      await waitFor(() => expect(screen.getByText(/2 findings/i)).toBeInTheDocument());

      const queryInput = screen.getByTestId('queryInput');
      await userEvent.click(queryInput);
      await userEvent.paste(`rule.section : ${finding1.rule.section}`);

      const submitButton = screen.getByTestId('querySubmitButton');
      await userEvent.click(submitButton);

      await waitFor(() => expect(screen.getByText(/1 findings/i)).toBeInTheDocument());

      expect(screen.getByText(finding1.resource.name)).toBeInTheDocument();
      expect(screen.queryByText(finding2.resource.id)).not.toBeInTheDocument();

      await userEvent.clear(queryInput);
      await userEvent.click(submitButton);
      await waitFor(() => expect(screen.getByText(/2 findings/i)).toBeInTheDocument());
    });
    it('renders no results message and reset button when search query does not match', async () => {
      const finding1 = generateCspFinding('0001', 'failed');
      const finding2 = generateCspFinding('0002', 'passed');

      server.use(statusHandlers.indexedHandler);
      server.use(searchFindingsHandler([finding1, finding2]));

      renderFindingsPage();

      // Loading while checking the status API
      expect(screen.getByText(/loading/i)).toBeInTheDocument();

      await waitFor(() => expect(screen.getByText(/2 findings/i)).toBeInTheDocument());

      const queryInput = screen.getByTestId('queryInput');
      await userEvent.click(queryInput);
      await userEvent.paste(`rule.section : Invalid`);

      const submitButton = screen.getByTestId('querySubmitButton');
      await userEvent.click(submitButton);

      await waitFor(() =>
        expect(screen.getByText(/no results match your search criteria/i)).toBeInTheDocument()
      );

      const resetButton = screen.getByRole('button', {
        name: /reset filters/i,
      });

      await userEvent.click(resetButton);
      await waitFor(() => expect(screen.getByText(/2 findings/i)).toBeInTheDocument());
    });
    it('add filter', async () => {
      const finding1 = generateCspFinding('0001', 'failed');
      const finding2 = generateCspFinding('0002', 'passed');

      server.use(statusHandlers.indexedHandler);
      server.use(searchFindingsHandler([finding1, finding2]));

      renderFindingsPage();

      // Loading while checking the status API
      expect(screen.getByText(/loading/i)).toBeInTheDocument();

      await waitFor(() => expect(screen.getByText(/2 findings/i)).toBeInTheDocument());

      await userEvent.click(screen.getByTestId('addFilter'), { pointerEventsCheck: 0 });

      await waitFor(() =>
        expect(screen.getByTestId('filterFieldSuggestionList')).toBeInTheDocument()
      );

      const filterFieldSuggestionListInput = within(
        screen.getByTestId('filterFieldSuggestionList')
      ).getByTestId('comboBoxSearchInput');

      await userEvent.click(filterFieldSuggestionListInput);
      await userEvent.paste('rule.section');
      await userEvent.keyboard('{enter}');

      const filterOperatorListInput = within(screen.getByTestId('filterOperatorList')).getByTestId(
        'comboBoxSearchInput'
      );
      await userEvent.click(filterOperatorListInput, { pointerEventsCheck: 0 });

      const filterOption = within(
        screen.getByTestId('comboBoxOptionsList filterOperatorList-optionsList')
      ).getByRole('option', { name: 'is' });
      fireEvent.click(filterOption);

      const filterParamsInput = within(screen.getByTestId('filterParams')).getByRole('textbox');
      await userEvent.click(filterParamsInput);
      await userEvent.paste(finding1.rule.section);

      await userEvent.click(screen.getByTestId('saveFilter'), { pointerEventsCheck: 0 });

      await waitFor(() => expect(screen.getByText(/1 findings/i)).toBeInTheDocument());
      expect(screen.getByText(finding1.resource.name)).toBeInTheDocument();
      expect(screen.queryByText(finding2.resource.id)).not.toBeInTheDocument();
    });
    it('remove filter', async () => {
      const finding1 = generateCspFinding('0001', 'failed');
      const finding2 = generateCspFinding('0002', 'passed');

      const mockedFilterManager = new FilterManager(getMockServerDependencies().core.uiSettings);
      mockedFilterManager.setFilters([
        {
          meta: {
            alias: `rule.section: ${finding1.rule.section}`,
            negate: false,
            disabled: false,
            key: 'rule.section',
            value: finding1.rule.section,
          },
          query: {
            match_phrase: {
              'rule.section': finding1.rule.section,
            },
          },
        },
      ]);
      const mockDependenciesWithFilter = {
        ...getMockServerDependencies(),
        deps: {
          ...getMockServerDependencies().deps,
          data: {
            ...getMockServerDependencies().deps.data,
            query: {
              ...getMockServerDependencies().deps.data!.query,
              filterManager: mockedFilterManager,
            },
          },
        } as unknown as Partial<CspClientPluginStartDeps>,
      };

      server.use(statusHandlers.indexedHandler);
      server.use(searchFindingsHandler([finding1, finding2]));

      renderFindingsPage(mockDependenciesWithFilter);

      // Loading while checking the status API
      expect(screen.getByText(/loading/i)).toBeInTheDocument();

      await waitFor(() => expect(screen.getByText(/1 findings/i)).toBeInTheDocument());
      expect(screen.getByText(finding1.resource.name)).toBeInTheDocument();
      expect(screen.queryByText(finding2.resource.id)).not.toBeInTheDocument();

      const deleteFilter = screen.getByRole('button', {
        name: `Delete rule.section: ${finding1.rule.section}`,
      });
      await userEvent.click(deleteFilter);

      await waitFor(() => expect(screen.getByText(/2 findings/i)).toBeInTheDocument());

      expect(screen.getByText(finding1.resource.name)).toBeInTheDocument();
      expect(screen.getByText(finding2.resource.name)).toBeInTheDocument();
    });
  });

  describe('DistributionBar', () => {
    it('renders the distribution bar', async () => {
      server.use(statusHandlers.indexedHandler);
      server.use(
        searchFindingsHandler(
          generateMultipleCspFindings({
            count: 10,
            failedCount: 3,
          })
        )
      );

      renderFindingsPage();

      // Loading while checking the status API
      expect(screen.getByText(/loading/i)).toBeInTheDocument();

      await waitFor(() => expect(screen.getByText(/10 findings/i)).toBeInTheDocument());

      screen.getByRole('button', {
        name: /passed findings: 7/i,
      });
      screen.getByRole('button', {
        name: /failed findings: 3/i,
      });

      // Assert that the distribution bar has the correct percentages rendered
      expect(screen.getByTestId('distribution_bar_passed')).toHaveStyle('flex: 7');
      expect(screen.getByTestId('distribution_bar_failed')).toHaveStyle('flex: 3');
    });

    it('filters by passed findings when clicking on the passed findings button', async () => {
      server.use(statusHandlers.indexedHandler);
      server.use(
        searchFindingsHandler(
          generateMultipleCspFindings({
            count: 2,
            failedCount: 1,
          })
        )
      );

      renderFindingsPage();

      // Loading while checking the status API
      expect(screen.getByText(/loading/i)).toBeInTheDocument();

      await waitFor(() => expect(screen.getByText(/2 findings/i)).toBeInTheDocument());

      const passedFindingsButton = screen.getByRole('button', {
        name: /passed findings: 1/i,
      });
      await userEvent.click(passedFindingsButton);

      await waitFor(() => expect(screen.getByText(/1 findings/i)).toBeInTheDocument());

      screen.getByRole('button', {
        name: /passed findings: 1/i,
      });
      screen.getByRole('button', {
        name: /failed findings: 0/i,
      });

      // Assert that the distribution bar has the correct percentages rendered
      expect(screen.getByTestId('distribution_bar_passed')).toHaveStyle('flex: 1');
      expect(screen.getByTestId('distribution_bar_failed')).toHaveStyle('flex: 0');
    }, 10000);
    it('filters by failed findings when clicking on the failed findings button', async () => {
      server.use(statusHandlers.indexedHandler);
      server.use(
        searchFindingsHandler(
          generateMultipleCspFindings({
            count: 2,
            failedCount: 1,
          })
        )
      );

      renderFindingsPage();

      // Loading while checking the status API
      expect(screen.getByText(/loading/i)).toBeInTheDocument();

      await waitFor(() => expect(screen.getByText(/2 findings/i)).toBeInTheDocument());

      const failedFindingsButton = screen.getByRole('button', {
        name: /failed findings: 1/i,
      });
      await userEvent.click(failedFindingsButton);

      await waitFor(() => expect(screen.getByText(/1 findings/i)).toBeInTheDocument());

      screen.getByRole('button', {
        name: /passed findings: 0/i,
      });
      screen.getByRole('button', {
        name: /failed findings: 1/i,
      });

      // Assert that the distribution bar has the correct percentages rendered
      expect(screen.getByTestId('distribution_bar_passed')).toHaveStyle('flex: 0');
      expect(screen.getByTestId('distribution_bar_failed')).toHaveStyle('flex: 1');
    }, 10000);
  });
});
