/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChangeEvent } from 'react';
import React, { useEffect } from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { Type as RuleType } from '@kbn/securitysolution-io-ts-alerting-types';
import type { DataViewBase } from '@kbn/es-query';
import type { FieldSpec } from '@kbn/data-plugin/common';
import type { StepDefineRuleProps } from '..';
import { StepDefineRule } from '..';
import { mockBrowserFields } from '../../../../../common/containers/source/mock';
import { useRuleFromTimeline } from '../../../../../detections/hooks/use_rule_from_timeline';
import { TestProviders } from '../../../../../common/mock';
import { schema as defineRuleSchema } from '../schema';
import { stepDefineDefaultValue } from '../../../../common/utils';
import type { FormSubmitHandler } from '../../../../../shared_imports';
import { useForm } from '../../../../../shared_imports';
import type { DefineStepRule } from '../../../../common/types';
import { fleetIntegrationsApi } from '../../../../fleet_integrations/api/__mocks__';
import {
  addRequiredFieldRow,
  createIndexPatternField,
  getSelectToggleButtonForName,
} from '../../../../rule_creation/components/required_fields/required_fields.test_helpers';
import { ALERT_SUPPRESSION_FIELDS_FIELD_NAME } from '../../../../rule_creation/components/alert_suppression_edit';
import {
  expectDuration,
  expectSuppressionFields,
  setDuration,
  setDurationType,
  setSuppressionFields,
} from '../../../../rule_creation/components/alert_suppression_edit/test_helpers';
import {
  selectEuiComboBoxOption,
  selectFirstEuiComboBoxOption,
} from '../../../../../common/test/eui/combobox';
import {
  addRelatedIntegrationRow,
  setVersion,
} from '../../../../rule_creation/components/related_integrations/test_helpers';
import { useEsqlAvailability } from '../../../../../common/hooks/esql/use_esql_availability';
import { useMLRuleConfig } from '../../../../../common/components/ml/hooks/use_ml_rule_config';
import { useUserPrivileges } from '../../../../../common/components/user_privileges';

// Set the extended default timeout for all define rule step form test
jest.setTimeout(10 * 1000);

// Mocks integrations
jest.mock('../../../../fleet_integrations/api');

const MOCKED_QUERY_BAR_TEST_ID = 'mockedQueryBar';
const MOCKED_LANGUAGE_INPUT_TEST_ID = 'languageInput';

// Mocking QueryBar to avoid pulling and mocking a ton of dependencies
jest.mock('../../../../../common/components/query_bar', () => {
  return {
    QueryBar: jest.fn().mockImplementation(({ filterQuery, onSubmitQuery }) => {
      const handleQueryChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
        onSubmitQuery({ query: event.target.value, language: filterQuery.language });
      };

      const handleLanguageChange = (event: ChangeEvent<HTMLInputElement>) => {
        onSubmitQuery({ query: filterQuery.query, language: event.target.value });
      };

      return (
        <div data-test-subj={MOCKED_QUERY_BAR_TEST_ID}>
          <textarea value={filterQuery.query} onChange={handleQueryChange} />
          <input
            // Language selector is an expandable menu in the real component.
            // Here we set some role distinguished from `textbox` to match the real
            // behavior when there is a single role="textbox" input in the QueryBar
            role="searchbox"
            type="text"
            value={filterQuery.language}
            onChange={handleLanguageChange}
            data-test-subj={MOCKED_LANGUAGE_INPUT_TEST_ID}
          />
        </div>
      );
    }),
  };
});

jest.mock('../../../../rule_creation/components/pick_timeline', () => ({
  PickTimeline: 'pick-timeline',
}));

jest.mock('../../ai_assistant', () => {
  return {
    AiAssistant: jest.fn(() => {
      return <div data-test-subj="ai-assistant" />;
    }),
  };
});

jest.mock('../../data_view_selector_field/use_data_view_list_items');

