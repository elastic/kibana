/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, fireEvent, getByRole, render, screen } from '@testing-library/react';
import React from 'react';
import { SynonymRuleFlyout } from './synonym_rule_flyout';
import { I18nProvider } from '@kbn/i18n-react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { usePutSynonymsRule } from '../../hooks/use_put_synonyms_rule';

jest.mock('../../hooks/use_put_synonyms_rule', () => ({
  usePutSynonymsRule: jest.fn().mockReturnValue({
    mutate: jest.fn(),
  }),
}));

const queryClient = new QueryClient();
const Wrapper = ({ children }: { children: React.ReactNode }) => {
  return (
    <I18nProvider>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </I18nProvider>
  );
};
describe('SynonymRuleFlyout', () => {
  const TEST_IDS = {
    RuleIdText: 'searchSynonymsSynonymRuleFlyoutRuleIdText',
    ErrorBanner: 'searchSynonymsSynonymsRuleFlyoutErrorBanner',
    AddFromTermsInput: 'searchSynonymsSynonymsRuleFlyoutFromTermsInput',
    FromTermCountLabel: 'searchSynonymsSynonymsRuleFlyoutTermCountLabel',
    FromTermsSortAZButton: 'searchSynonymsSynonymsRuleFlyoutSortAZButton',
    FromTermsRemoveAllButton: 'searchSynonymsSynonymsRuleFlyoutRemoveAllButton',
    FromTermBadge: 'searchSynonymsSynonymsRuleFlyoutFromTermBadge',
    NoTermsText: 'searchSynonymsSynonymsRuleFlyoutNoTermsText',
    MapToTermsInput: 'searchSynonymsSynonymsRuleFlyoutMapToTermsInput',
    HasChangesBadge: 'searchSynonymsSynonymsRuleFlyoutHasChangesBadge',
    ResetChangesButton: 'searchSynonymsSynonymsRuleFlyoutResetChangesButton',
    SaveChangesButton: 'searchSynonymsSynonymsRuleFlyoutSaveButton',
  };
  const ACTIONS = {
    AddFromTerm: (term: string) => {
      act(() => {
        fireEvent.change(getByRole(screen.getByTestId(TEST_IDS.AddFromTermsInput), 'combobox'), {
          target: { value: term },
        });
        fireEvent.keyDown(getByRole(screen.getByTestId(TEST_IDS.AddFromTermsInput), 'combobox'), {
          key: 'Enter',
          code: 'Enter',
        });
      });
    },
    AddMapToTerm: (term: string) => {
      act(() => {
        fireEvent.change(screen.getByTestId(TEST_IDS.MapToTermsInput), {
          target: { value: term },
        });
      });
    },
    PressSaveChangesButton: () => {
      act(() => {
        fireEvent.click(screen.getByTestId(TEST_IDS.SaveChangesButton));
      });
    },
    PressSortAZButton: () => {
      act(() => {
        fireEvent.click(screen.getByTestId(TEST_IDS.FromTermsSortAZButton));
      });
    },
  };

  const onCloseMock = jest.fn();
  const mutateMock = jest.fn();
  beforeEach(() => {
    jest.clearAllMocks();
    (usePutSynonymsRule as jest.Mock).mockReturnValue({
      mutate: mutateMock,
    });
  });
  describe('create mode', () => {
    it('should render the flyout for equivalent synonyms', () => {
      render(
        <Wrapper>
          <SynonymRuleFlyout
            onClose={onCloseMock}
            flyoutMode={'create'}
            synonymsRule={{
              id: 'generated-id',
              synonyms: '',
            }}
            renderExplicit={false}
            synonymsSetId="my_synonyms_set"
          />
        </Wrapper>
      );
      // Header
      expect(screen.queryByTestId(TEST_IDS.RuleIdText)).toBeInTheDocument();
      expect(screen.queryByTestId(TEST_IDS.ErrorBanner)).not.toBeInTheDocument();

      // From terms
      expect(screen.getByTestId(TEST_IDS.NoTermsText).textContent).toBe('No terms found.');
      expect(screen.getByTestId(TEST_IDS.FromTermCountLabel).textContent).toBe('0 term');
      expect(screen.getByTestId(TEST_IDS.FromTermsSortAZButton)).toBeInTheDocument();
      expect(screen.getByTestId(TEST_IDS.FromTermsRemoveAllButton)).toBeInTheDocument();

      // Map to terms and bottom elements
      expect(screen.queryByTestId(TEST_IDS.MapToTermsInput)).not.toBeInTheDocument();
      expect(screen.queryByTestId(TEST_IDS.HasChangesBadge)).not.toBeInTheDocument();
      expect(screen.getByTestId(TEST_IDS.ResetChangesButton)).toBeDisabled();
      expect(screen.getByTestId(TEST_IDS.SaveChangesButton)).toBeDisabled();
    });
    it('should render the flyout for explicit synonyms', () => {
      render(
        <Wrapper>
          <SynonymRuleFlyout
            onClose={onCloseMock}
            flyoutMode={'create'}
            synonymsRule={{
              id: 'generated-id',
              synonyms: '',
            }}
            renderExplicit={true}
            synonymsSetId="my_synonyms_set"
          />
        </Wrapper>
      );
      // Header
      expect(screen.queryByTestId(TEST_IDS.RuleIdText)).toBeInTheDocument();
      expect(screen.queryByTestId(TEST_IDS.ErrorBanner)).not.toBeInTheDocument();

      // From terms
      expect(screen.getByTestId(TEST_IDS.NoTermsText).textContent).toBe('No terms found.');
      expect(screen.getByTestId(TEST_IDS.FromTermCountLabel).textContent).toBe('0 term');
      expect(screen.getByTestId(TEST_IDS.FromTermsSortAZButton)).toBeInTheDocument();
      expect(screen.getByTestId(TEST_IDS.FromTermsRemoveAllButton)).toBeInTheDocument();

      // Map to terms and bottom elements
      expect(screen.getByTestId(TEST_IDS.MapToTermsInput)).toBeInTheDocument();
      expect(screen.queryByTestId(TEST_IDS.HasChangesBadge)).not.toBeInTheDocument();
      expect(screen.getByTestId(TEST_IDS.ResetChangesButton)).toBeDisabled();
      expect(screen.getByTestId(TEST_IDS.SaveChangesButton)).toBeDisabled();
    });

    it('should call backend with correct payload for equivalent synonyms', () => {
      render(
        <Wrapper>
          <SynonymRuleFlyout
            onClose={onCloseMock}
            flyoutMode={'create'}
            synonymsRule={{
              id: 'generated-id',
              synonyms: '',
            }}
            renderExplicit={false}
            synonymsSetId="my_synonyms_set"
          />
        </Wrapper>
      );

      expect(screen.getByTestId(TEST_IDS.SaveChangesButton)).toBeDisabled();

      ACTIONS.AddFromTerm('from1');
      expect(screen.getByTestId(TEST_IDS.FromTermCountLabel).textContent).toBe('1 term');
      expect(screen.getByTestId(TEST_IDS.SaveChangesButton)).toBeEnabled();

      ACTIONS.AddFromTerm('from2');
      expect(screen.getByTestId(TEST_IDS.FromTermCountLabel).textContent).toBe('2 terms');

      ACTIONS.PressSaveChangesButton();
      expect(mutateMock).toHaveBeenCalledWith({
        synonymsSetId: 'my_synonyms_set',
        ruleId: 'generated-id',
        synonyms: 'from1,from2',
      });
    });

    it('should call backend with correct payload for explicit synonyms', () => {
      render(
        <Wrapper>
          <SynonymRuleFlyout
            onClose={onCloseMock}
            flyoutMode={'create'}
            synonymsRule={{
              id: 'generated-id',
              synonyms: '',
            }}
            renderExplicit={true}
            synonymsSetId="my_synonyms_set"
          />
        </Wrapper>
      );
      ACTIONS.AddFromTerm('from1');
      expect(screen.getByTestId(TEST_IDS.FromTermCountLabel).textContent).toBe('1 term');
      expect(screen.getByTestId(TEST_IDS.SaveChangesButton)).toBeDisabled();

      ACTIONS.AddMapToTerm('to1');
      expect(screen.getByTestId(TEST_IDS.SaveChangesButton)).toBeEnabled();
      ACTIONS.PressSaveChangesButton();

      expect(mutateMock).toHaveBeenCalledWith({
        synonymsSetId: 'my_synonyms_set',
        ruleId: 'generated-id',
        synonyms: 'from1 => to1',
      });
    });

    it('should sort items in the flyout', () => {
      render(
        <Wrapper>
          <SynonymRuleFlyout
            onClose={onCloseMock}
            flyoutMode={'create'}
            synonymsRule={{
              id: 'generated-id',
              synonyms: '',
            }}
            renderExplicit={false}
            synonymsSetId="my_synonyms_set"
          />
        </Wrapper>
      );
      ACTIONS.AddFromTerm('a');
      ACTIONS.AddFromTerm('b');

      expect(screen.getByTestId(TEST_IDS.FromTermCountLabel).textContent).toBe('2 terms');
      expect(screen.getAllByTestId(TEST_IDS.FromTermBadge)[0].textContent?.trim()).toBe('a');
      expect(screen.getAllByTestId(TEST_IDS.FromTermBadge)[1].textContent?.trim()).toBe('b');
      ACTIONS.PressSortAZButton();

      expect(screen.getAllByTestId(TEST_IDS.FromTermBadge)[0].textContent?.trim()).toBe('b');
      expect(screen.getAllByTestId(TEST_IDS.FromTermBadge)[1].textContent?.trim()).toBe('a');
      ACTIONS.PressSortAZButton();
      expect(screen.getAllByTestId(TEST_IDS.FromTermBadge)[0].textContent?.trim()).toBe('a');
      expect(screen.getAllByTestId(TEST_IDS.FromTermBadge)[1].textContent?.trim()).toBe('b');
    });
  });

  describe('edit mode', () => {
    it('should render the flyout for equivalent synonyms', () => {
      render(
        <Wrapper>
          <SynonymRuleFlyout
            onClose={onCloseMock}
            flyoutMode={'edit'}
            synonymsRule={{
              id: 'rule_id_3',
              synonyms: 'synonym1,synonym2',
            }}
            renderExplicit={false}
            synonymsSetId="my_synonyms_set"
          />
        </Wrapper>
      );
      // Header
      expect(screen.getByTestId(TEST_IDS.RuleIdText).textContent).toBe('Rule ID: rule_id_3');
      expect(screen.queryByTestId(TEST_IDS.ErrorBanner)).not.toBeInTheDocument();

      // From terms
      expect(screen.queryByTestId(TEST_IDS.NoTermsText)).not.toBeInTheDocument();
      expect(screen.getByTestId(TEST_IDS.FromTermCountLabel).textContent).toBe('2 terms');
      expect(screen.getAllByTestId(TEST_IDS.FromTermBadge)[0].textContent?.trim()).toBe('synonym1');
      expect(screen.getAllByTestId(TEST_IDS.FromTermBadge)[1].textContent?.trim()).toBe('synonym2');
      expect(screen.getByTestId(TEST_IDS.FromTermsSortAZButton)).toBeInTheDocument();
      expect(screen.getByTestId(TEST_IDS.FromTermsRemoveAllButton)).toBeInTheDocument();

      // Map to terms and bottom elements
      expect(screen.queryByTestId(TEST_IDS.MapToTermsInput)).not.toBeInTheDocument();
      expect(screen.queryByTestId(TEST_IDS.HasChangesBadge)).not.toBeInTheDocument();
      expect(screen.getByTestId(TEST_IDS.ResetChangesButton)).toBeDisabled();
      expect(screen.getByTestId(TEST_IDS.SaveChangesButton)).toBeDisabled();
    });

    it('should call backend with correct payload for equivalent synonyms', () => {
      render(
        <Wrapper>
          <SynonymRuleFlyout
            onClose={onCloseMock}
            flyoutMode={'edit'}
            synonymsRule={{
              id: 'rule_id_3',
              synonyms: 'synonym1,synonym2',
            }}
            renderExplicit={false}
            synonymsSetId="my_synonyms_set"
          />
        </Wrapper>
      );

      expect(screen.getByTestId(TEST_IDS.SaveChangesButton)).toBeDisabled();
      ACTIONS.AddFromTerm('synonym3');
      expect(screen.getByTestId(TEST_IDS.SaveChangesButton)).toBeEnabled();
      expect(screen.getByTestId(TEST_IDS.FromTermCountLabel).textContent).toBe('3 terms');

      ACTIONS.PressSaveChangesButton();
      expect(mutateMock).toHaveBeenCalledWith({
        synonymsSetId: 'my_synonyms_set',
        ruleId: 'rule_id_3',
        synonyms: 'synonym1,synonym2,synonym3',
      });
    });

    it('should render the flyout for explicit synonyms', () => {
      render(
        <Wrapper>
          <SynonymRuleFlyout
            onClose={onCloseMock}
            flyoutMode={'edit'}
            synonymsRule={{
              id: 'rule_id_3',
              synonyms: 'explicit-from => explicit-to',
            }}
            renderExplicit={true}
            synonymsSetId="my_synonyms_set"
          />
        </Wrapper>
      );
      // Header
      expect(screen.getByTestId(TEST_IDS.RuleIdText).textContent).toBe('Rule ID: rule_id_3');
      expect(screen.queryByTestId(TEST_IDS.ErrorBanner)).not.toBeInTheDocument();

      // From terms
      expect(screen.queryByTestId(TEST_IDS.NoTermsText)).not.toBeInTheDocument();
      expect(screen.getByTestId(TEST_IDS.FromTermCountLabel).textContent).toBe('1 term');
      expect(screen.getByTestId(TEST_IDS.FromTermBadge).textContent?.trim()).toBe('explicit-from');
      expect(screen.getByTestId(TEST_IDS.FromTermsSortAZButton)).toBeInTheDocument();
      expect(screen.getByTestId(TEST_IDS.FromTermsRemoveAllButton)).toBeInTheDocument();

      // Map to terms and bottom elements
      expect(screen.getByTestId(TEST_IDS.MapToTermsInput)).toBeInTheDocument();
      expect(screen.getByTestId(TEST_IDS.MapToTermsInput)).toHaveValue('explicit-to');
      expect(screen.queryByTestId(TEST_IDS.HasChangesBadge)).not.toBeInTheDocument();
      expect(screen.getByTestId(TEST_IDS.ResetChangesButton)).toBeDisabled();
      expect(screen.getByTestId(TEST_IDS.SaveChangesButton)).toBeDisabled();
    });
    it('should call backend with correct payload for explicit synonyms', () => {
      render(
        <Wrapper>
          <SynonymRuleFlyout
            onClose={onCloseMock}
            flyoutMode={'edit'}
            synonymsRule={{
              id: 'rule_id_3',
              synonyms: 'explicit-from => explicit-to',
            }}
            renderExplicit={true}
            synonymsSetId="my_synonyms_set"
          />
        </Wrapper>
      );

      expect(screen.getByTestId(TEST_IDS.SaveChangesButton)).toBeDisabled();
      ACTIONS.AddMapToTerm('explicit-to-2');
      expect(screen.getByTestId(TEST_IDS.SaveChangesButton)).toBeEnabled();
      ACTIONS.PressSaveChangesButton();

      expect(mutateMock).toHaveBeenCalledWith({
        synonymsSetId: 'my_synonyms_set',
        ruleId: 'rule_id_3',
        synonyms: 'explicit-from => explicit-to-2',
      });
    });
  });
});
