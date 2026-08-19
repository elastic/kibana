/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';

import { ResponseActionsForm } from './response_actions_form';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import type { ArrayItem, FormHook } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { Form, useForm } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { getMockTheme } from '../../common/lib/kibana/kibana_react.mock';
import { useIsExperimentalFeatureEnabled } from '../../common/hooks/use_experimental_features';

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'), // use actual for all non-hook parts
  useParams: () => ({
    detailName: 'testId',
  }),
}));
jest.mock('../../common/lib/kibana', () => {
  const original = jest.requireActual('../../common/lib/kibana');
  return {
    ...original,
    useToasts: jest.fn().mockReturnValue({
      addError: jest.fn(),
      addSuccess: jest.fn(),
      addWarning: jest.fn(),
      addInfo: jest.fn(),
      remove: jest.fn(),
    }),
  };
});

jest.mock('../../common/hooks/use_experimental_features', () => ({
  useIsExperimentalFeatureEnabled: jest.fn().mockReturnValue(true),
}));

import * as rules from '../rule_management/logic/use_rule';
// @ts-expect-error we don't really care about thr useRule return value
jest.spyOn(rules, 'useRule').mockReturnValue({});

const useIsExperimentalFeatureEnabledMock = useIsExperimentalFeatureEnabled as jest.Mock;
useIsExperimentalFeatureEnabledMock.mockReturnValue(true);

const mockTheme = getMockTheme({ eui: { euiColorLightestShade: '#F5F7FA' } });

const wrapWithProviders = (node: React.ReactElement) => (
  <ThemeProvider theme={mockTheme}>
    <IntlProvider locale={'en'}>{node}</IntlProvider>
  </ThemeProvider>
);

const renderWithContext = (Element: React.ReactElement) => render(wrapWithProviders(Element));