jest.mock('../../../../../common/hooks/use_license', () => ({
  useLicense: jest.fn().mockReturnValue({
    isAtLeast: jest.fn().mockReturnValue(true),
  }),
}));

const mockRedirectLegacyUrl = jest.fn();
const mockGetLegacyUrlConflict = jest.fn();
jest.mock('../../../../../common/lib/kibana', () => {
  const originalModule = jest.requireActual('../../../../../common/lib/kibana');

  return {
    ...originalModule,
    useToasts: jest.fn().mockReturnValue({
      addError: jest.fn(),
      addSuccess: jest.fn(),
      addWarning: jest.fn(),
      addInfo: jest.fn(),
      remove: jest.fn(),
    }),
    useKibana: () => {
      return {
        services: {
          ...originalModule.useKibana().services,
          storage: {
            get: jest.fn().mockReturnValue(true),
          },
          application: {
            getUrlForApp: (appId: string, options?: { path?: string }) =>
              `/app/${appId}${options?.path}`,
            navigateToApp: jest.fn(),
            capabilities: {
              actions: {
                delete: true,
                save: true,
                show: true,
              },
            },
          },
          data: {
            search: {
              search: () => ({
                subscribe: () => ({
                  unsubscribe: jest.fn(),
                }),
              }),
            },
          },
          spaces: {
            ui: {
              components: { getLegacyUrlConflict: mockGetLegacyUrlConflict },
              redirectLegacyUrl: mockRedirectLegacyUrl,
            },
          },
        },
      };
    },
  };
});
jest.mock('../../../../../common/hooks/use_selector', () => {
  const actual = jest.requireActual('../../../../../common/hooks/use_selector');
  return {
    ...actual,
    useDeepEqualSelector: () => ({
      kibanaDataViews: [{ id: 'world' }],
      sourcererScope: 'my-selected-dataview-id',
      selectedDataView: {
        id: 'security-solution',
        browserFields: mockBrowserFields,
        patternList: [],
      },
    }),
  };
});
jest.mock('../../../../../common/components/link_to', () => {
  const originalModule = jest.requireActual('../../../../../common/components/link_to');
  return {
    ...originalModule,
    getTimelineUrl: jest.fn(),
    useFormatUrl: jest.fn().mockReturnValue({
      formatUrl: jest.fn().mockImplementation((path: string) => path),
    }),
  };
});
jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return { ...actual, useLocation: jest.fn().mockReturnValue({ pathname: '/alerts' }) };
});

jest.mock('react-redux', () => {
  const original = jest.requireActual('react-redux');

  return {
    ...original,
    useDispatch: jest.fn(),
  };
});

jest.mock('../../../../../detections/hooks/use_rule_from_timeline');

jest.mock('../../../../../common/hooks/esql/use_esql_availability');
jest.mock('../../../../../common/components/ml/hooks/use_ml_rule_config');
jest.mock('../../../../../common/components/user_privileges');

const mockUseRuleFromTimeline = useRuleFromTimeline as jest.Mock;
const onOpenTimeline = jest.fn();

const COMBO_BOX_TOGGLE_BUTTON_TEST_ID = 'comboBoxToggleListButton';
const VERSION_INPUT_TEST_ID = 'relatedIntegrationVersionDependency';
const DEFINE_RULE_FORM_STEP = 'defineRuleFormStepQueryEditor';

