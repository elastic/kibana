/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { DataViewBase } from '@kbn/es-query';
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
import { createIndexPatternField } from '../../../../rule_creation/components/required_fields/required_fields.test_helpers';
import { ALERT_SUPPRESSION_FIELDS_FIELD_NAME } from '../../../../rule_creation/components/alert_suppression_edit';
import { useEsqlAvailability } from '../../../../../common/hooks/esql/use_esql_availability';
import { useMLRuleConfig } from '../../../../../common/components/ml/hooks/use_ml_rule_config';
import { useUserPrivileges } from '../../../../../common/components/user_privileges';

// Mocks integrations
jest.mock('../../../../fleet_integrations/api');

// Mocking QueryBar to avoid pulling and mocking a ton of dependencies
jest.mock('../../../../../common/components/query_bar', () => {
  return {
    QueryBar: jest.fn().mockImplementation(({ filterQuery, onSubmitQuery }) => {
      return (
        <div data-test-subj="mockedQueryBar">
          <textarea
            value={filterQuery.query}
            onChange={(event) =>
              onSubmitQuery({ query: event.target.value, language: filterQuery.language })
            }
          />
        </div>
      );
    }),
  };
});

jest.mock('../../../../rule_creation/components/pick_timeline', () => ({
  PickTimeline: 'pick-timeline',
}));

// StepDefineRule fetches threat indicator index fields for validating the
// threat mapping. Mocked here so a threat_match rule can pass validation
// without depending on a real index fields lookup.
jest.mock('../../../../../common/containers/source', () => {
  const actual = jest.requireActual('../../../../../common/containers/source');
  return {
    ...actual,
    useFetchIndex: jest.fn().mockReturnValue([
      false,
      {
        indexPatterns: {
          fields: [{ name: 'host.name', type: 'string', searchable: true, aggregatable: true }],
          title: '',
        },
        browserFields: {},
        indexes: [],
        indexExists: true,
        dataView: undefined,
      },
    ]),
  };
});

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
              components: { getLegacyUrlConflict: jest.fn() },
              redirectLegacyUrl: jest.fn(),
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

/**
 * Focused regression test for https://github.com/elastic/kibana/issues/276203.
 *
 * Kept in its own (unskipped) file rather than in step_define_rule.test.tsx,
 * which is currently `describe.skip`'d for an unrelated timeout flake
 * (https://github.com/elastic/kibana/issues/237924). This mounts the real
 * StepDefineRule form so it verifies the fields actually round-trip through
 * form serialization, not just through hand-built DefineStepRule objects.
 */
describe('StepDefineRule threat_match concurrentSearches/itemsPerSearch (#276203)', () => {
  beforeEach(() => {
    mockUseRuleFromTimeline.mockReturnValue({ onOpenTimeline: jest.fn(), loading: false });
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

  it('submits concurrentSearches and itemsPerSearch when they are set on a threat_match rule', async () => {
    const initialState = {
      ruleType: 'threat_match' as const,
      index: ['test-index'],
      queryBar: {
        query: { query: '*:*', language: 'kuery' },
        filters: [],
        saved_id: null,
      },
      threatIndex: ['threat-index'],
      threatQueryBar: {
        query: { query: '*:*', language: 'kuery' },
        filters: [],
        saved_id: null,
      },
      threatMapping: [
        {
          entries: [{ field: 'host.name', value: 'host.name', type: 'mapping' as const }],
        },
      ],
      concurrentSearches: 4,
      itemsPerSearch: 2500,
    };
    const indexPattern: DataViewBase = {
      fields: [createIndexPatternField({ name: 'host.name', esTypes: ['string'] })],
      title: '',
    };
    const handleSubmit = jest.fn();

    render(
      <TestForm initialState={initialState} indexPattern={indexPattern} onSubmit={handleSubmit} />,
      { wrapper: TestProviders }
    );

    await act(async () => {
      fireEvent.click(screen.getByText('Submit'));
    });
    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalled();
    });

    expect(handleSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        concurrentSearches: 4,
        itemsPerSearch: 2500,
      }),
      true
    );
  });

  it('mounts concurrentSearches/itemsPerSearch as empty strings when a threat_match rule has no value for them', async () => {
    // Documents a quirk of the underlying (deprecated) form library: a mounted
    // UseField with no default value anywhere falls back to '' rather than
    // undefined. formatDefineStepData is responsible for normalizing this back
    // to undefined before the payload reaches the server -- see the
    // "normalizes concurrentSearches/itemsPerSearch" test in
    // rule_creation/helpers.test.ts.
    const initialState = {
      ruleType: 'threat_match' as const,
      index: ['test-index'],
      queryBar: {
        query: { query: '*:*', language: 'kuery' },
        filters: [],
        saved_id: null,
      },
      threatIndex: ['threat-index'],
      threatQueryBar: {
        query: { query: '*:*', language: 'kuery' },
        filters: [],
        saved_id: null,
      },
      threatMapping: [
        {
          entries: [{ field: 'host.name', value: 'host.name', type: 'mapping' as const }],
        },
      ],
    };
    const indexPattern: DataViewBase = {
      fields: [createIndexPatternField({ name: 'host.name', esTypes: ['string'] })],
      title: '',
    };
    const handleSubmit = jest.fn();

    render(
      <TestForm initialState={initialState} indexPattern={indexPattern} onSubmit={handleSubmit} />,
      { wrapper: TestProviders }
    );

    await act(async () => {
      fireEvent.click(screen.getByText('Submit'));
    });
    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalled();
    });

    expect(handleSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        concurrentSearches: '',
        itemsPerSearch: '',
      }),
      true
    );
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