describe('ResponseActionsForm', () => {
  const Component = (props: { items: ArrayItem[] }) => {
    const { form } = useForm();
    return (
      <Form form={form}>
        <ResponseActionsForm addItem={jest.fn()} removeItem={jest.fn()} {...props} form={form} />
      </Form>
    );
  };
  it('renders correctly', async () => {
    const { getByTestId, queryByTestId } = renderWithContext(<Component items={[]} />);
    expect(getByTestId('response-actions-form'));
    expect(getByTestId('response-actions-header'));
    expect(getByTestId('response-actions-wrapper'));
    expect(queryByTestId('response-actions-list'));
    expect(queryByTestId('response-actions-list-item-0')).toEqual(null);
  });
  it('renders list of elements', async () => {
    const { getByTestId, queryByTestId } = renderWithContext(
      <Component
        items={[
          { path: '1', id: 1, isNew: false },
          { path: '2', id: 2, isNew: false },
        ]}
      />
    );
    const list = getByTestId('response-actions-list');
    expect(getByTestId('response-actions-form'));
    expect(getByTestId('response-actions-header'));
    expect(list);
    expect(queryByTestId('response-actions-list-item-0')).not.toEqual(null);
    expect(queryByTestId('response-actions-list-item-1')).not.toEqual(null);
  });

  describe('integration', () => {
    const OSQUERY_ID = '.osquery';
    const ENDPOINT_ID = '.endpoint';

    interface MockField {
      value?: unknown;
      errors?: Array<{ message: string }>;
    }

    const HarnessComponent = ({
      items,
      fields,
      errors = [],
      removeItem = jest.fn(),
    }: {
      items: ArrayItem[];
      fields: Record<string, MockField>;
      errors?: unknown[];
      removeItem?: (id: number) => void;
    }) => {
      const { form: realForm } = useForm();
      const form = {
        ...realForm,
        getFields: () => fields as unknown as ReturnType<FormHook['getFields']>,
        getErrors: () => errors as unknown as ReturnType<FormHook['getErrors']>,
      } as FormHook;

      return (
        <Form form={realForm}>
          <ResponseActionsForm
            addItem={jest.fn()}
            removeItem={removeItem}
            items={items}
            form={form}
          />
        </Form>
      );
    };

    const makeItem = (id: number, path = id.toString()): ArrayItem => ({
      path,
      id,
      isNew: false,
    });

    it('surfaces simultaneous query + timeout errors on one osquery item together in the callout', () => {
      const { getByTestId } = renderWithContext(
        <HarnessComponent
          items={[makeItem(1)]}
          fields={{
            '1.actionTypeId': { value: OSQUERY_ID },
            '1.params.query': { errors: [{ message: 'Query is a required field' }] },
            '1.params.timeout': {
              errors: [{ message: 'The timeout value must be 60 seconds or higher.' }],
            },
          }}
        />
      );

      const callout = getByTestId('response-actions-error');
      expect(callout).toHaveTextContent('Query is a required field');
      expect(callout).toHaveTextContent('The timeout value must be 60 seconds or higher.');
    });

    it('labels each error group with the matching action-type name', () => {
      const { getByTestId } = renderWithContext(
        <HarnessComponent
          items={[makeItem(1), makeItem(2)]}
          fields={{
            '1.actionTypeId': { value: OSQUERY_ID },
            '1.params.query': { errors: [{ message: 'Query is a required field' }] },
            '2.actionTypeId': { value: ENDPOINT_ID },
            '2.params.command': { errors: [{ message: 'Command is a required field' }] },
          }}
        />
      );

      const callout = getByTestId('response-actions-error');
      expect(callout).toHaveTextContent('Osquery:');
      expect(callout).toHaveTextContent('Elastic Defend:');
      expect(callout).toHaveTextContent('Query is a required field');
      expect(callout).toHaveTextContent('Command is a required field');
    });

    it('does not render the error callout when no item has errors', () => {
      const { queryByTestId } = renderWithContext(
        <HarnessComponent
          items={[makeItem(1)]}
          fields={{
            '1.actionTypeId': { value: OSQUERY_ID },
            '1.params.query': { value: 'SELECT 1', errors: [] },
          }}
        />
      );
      expect(queryByTestId('response-actions-error')).toEqual(null);
    });

    it('surfaces a pack-required error when a pack-mode osquery item has no pack selected', () => {
      const { getByTestId } = renderWithContext(
        <HarnessComponent
          items={[makeItem(1)]}
          fields={{
            '1.actionTypeId': { value: OSQUERY_ID },
            '1.params.packId': { errors: [{ message: 'Pack is a required field' }] },
          }}
        />
      );

      expect(getByTestId('response-actions-error')).toHaveTextContent('Pack is a required field');
    });

    it('aggregates errors independently across three coexisting osquery items', () => {
      const { getByTestId } = renderWithContext(
        <HarnessComponent
          items={[makeItem(1), makeItem(2), makeItem(3)]}
          fields={{
            '1.actionTypeId': { value: OSQUERY_ID },
            '1.params.query': { errors: [{ message: 'Query is a required field' }] },
            '2.actionTypeId': { value: OSQUERY_ID },
            '2.params.packId': { errors: [{ message: 'Pack is a required field' }] },
            '3.actionTypeId': { value: OSQUERY_ID },
            '3.params.ecs_mapping': {
              errors: [{ message: 'ECS mapping is a required field' }],
            },
          }}
        />
      );

      const callout = getByTestId('response-actions-error');
      expect(callout).toHaveTextContent('Query is a required field');
      expect(callout).toHaveTextContent('Pack is a required field');
      expect(callout).toHaveTextContent('ECS mapping is a required field');
    });

    it('renders one accordion row per item when three items coexist', () => {
      const { queryByTestId } = renderWithContext(
        <HarnessComponent items={[makeItem(1), makeItem(2), makeItem(3)]} fields={{}} />
      );
      expect(queryByTestId('response-actions-list-item-0')).not.toEqual(null);
      expect(queryByTestId('response-actions-list-item-1')).not.toEqual(null);
      expect(queryByTestId('response-actions-list-item-2')).not.toEqual(null);
    });

    it('invokes removeItem with the clicked item id, not its rendered index', () => {
      const removeItem = jest.fn();
      const { getAllByTestId } = renderWithContext(
        <HarnessComponent
          items={[makeItem(10), makeItem(20), makeItem(30)]}
          fields={{}}
          removeItem={removeItem}
        />
      );

      const removeButtons = getAllByTestId('remove-response-action');
      expect(removeButtons).toHaveLength(3);

      fireEvent.click(removeButtons[0]);
      expect(removeItem).toHaveBeenLastCalledWith(10);

      fireEvent.click(removeButtons[2]);
      expect(removeItem).toHaveBeenLastCalledWith(30);
    });

    it('re-renders the accordion list in the new order when items prop changes', () => {
      const { rerender, queryByTestId, getAllByTestId } = render(
        wrapWithProviders(
          <HarnessComponent items={[makeItem(10), makeItem(20), makeItem(30)]} fields={{}} />
        )
      );

      expect(getAllByTestId('remove-response-action')).toHaveLength(3);

      rerender(
        wrapWithProviders(<HarnessComponent items={[makeItem(10), makeItem(30)]} fields={{}} />)
      );

      expect(queryByTestId('response-actions-list-item-0')).not.toEqual(null);
      expect(queryByTestId('response-actions-list-item-1')).not.toEqual(null);
      expect(queryByTestId('response-actions-list-item-2')).toEqual(null);
    });

    it('drops errors for removed items and keeps errors for remaining items', () => {
      const { getByTestId, queryByTestId, rerender } = render(
        wrapWithProviders(
          <HarnessComponent
            items={[makeItem(1), makeItem(2)]}
            fields={{
              '1.actionTypeId': { value: OSQUERY_ID },
              '1.params.query': { errors: [{ message: 'Query is a required field' }] },
              '2.actionTypeId': { value: OSQUERY_ID },
              '2.params.packId': { errors: [{ message: 'Pack is a required field' }] },
            }}
          />
        )
      );

      expect(getByTestId('response-actions-error')).toHaveTextContent('Query is a required field');
      expect(getByTestId('response-actions-error')).toHaveTextContent('Pack is a required field');

      rerender(
        wrapWithProviders(
          <HarnessComponent
            items={[makeItem(2)]}
            fields={{
              '2.actionTypeId': { value: OSQUERY_ID },
              '2.params.packId': { errors: [{ message: 'Pack is a required field' }] },
            }}
          />
        )
      );

      const callout = queryByTestId('response-actions-error');
      expect(callout).not.toEqual(null);
      expect(callout).toHaveTextContent('Pack is a required field');
      expect(callout?.textContent ?? '').not.toContain('Query is a required field');
    });

    it('re-aggregates errors when a pack swap replaces one item s error with another', () => {
      const { getByTestId, rerender } = render(
        wrapWithProviders(
          <HarnessComponent
            items={[makeItem(1), makeItem(2), makeItem(3)]}
            fields={{
              '1.actionTypeId': { value: OSQUERY_ID },
              '1.params.query': { value: 'SELECT 1', errors: [] },
              '2.actionTypeId': { value: OSQUERY_ID },
              '2.params.packId': { errors: [{ message: 'Pack is a required field' }] },
              '3.actionTypeId': { value: OSQUERY_ID },
              '3.params.query': { value: 'SELECT 2', errors: [] },
            }}
          />
        )
      );

      expect(getByTestId('response-actions-error')).toHaveTextContent('Pack is a required field');

      rerender(
        wrapWithProviders(
          <HarnessComponent
            items={[makeItem(1), makeItem(2), makeItem(3)]}
            fields={{
              '1.actionTypeId': { value: OSQUERY_ID },
              '1.params.query': { value: 'SELECT 1', errors: [] },
              '2.actionTypeId': { value: OSQUERY_ID },
              '2.params.packId': { value: 'pack-123', errors: [] },
              '3.actionTypeId': { value: OSQUERY_ID },
              '3.params.query': { errors: [{ message: 'Query is a required field' }] },
            }}
          />
        )
      );

      const callout = getByTestId('response-actions-error');
      expect(callout).toHaveTextContent('Query is a required field');
      expect(callout.textContent ?? '').not.toContain('Pack is a required field');
    });
  });
});