describe('StepDefineRule', () => {
  beforeEach(() => {
    mockUseRuleFromTimeline.mockReturnValue({ onOpenTimeline, loading: false });
    (useEsqlAvailability as jest.Mock).mockReturnValue({ isEsqlRuleTypeEnabled: true });
    (useMLRuleConfig as jest.Mock).mockReturnValue({
      allJobsStarted: true,
      hasMlAdminPermissions: true,
      hasMlLicense: true,
      loading: false,
      mlSuppressionFields: [],
    });
    (useUserPrivileges as jest.Mock).mockReturnValue({
      timelinePrivileges: { read: true },
    });
  });

  it('renders correctly', () => {
    render(<TestForm />, {
      wrapper: TestProviders,
    });

    expect(screen.getByTestId('stepDefineRule')).toBeDefined();
  });

  describe('query', () => {
    it.each([
      ['query', 'eql'],
      ['query', 'esql'],
    ] as RuleType[][])(
      'persists kuery when switching between "%s" and "%s" rule types',
      async (ruleTypeA, ruleTypeB) => {
        render(<TestForm />, {
          wrapper: TestProviders,
        });

        typeQuery('someField : *');
        selectQueryLanguage('kuery');

        expectQuery(DEFINE_RULE_FORM_STEP, 'someField : *');

        await selectRuleType(ruleTypeB);

        expectQuery(DEFINE_RULE_FORM_STEP, '');

        await selectRuleType(ruleTypeA);

        expectQuery(DEFINE_RULE_FORM_STEP, 'someField : *');
      }
    );

    it.each([
      ['query', 'threshold'],
      ['query', 'new_terms'],
    ] as RuleType[][])(
      'persists kuery when switching between "%s" and "%s" rule types',
      async (ruleTypeA, ruleTypeB) => {
        render(<TestForm />, {
          wrapper: TestProviders,
        });

        typeQuery('someField : *');
        selectQueryLanguage('kuery');

        expectQuery(DEFINE_RULE_FORM_STEP, 'someField : *');

        await selectRuleType(ruleTypeB);

        expectQuery(DEFINE_RULE_FORM_STEP, 'someField : *');

        await selectRuleType(ruleTypeA);

        expectQuery(DEFINE_RULE_FORM_STEP, 'someField : *');
      }
    );

    it.each([['query'], ['threshold'], ['threat_match'], ['new_terms']] as RuleType[][])(
      'persists kuery when switching between "%s" and "threat_match"  rule types',
      async (ruleType) => {
        render(<TestForm />, {
          wrapper: TestProviders,
        });
        await selectRuleType(ruleType);
        typeQuery('someField : *');

        expectQuery(DEFINE_RULE_FORM_STEP, 'someField : *');

        await selectRuleType('threat_match');

        expectQuery(DEFINE_RULE_FORM_STEP, 'someField : *');

        await selectRuleType(ruleType);

        expectQuery(DEFINE_RULE_FORM_STEP, 'someField : *');
      }
    );

    it.each([['query'], ['esql'], ['threshold'], ['new_terms']] as RuleType[][])(
      'persists EQL query when switching between "eql" and "%s" rule types',
      async (switchRuleType) => {
        render(<TestForm />, {
          wrapper: TestProviders,
        });

        await selectRuleType('eql');
        typeQuery('process where process.name == "regsvr32.exe"');

        expectQuery(DEFINE_RULE_FORM_STEP, 'process where process.name == "regsvr32.exe"');

        await selectRuleType(switchRuleType);

        expectQuery(DEFINE_RULE_FORM_STEP, '');

        await selectRuleType('eql');

        expectQuery(DEFINE_RULE_FORM_STEP, 'process where process.name == "regsvr32.exe"');
      }
    );

    it.each([['query'], ['eql'], ['threshold'], ['new_terms']] as RuleType[][])(
      'persists ES|QL query when switching between "esql" and "%s" rule types',
      async (switchRuleType) => {
        render(<TestForm />, {
          wrapper: TestProviders,
        });
        await selectRuleType('esql');
        typeQuery('from test*');

        expectQuery(DEFINE_RULE_FORM_STEP, 'from test*');

        await selectRuleType(switchRuleType);

        expectQuery(DEFINE_RULE_FORM_STEP, '');

        await selectRuleType('esql');

        expectQuery(DEFINE_RULE_FORM_STEP, 'from test*');
      }
    );

    it('makes sure "threat_match" rule has "*:*" kuery by default', async () => {
      render(<TestForm />, {
        wrapper: TestProviders,
      });
      await selectRuleType('threat_match');

      expectQuery(DEFINE_RULE_FORM_STEP, '*:*');
    });

    it.each([['query'], ['eql'], ['esql'], ['threshold'], ['new_terms']] as RuleType[][])(
      'makes sure "threat_match" rule has "*:*" kuery when switched from "%s" rule type without user input',
      async (ruleType) => {
        render(<TestForm />, {
          wrapper: TestProviders,
        });
        await selectRuleType(ruleType);

        expectQuery(DEFINE_RULE_FORM_STEP, '');

        await selectRuleType('threat_match');

        expectQuery(DEFINE_RULE_FORM_STEP, '*:*');

        await selectRuleType(ruleType);

        expectQuery(DEFINE_RULE_FORM_STEP, '');
      }
    );
  });

  describe('alert suppression', () => {
    it('persists state when switching between custom query and threshold rule types', async () => {
      const mockFields: FieldSpec[] = [
        {
          name: 'test-field',
          type: 'string',
          searchable: false,
          aggregatable: true,
        },
      ];

      render(
        <TestForm
          indexPattern={{
            title: '',
            fields: mockFields,
          }}
        />,
        {
          wrapper: TestProviders,
        }
      );

      await setSuppressionFields(['test-field']);
      setDurationType('Per time period');
      setDuration(10, 'h');

      await selectRuleType('threshold');

      expectDuration(10, 'h');

      await selectRuleType('query');

      expectSuppressionFields(['test-field']);
      expectDuration(10, 'h');
    });
  });

  describe('related integrations', () => {
    beforeEach(() => {
      fleetIntegrationsApi.fetchAllIntegrations.mockResolvedValue({
        integrations: [
          {
            package_name: 'package-a',
            package_title: 'Package A',
            latest_package_version: '1.0.0',
            is_installed: false,
            is_enabled: false,
          },
        ],
      });
    });

    it('submits form without selected related integrations', async () => {
      const initialState = {
        index: ['test-index'],
        queryBar: {
          query: { query: '*:*', language: 'kuery' },
          filters: [],
          saved_id: null,
        },
      };
      const handleSubmit = jest.fn();

      render(<TestForm initialState={initialState} onSubmit={handleSubmit} />, {
        wrapper: TestProviders,
      });

      await submitForm();
      await waitFor(() => {
        expect(handleSubmit).toHaveBeenCalled();
      });

      expect(handleSubmit).toHaveBeenCalledWith(
        expect.not.objectContaining({
          relatedIntegrations: expect.anything(),
        }),
        true
      );
    });

    it('submits saved early related integrations', async () => {
      const initialState = {
        index: ['test-index'],
        queryBar: {
          query: { query: '*:*', language: 'kuery' },
          filters: [],
          saved_id: null,
        },
        relatedIntegrations: [
          { package: 'package-a', version: '1.2.3' },
          { package: 'package-b', integration: 'integration-a', version: '3.2.1' },
        ],
      };
      const handleSubmit = jest.fn();

      render(<TestForm initialState={initialState} onSubmit={handleSubmit} />, {
        wrapper: TestProviders,
      });

      await submitForm();
      await waitFor(() => {
        expect(handleSubmit).toHaveBeenCalled();
      });

      expect(handleSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          relatedIntegrations: [
            { package: 'package-a', version: '1.2.3' },
            { package: 'package-b', integration: 'integration-a', version: '3.2.1' },
          ],
        }),
        true
      );
    });

    it('submits a selected related integration', async () => {
      const initialState = {
        index: ['test-index'],
        queryBar: {
          query: { query: '*:*', language: 'kuery' },
          filters: [],
          saved_id: null,
        },
        relatedIntegrations: undefined,
      };
      const handleSubmit = jest.fn();

      render(<TestForm initialState={initialState} onSubmit={handleSubmit} />, {
        wrapper: TestProviders,
      });

      await addRelatedIntegrationRow();
      await selectEuiComboBoxOption({
        comboBoxToggleButton: within(screen.getByTestId('relatedIntegrations')).getByTestId(
          COMBO_BOX_TOGGLE_BUTTON_TEST_ID
        ),
        optionIndex: 0,
      });
      await setVersion({ input: screen.getByTestId(VERSION_INPUT_TEST_ID), value: '1.2.3' });

      await submitForm();
      await waitFor(() => {
        expect(handleSubmit).toHaveBeenCalled();
      });

      expect(handleSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          relatedIntegrations: [{ package: 'package-a', version: '1.2.3' }],
        }),
        true
      );
    });
  });

  describe('required fields', () => {
    it('submits a form without selected required fields', async () => {
      const initialState = {
        index: ['test-index'],
        queryBar: {
          query: { query: '*:*', language: 'kuery' },
          filters: [],
          saved_id: null,
        },
      };
      const handleSubmit = jest.fn();

      render(<TestForm initialState={initialState} onSubmit={handleSubmit} />, {
        wrapper: TestProviders,
      });

      await submitForm();

      await waitFor(() => {
        expect(handleSubmit).toHaveBeenCalled();
      });

      expect(handleSubmit).toHaveBeenCalledWith(
        expect.not.objectContaining({
          requiredFields: expect.anything(),
        }),
        true
      );
    });

    it('submits saved earlier required fields', async () => {
      const initialState = {
        index: ['test-index'],
        queryBar: {
          query: { query: '*:*', language: 'kuery' },
          filters: [],
          saved_id: null,
        },
        requiredFields: [{ name: 'host.name', type: 'string', ecs: false }],
      };

      const handleSubmit = jest.fn();

      render(<TestForm initialState={initialState} onSubmit={handleSubmit} />, {
        wrapper: TestProviders,
      });

      await submitForm();

      await waitFor(() => {
        expect(handleSubmit).toHaveBeenCalled();
      });

      expect(handleSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          requiredFields: initialState.requiredFields,
        }),
        true
      );
    });

    it('submits newly added required fields', async () => {
      const initialState = {
        index: ['test-index'],
        queryBar: {
          query: { query: '*:*', language: 'kuery' },
          filters: [],
          saved_id: null,
        },
      };

      const indexPattern: DataViewBase = {
        fields: [createIndexPatternField({ name: 'host.name', esTypes: ['string'] })],
        title: '',
      };

      const handleSubmit = jest.fn();

      render(
        <TestForm
          initialState={initialState}
          indexPattern={indexPattern}
          onSubmit={handleSubmit}
        />,
        {
          wrapper: TestProviders,
        }
      );

      await addRequiredFieldRow();

      await selectFirstEuiComboBoxOption({
        comboBoxToggleButton: getSelectToggleButtonForName('empty'),
      });

      await submitForm();

      await waitFor(() => {
        expect(handleSubmit).toHaveBeenCalled();
      });

      expect(handleSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          requiredFields: [{ name: 'host.name', type: 'string' }],
        }),
        true
      );
    });
  });

  describe('handleSetRuleFromTimeline', () => {
    it('updates KQL query correctly', () => {
      const timelineKqlQuery = {
        index: ['.alerts-security.alerts-default', 'logs-*', 'packetbeat-*'],
        queryBar: {
          filters: [],
          query: {
            query: 'host.name:*',
            language: 'kuery',
          },
          saved_id: null,
        },
      };

      mockUseRuleFromTimeline.mockImplementation((handleSetRuleFromTimeline) => {
        useEffect(() => {
          handleSetRuleFromTimeline(timelineKqlQuery);
        }, [handleSetRuleFromTimeline]);

        return { onOpenTimeline, loading: false };
      });

      render(<TestForm />, {
        wrapper: TestProviders,
      });

      expectQuery(DEFINE_RULE_FORM_STEP, timelineKqlQuery.queryBar.query.query);
      expectQueryLanguage(DEFINE_RULE_FORM_STEP, timelineKqlQuery.queryBar.query.language);
    });

    it('updates EQL query correctly', async () => {
      jest.useFakeTimers();

      const timelineEqlQuery = {
        index: ['.alerts-security.alerts-default', 'logs-*', 'packetbeat-*'],
        queryBar: {
          filters: [],
          query: {
            query: 'process where true',
            language: 'eql',
          },
          saved_id: null,
        },
        eqlOptions: {
          eventCategoryField: 'cool.field',
          tiebreakerField: 'another.field',
          timestampField: 'cool.@timestamp',
          query: 'process where true',
          size: 77,
        },
      };

      const setRuleFromTimelineFactory =
        (handleSetRuleFromTimeline: (value: unknown) => void) => async () =>
          act(async () => handleSetRuleFromTimeline(timelineEqlQuery));

      let setRuleFromTimeline!: () => void;

      mockUseRuleFromTimeline.mockImplementation((handleSetRuleFromTimeline) => {
        setRuleFromTimeline = setRuleFromTimelineFactory(handleSetRuleFromTimeline);

        return { onOpenTimeline, loading: false };
      });

      render(<TestForm />, {
        wrapper: TestProviders,
      });

      await setRuleFromTimeline();

      jest.runAllTimers();

      expect(screen.getByTestId('eqlQueryBarTextInput')).toHaveValue(
        timelineEqlQuery.queryBar.query.query
      );

      await act(async () => {
        fireEvent.click(screen.getByTestId('eql-settings-trigger'));
      });

      expect(
        within(screen.getByTestId('eql-event-category-field')).queryByRole('combobox')
      ).toHaveValue(timelineEqlQuery.eqlOptions.eventCategoryField);

      expect(
        within(screen.getByTestId('eql-tiebreaker-field')).queryByRole('combobox')
      ).toHaveValue(timelineEqlQuery.eqlOptions.tiebreakerField);

      expect(within(screen.getByTestId('eql-timestamp-field')).queryByRole('combobox')).toHaveValue(
        timelineEqlQuery.eqlOptions.timestampField
      );
    });
  });

  describe('AI assistant', () => {
    it('renders assistant when query is not valid and not empty', () => {
      const initialState = {
        queryBar: {
          query: { query: '*:*', language: 'kuery' },
          filters: [],
          saved_id: null,
        },
      };
      render(<TestForm formProps={{ isQueryBarValid: false }} initialState={initialState} />, {
        wrapper: TestProviders,
      });

      expect(screen.getByTestId('ai-assistant')).toBeInTheDocument();
    });

    it('does not render assistant when query is not valid and empty', () => {
      const initialState = {
        queryBar: {
          query: { query: '', language: 'kuery' },
          filters: [],
          saved_id: null,
        },
      };
      render(<TestForm formProps={{ isQueryBarValid: false }} initialState={initialState} />, {
        wrapper: TestProviders,
      });

      expect(screen.queryByTestId('ai-assistant')).toBe(null);
    });

    it('does not render assistant when query is valid', () => {
      render(<TestForm formProps={{ isQueryBarValid: true }} />, {
        wrapper: TestProviders,
      });

      expect(screen.queryByTestId('ai-assistant')).toBe(null);
    });

    it('does not render assistant for ML rule type', async () => {
      render(<TestForm formProps={{ isQueryBarValid: false }} />, {
        wrapper: TestProviders,
      });
      await selectRuleType('machine_learning');

      expect(screen.queryByTestId('ai-assistant')).toBe(null);
    });
  });

  describe('query validation', () => {
    describe('Query rule', () => {
      it('shows query is required when filters and query empty', async () => {
        const initialState = {
          queryBar: {
            query: { query: '', language: 'kuery' },
            filters: [],
            saved_id: null,
          },
        };
        render(<TestForm formProps={{ isQueryBarValid: false }} initialState={initialState} />, {
          wrapper: TestProviders,
        });

        await submitForm();

        await waitFor(() => {
          expect(screen.getByTestId('detectionEngineStepDefineRuleQueryBar')).toHaveTextContent(
            'A custom query is required'
          );
        });
      });

      it('does not show query is required when filters not empty and query empty', async () => {
        const initialState = {
          queryBar: {
            query: { query: '', language: 'kuery' },
            filters: [
              {
                meta: {},
                query: {
                  exists: {
                    field: '_index',
                  },
                },
              },
            ],
            saved_id: null,
          },
        };
        render(<TestForm formProps={{ isQueryBarValid: false }} initialState={initialState} />, {
          wrapper: TestProviders,
        });

        await submitForm();

        await expect(
          waitFor(() => {
            expect(screen.getByTestId('detectionEngineStepDefineRuleQueryBar')).toHaveTextContent(
              'A custom query is required'
            );
          })
        ).rejects.toThrow();
      });
    });

    describe('ES|QL rule', () => {
      it('shows ES|QL query is required when it is empty', async () => {
        const initialState = {
          queryBar: {
            query: { query: '', language: 'esql' },
            filters: [],
            saved_id: null,
          },
          ruleType: 'esql' as const,
        };
        render(<TestForm formProps={{ isQueryBarValid: false }} initialState={initialState} />, {
          wrapper: TestProviders,
        });

        await submitForm();

        await waitFor(() => {
          expect(screen.getByTestId('ruleEsqlQueryBar')).toHaveTextContent(
            'ES|QL query is required'
          );
        });
      });

      it('does not show ES|QL query is required when it is not empty', async () => {
        const initialState = {
          queryBar: {
            query: { query: 'from my_index metadata _id', language: 'esql' },
            filters: [],
            saved_id: null,
          },
          ruleType: 'esql' as const,
        };
        render(<TestForm formProps={{ isQueryBarValid: false }} initialState={initialState} />, {
          wrapper: TestProviders,
        });

        await submitForm();

        await expect(
          waitFor(() => {
            expect(screen.getByTestId('ruleEsqlQueryBar')).toHaveTextContent(
              'ES|QL query is required'
            );
          })
        ).rejects.toThrow();
      });
    });

    describe('EQL rule', () => {
      it('shows EQL query is required when it is empty', async () => {
        const initialState = {
          queryBar: {
            query: { query: '', language: 'eql' },
            filters: [],
            saved_id: null,
          },
          ruleType: 'eql' as const,
        };
        render(<TestForm formProps={{ isQueryBarValid: false }} initialState={initialState} />, {
          wrapper: TestProviders,
        });

        await submitForm();

        await waitFor(() => {
          expect(screen.getByTestId('ruleEqlQueryBar')).toHaveTextContent('EQL query is required');
        });
      });

      it('shows EQL query is required when query empty, but filters non-empty', async () => {
        const initialState = {
          queryBar: {
            query: { query: '', language: 'eql' },
            filters: [
              {
                meta: {},
                query: {
                  exists: {
                    field: '_index',
                  },
                },
              },
            ],
            saved_id: null,
          },
          ruleType: 'eql' as const,
        };
        render(<TestForm formProps={{ isQueryBarValid: false }} initialState={initialState} />, {
          wrapper: TestProviders,
        });

        await submitForm();

        await waitFor(() => {
          expect(screen.getByTestId('ruleEqlQueryBar')).toHaveTextContent('EQL query is required');
        });
      });

      it('does not show EQL query is required when it is not empty', async () => {
        const initialState = {
          queryBar: {
            query: { query: 'any where true', language: 'eql' },
            filters: [],
            saved_id: null,
          },
          ruleType: 'eql' as const,
        };
        render(<TestForm formProps={{ isQueryBarValid: false }} initialState={initialState} />, {
          wrapper: TestProviders,
        });

        await submitForm();

        await expect(
          waitFor(() => {
            expect(screen.getByTestId('detectionEngineStepDefineRuleQueryBar')).toHaveTextContent(
              'EQL query is required'
            );
          })
        ).rejects.toThrow();
      });
    });
  });
});

interface TestFormProps {
  initialState?: Partial<DefineStepRule>;
  indexPattern?: DataViewBase;
  onSubmit?: FormSubmitHandler<DefineStepRule>;
  formProps?: Partial<StepDefineRuleProps>;
}

function TestForm({
  initialState,
  indexPattern = { fields: [], title: '' },
  onSubmit,
  formProps,
}: TestFormProps): JSX.Element {
  const { form } = useForm({
    options: { stripEmptyFields: false },
    schema: defineRuleSchema,
    defaultValue: { ...stepDefineDefaultValue, ...initialState },
    onSubmit,
  });

  return (
    <>
      <StepDefineRule
        isLoading={false}
        form={form}
        indicesConfig={[]}
        indexPattern={indexPattern}
        isIndexPatternLoading={false}
        isQueryBarValid={true}
        setIsQueryBarValid={jest.fn()}
        index={stepDefineDefaultValue.index}
        threatIndex={stepDefineDefaultValue.threatIndex}
        alertSuppressionFields={stepDefineDefaultValue[ALERT_SUPPRESSION_FIELDS_FIELD_NAME]}
        dataSourceType={stepDefineDefaultValue.dataSourceType}
        shouldLoadQueryDynamically={stepDefineDefaultValue.shouldLoadQueryDynamically}
        queryBarTitle=""
        queryBarSavedId=""
        {...formProps}
      />
      <button type="button" onClick={form.submit}>
        {'Submit'}
      </button>
    </>
  );
}

function submitForm(): Promise<void> {
  return act(async () => {
    fireEvent.click(screen.getByText('Submit'));
  });
}

function typeQuery(query: string): void {
  act(() => {
    fireEvent.input(within(screen.getByTestId(DEFINE_RULE_FORM_STEP)).getByRole('textbox'), {
      target: { value: query },
    });
  });
}

function expectQuery(containerTestId: string, expectedQuery: string): void {
  expect(within(screen.getByTestId(containerTestId)).getByRole('textbox')).toHaveValue(
    expectedQuery
  );
}

function selectQueryLanguage(language: 'kuery' | 'eql' | 'esql'): void {
  act(() => {
    fireEvent.input(
      within(screen.getByTestId(DEFINE_RULE_FORM_STEP)).getByTestId(MOCKED_LANGUAGE_INPUT_TEST_ID),
      {
        target: { value: language },
      }
    );
  });
}

function expectQueryLanguage(containerTestId: string, expectedLanguage: string): void {
  expect(
    within(screen.getByTestId(containerTestId)).getByTestId(MOCKED_LANGUAGE_INPUT_TEST_ID)
  ).toHaveValue(expectedLanguage);
}

async function selectRuleType(ruleType: RuleType): Promise<void> {
  const testId = RULE_TYPE_TEST_ID_MAP[ruleType];

  await act(async () => fireEvent.click(screen.getByTestId(testId)));

  expect(within(screen.getByTestId(testId)).getByRole('switch')).toBeChecked();
}

const RULE_TYPE_TEST_ID_MAP = {
  query: 'customRuleType',
  saved_query: 'customRuleType',
  eql: 'eqlRuleType',
  machine_learning: 'machineLearningRuleType',
  threshold: 'thresholdRuleType',
  threat_match: 'threatMatchRuleType',
  new_terms: 'newTermsRuleType',
  esql: 'esqlRuleType',
};
