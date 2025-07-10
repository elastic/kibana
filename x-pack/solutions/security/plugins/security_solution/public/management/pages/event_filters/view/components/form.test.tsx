/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useState } from 'react';
import { act, cleanup, fireEvent } from '@testing-library/react';
import { stubIndexPattern } from '@kbn/data-plugin/common/stubs';
import { useFetchIndex } from '../../../../../common/containers/source';
import { NAME_ERROR } from '../event_filters_list';
import { useCurrentUser, useKibana } from '../../../../../common/lib/kibana';
import { licenseService } from '../../../../../common/hooks/use_license';
import type { AppContextTestRender } from '../../../../../common/mock/endpoint';
import { createAppRootMockRenderer } from '../../../../../common/mock/endpoint';
import userEvent from '@testing-library/user-event';
import type { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';

import { ENDPOINT_EVENT_FILTERS_LIST_ID } from '@kbn/securitysolution-list-constants';
import type { ArtifactFormComponentProps } from '../../../../components/artifact_list_page';
import { OperatingSystem } from '@kbn/securitysolution-utils';
import { EventFiltersForm } from './form';
import { MAX_COMMENT_LENGTH } from '../../../../../../common/constants';
import {
  FILTER_PROCESS_DESCENDANTS_TAG,
  GLOBAL_ARTIFACT_TAG,
} from '../../../../../../common/endpoint/service/artifacts/constants';
import type { IHttpFetchError } from '@kbn/core-http-browser';
import { buildPerPolicyTag } from '../../../../../../common/endpoint/service/artifacts/utils';

jest.setTimeout(15_000); // Costly tests, hitting 2 seconds execution time locally

jest.mock('../../../../../common/lib/kibana');
jest.mock('../../../../../common/containers/source');
jest.mock('../../../../../common/hooks/use_license', () => {
  const licenseServiceInstance = {
    isPlatinumPlus: jest.fn(),
    isGoldPlus: jest.fn(),
  };
  return {
    licenseService: licenseServiceInstance,
    useLicense: () => {
      return licenseServiceInstance;
    },
  };
});

/** When some props and states change, `EventFilterForm` will recreate its internal `processChanged` function,
 * and therefore will call it from a `useEffect` hook.
 *
 * Amongst the aforementioned props is the item itself, which comes from the outside - the test environment.
 * Amongst the aforementioned states is the `hasFormChanged` state, which will change from `false` to `true`
 * on the first user action.
 *
 * In the browser, the `item` prop is a state, a state from the parent component, therefore both
 * `item` and `hasFormChange` will change at the same re-render, which ensures that the `useEffect` will
 * call `processChanged` with consistent data.
 *
 * In the test environment, however, we need a trick to make sure that the data is updated in the same re-render
 * both outside and inside the component, in order to not receive additional calls from `processChanged` with outdated
 * data.
 *
 * This `TestComponentWrapper` component is meant to provide this kind of syncronisation, by turning the `item` prop
 * into a state.
 *
 */
const TestComponentWrapper: typeof EventFiltersForm = (formProps: ArtifactFormComponentProps) => {
  const [item, setItem] = useState(formProps.item);

  const handleOnChange: ArtifactFormComponentProps['onChange'] = useCallback(
    (formStatus) => {
      setItem(formStatus.item);
      formProps.onChange(formStatus);
    },
    [formProps]
  );

  return <EventFiltersForm {...formProps} item={item} onChange={handleOnChange} />;
};

describe('Event filter form', () => {
  const formPrefix = 'eventFilters-form';

  let formProps: jest.Mocked<ArtifactFormComponentProps>;
  let mockedContext: AppContextTestRender;
  let renderResult: ReturnType<AppContextTestRender['render']>;
  let latestUpdatedItem: ArtifactFormComponentProps['item'];
  let isLatestUpdatedItemValid: boolean;

  const getUI = () => <TestComponentWrapper {...formProps} />;
  const render = () => {
    return (renderResult = mockedContext.render(getUI()));
  };
  const rerender = () => renderResult.rerender(getUI());
  const rerenderWithLatestProps = () => {
    formProps.item = latestUpdatedItem;
    rerender();
  };

  function createEntry(
    overrides?: ExceptionListItemSchema['entries'][number]
  ): ExceptionListItemSchema['entries'][number] {
    const defaultEntry: ExceptionListItemSchema['entries'][number] = {
      field: '',
      operator: 'included',
      type: 'match',
      value: '',
    };

    return {
      ...defaultEntry,
      ...overrides,
    };
  }

  function createItem(
    overrides: Partial<ArtifactFormComponentProps['item']> = {}
  ): ArtifactFormComponentProps['item'] {
    const defaults: ArtifactFormComponentProps['item'] = {
      id: 'some_item_id',
      list_id: ENDPOINT_EVENT_FILTERS_LIST_ID,
      name: '',
      description: '',
      os_types: [OperatingSystem.WINDOWS],
      entries: [createEntry()],
      type: 'simple',
      tags: [GLOBAL_ARTIFACT_TAG, FILTER_PROCESS_DESCENDANTS_TAG],
    };
    return {
      ...defaults,
      ...overrides,
    };
  }

  const setValidItemForEditing = () => {
    formProps.mode = 'edit';
    formProps.item.name = 'item name';
    formProps.item.entries = [
      { field: 'test.field', operator: 'included', type: 'match', value: 'test value' },
    ];
  };

  beforeEach(async () => {
    (useCurrentUser as jest.Mock).mockReturnValue({ username: 'test-username' });
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        http: {},
        data: {},
        unifiedSearch: {},
        notifications: {},
      },
    });
    (licenseService.isPlatinumPlus as jest.Mock).mockReturnValue(true);
    mockedContext = createAppRootMockRenderer();
    latestUpdatedItem = createItem();
    (useFetchIndex as jest.Mock).mockImplementation(() => [
      false,
      {
        indexPatterns: stubIndexPattern,
      },
    ]);

    formProps = {
      item: latestUpdatedItem,
      mode: 'create',
      disabled: false,
      error: undefined,
      onChange: jest.fn((updates) => {
        latestUpdatedItem = updates.item;
        isLatestUpdatedItemValid = updates.isValid;
      }),
    };
  });

  afterEach(() => {
    cleanup();
  });

  describe('Details and Conditions', () => {
    it('should display sections', async () => {
      render();
      expect(renderResult.queryByText('Details')).not.toBeNull();
      expect(renderResult.queryByText('Conditions')).not.toBeNull();
      expect(renderResult.queryByText('Comments')).not.toBeNull();
      expect(renderResult.getByTestId('eventFilters-form-effectedPolicies')).toBeTruthy();
    });

    it('should display name error only when on blur and empty name', async () => {
      render();
      expect(renderResult.queryByText(NAME_ERROR)).toBeNull();
      const nameInput = renderResult.getByTestId(`${formPrefix}-name-input`);
      fireEvent.blur(nameInput);
      rerenderWithLatestProps();
      expect(renderResult.queryByText(NAME_ERROR)).not.toBeNull();
    });

    it('should change name', async () => {
      render();
      const nameInput = renderResult.getByTestId(`${formPrefix}-name-input`);

      await userEvent.type(nameInput, 'Exception name');
      rerenderWithLatestProps();

      expect(formProps.item?.name).toBe('Exception name');
      expect(renderResult.queryByText(NAME_ERROR)).toBeNull();
    });

    it('should change name with a white space still shows an error', async () => {
      render();
      const nameInput = renderResult.getByTestId(`${formPrefix}-name-input`);

      await userEvent.type(nameInput, '   ');
      fireEvent.blur(nameInput);
      rerenderWithLatestProps();

      expect(formProps.item.name).toBe('');
      expect(renderResult.queryByText(NAME_ERROR)).not.toBeNull();
    });

    it('should change description', async () => {
      render();
      const descriptionInput = renderResult.getByTestId(`${formPrefix}-description-input`);

      await userEvent.type(descriptionInput, 'Exception description');
      rerenderWithLatestProps();

      expect(formProps.item.description).toBe('Exception description');
    });

    it('should change comments', async () => {
      render();
      const commentInput = renderResult.getByLabelText('Comment Input');

      await userEvent.type(commentInput, 'Exception comment');
      rerenderWithLatestProps();

      expect(formProps.item.comments).toEqual([{ comment: 'Exception comment' }]);
    });

    describe('when opened for editing', () => {
      beforeEach(() => {
        setValidItemForEditing();
      });

      it('item should not be valid when opened for editing', async () => {
        render();
        expect(isLatestUpdatedItemValid).toBe(false);
      });

      it('item should be valid after editing name', async () => {
        render();
        const nameInput = renderResult.getByTestId(`${formPrefix}-name-input`);

        await userEvent.type(nameInput, '2');

        expect(latestUpdatedItem.name).toBe('item name2');
        expect(isLatestUpdatedItemValid).toBe(true);
      });

      it('item should be valid after editing description', async () => {
        render();
        const descriptionInput = renderResult.getByTestId(`${formPrefix}-description-input`);

        await userEvent.type(descriptionInput, 'd');

        expect(latestUpdatedItem.description).toBe('d');
        expect(isLatestUpdatedItemValid).toBe(true);
      });

      it('item should be valid after editing comment', async () => {
        render();
        const commentInput = renderResult.getByLabelText('Comment Input');

        await userEvent.type(commentInput, 'c');

        expect(latestUpdatedItem.comments).toEqual([{ comment: 'c' }]);
        expect(isLatestUpdatedItemValid).toBe(true);
      });
    });
  });

  describe('Filter process descendants', () => {
    beforeEach(() => {
      mockedContext.setExperimentalFlag({ filterProcessDescendantsForEventFiltersEnabled: true });
    });

    it('should not display selector when feature flag is disabled', () => {
      mockedContext.setExperimentalFlag({
        filterProcessDescendantsForEventFiltersEnabled: false,
      });
      render();

      expect(
        renderResult.queryByTestId(`${formPrefix}-filterProcessDescendantsButton`)
      ).not.toBeInTheDocument();
    });

    it('should show `Events` filter selected when tags are missing', () => {
      delete formProps.item.tags;
      render();

      expect(renderResult.getByTestId(`${formPrefix}-filterEventsButton`)).toHaveAttribute(
        'aria-pressed',
        'true'
      );
      expect(
        renderResult.getByTestId(`${formPrefix}-filterProcessDescendantsButton`)
      ).toHaveAttribute('aria-pressed', 'false');
    });

    it('should show `Events` filter selected when filtering process descendants is disabled in config', () => {
      formProps.item.tags = [];
      render();

      expect(renderResult.getByTestId(`${formPrefix}-filterEventsButton`)).toHaveAttribute(
        'aria-pressed',
        'true'
      );
      expect(
        renderResult.getByTestId(`${formPrefix}-filterProcessDescendantsButton`)
      ).toHaveAttribute('aria-pressed', 'false');
    });

    it('should show `Process descendants` filter selected when enabled in config', () => {
      formProps.item.tags = [FILTER_PROCESS_DESCENDANTS_TAG];
      render();

      expect(renderResult.getByTestId(`${formPrefix}-filterEventsButton`)).toHaveAttribute(
        'aria-pressed',
        'false'
      );
      expect(
        renderResult.getByTestId(`${formPrefix}-filterProcessDescendantsButton`)
      ).toHaveAttribute('aria-pressed', 'true');
    });

    it('should add process tree filtering tag to tags when filtering descendants enabled', async () => {
      formProps.item.tags = [];
      render();

      await userEvent.click(
        renderResult.getByTestId(`${formPrefix}-filterProcessDescendantsButton`)
      );

      expect(latestUpdatedItem.tags).toStrictEqual([FILTER_PROCESS_DESCENDANTS_TAG]);
    });

    it('should remove process tree filtering tag from tags when filtering descendants disabled', async () => {
      formProps.item.tags = [FILTER_PROCESS_DESCENDANTS_TAG];
      render();

      await userEvent.click(renderResult.getByTestId(`${formPrefix}-filterEventsButton`));

      expect(latestUpdatedItem.tags).toStrictEqual([]);
    });

    it('should add the tag always after policy assignment tags', async () => {
      const perPolicyTag = buildPerPolicyTag('foo');
      formProps.item.tags = [perPolicyTag];
      render();

      await userEvent.click(
        renderResult.getByTestId(`${formPrefix}-filterProcessDescendantsButton`)
      );
      expect(latestUpdatedItem.tags).toStrictEqual([perPolicyTag, FILTER_PROCESS_DESCENDANTS_TAG]);

      rerenderWithLatestProps();
      await userEvent.click(renderResult.getByTestId(`${formPrefix}-effectedPolicies-global`));
      expect(latestUpdatedItem.tags).toStrictEqual([
        FILTER_PROCESS_DESCENDANTS_TAG,
        GLOBAL_ARTIFACT_TAG,
      ]);

      rerenderWithLatestProps();
      await userEvent.click(renderResult.getByTestId(`${formPrefix}-filterEventsButton`));
      expect(latestUpdatedItem.tags).toStrictEqual([GLOBAL_ARTIFACT_TAG]);

      rerenderWithLatestProps();
      await userEvent.click(
        renderResult.getByTestId(`${formPrefix}-filterProcessDescendantsButton`)
      );
      expect(latestUpdatedItem.tags).toStrictEqual([
        GLOBAL_ARTIFACT_TAG,
        FILTER_PROCESS_DESCENDANTS_TAG,
      ]);

      rerenderWithLatestProps();
      await userEvent.click(
        renderResult.getByTestId('eventFilters-form-effectedPolicies-perPolicy')
      );
      expect(latestUpdatedItem.tags).toStrictEqual([FILTER_PROCESS_DESCENDANTS_TAG, perPolicyTag]);
    });

    it('should display a tooltip to the user', async () => {
      const tooltipIconSelector = `${formPrefix}-filterProcessDescendantsTooltip-tooltipIcon`;
      const tooltipTextSelector = `${formPrefix}-filterProcessDescendantsTooltip-tooltipText`;
      render();

      expect(renderResult.getByTestId(tooltipIconSelector)).toBeInTheDocument();
      expect(renderResult.queryByTestId(tooltipTextSelector)).not.toBeInTheDocument();

      await userEvent.hover(renderResult.getByTestId(tooltipIconSelector));

      expect(await renderResult.findByTestId(tooltipTextSelector)).toBeInTheDocument();
    });

    describe('when opened for editing', () => {
      beforeEach(() => {
        setValidItemForEditing();
      });

      it('item should be valid after changing to event filtering', async () => {
        formProps.item.tags = [FILTER_PROCESS_DESCENDANTS_TAG];
        render();
        expect(isLatestUpdatedItemValid).toBe(false);

        await userEvent.click(renderResult.getByTestId(`${formPrefix}-filterEventsButton`));

        expect(isLatestUpdatedItemValid).toBe(true);
        expect(latestUpdatedItem.tags).toEqual([]);
      });

      it('item should be valid after changing to process descendant filtering', async () => {
        formProps.item.tags = [];
        render();
        expect(isLatestUpdatedItemValid).toBe(false);

        await userEvent.click(
          renderResult.getByTestId(`${formPrefix}-filterProcessDescendantsButton`)
        );

        expect(isLatestUpdatedItemValid).toBe(true);
        expect(latestUpdatedItem.tags).toEqual([FILTER_PROCESS_DESCENDANTS_TAG]);
      });
    });
  });

  describe('Warnings', () => {
    describe('duplicate fields', () => {
      it('should not show warning text when unique fields are added', async () => {
        formProps.item.entries = [
          {
            field: 'event.action',
            operator: 'included',
            type: 'match',
            value: 'some value',
          },
          {
            field: 'file.name',
            operator: 'excluded',
            type: 'match',
            value: 'some other value',
          },
        ];
        render();
        expect(await renderResult.findByDisplayValue('some value')).toBeInTheDocument();

        expect(
          renderResult.queryByTestId('duplicate-fields-warning-message')
        ).not.toBeInTheDocument();
      });

      it('should not show warning text when field values are not added', async () => {
        formProps.item.entries = [
          {
            field: 'event.action',
            operator: 'included',
            type: 'match',
            value: '',
          },
          {
            field: 'event.action',
            operator: 'excluded',
            type: 'match',
            value: '',
          },
        ];
        render();
        expect((await renderResult.findAllByTestId('fieldAutocompleteComboBox')).length).toBe(2);

        expect(
          renderResult.queryByTestId('duplicate-fields-warning-message')
        ).not.toBeInTheDocument();
      });

      it('should show warning text when duplicate fields are added with values', async () => {
        formProps.item.entries = [
          {
            field: 'event.action',
            operator: 'included',
            type: 'match',
            value: 'some value',
          },
          {
            field: 'event.action',
            operator: 'excluded',
            type: 'match',
            value: 'some other value',
          },
        ];
        render();

        expect(
          await renderResult.findByTestId('duplicate-fields-warning-message')
        ).toBeInTheDocument();
      });

      describe('in relation with Process Descendant filtering', () => {
        it('should not show warning text when event.category is added but feature flag is disabled', async () => {
          mockedContext.setExperimentalFlag({
            filterProcessDescendantsForEventFiltersEnabled: false,
          });

          formProps.item.entries = [
            {
              field: 'event.category',
              operator: 'included',
              type: 'match',
              value: 'some value 1',
            },
          ];
          formProps.item.tags = [FILTER_PROCESS_DESCENDANTS_TAG];

          render();
          expect(await renderResult.findByDisplayValue('some value 1')).toBeInTheDocument();

          expect(
            renderResult.queryByTestId('duplicate-fields-warning-message')
          ).not.toBeInTheDocument();
        });

        it('should not show warning text when event.category is added but process descendant filter is disabled', async () => {
          mockedContext.setExperimentalFlag({
            filterProcessDescendantsForEventFiltersEnabled: true,
          });

          formProps.item.entries = [
            {
              field: 'event.category',
              operator: 'included',
              type: 'match',
              value: 'some value 2',
            },
          ];
          formProps.item.tags = [];

          render();
          expect(await renderResult.findByDisplayValue('some value 2')).toBeInTheDocument();

          expect(
            renderResult.queryByTestId('duplicate-fields-warning-message')
          ).not.toBeInTheDocument();
        });

        it('should not show warning text when event.category is NOT added and process descendant filter is enabled', async () => {
          mockedContext.setExperimentalFlag({
            filterProcessDescendantsForEventFiltersEnabled: true,
          });

          formProps.item.entries = [
            {
              field: 'event.action',
              operator: 'included',
              type: 'match',
              value: 'some value 3',
            },
          ];
          formProps.item.tags = [FILTER_PROCESS_DESCENDANTS_TAG];

          render();
          expect(await renderResult.findByDisplayValue('some value 3')).toBeInTheDocument();

          expect(
            renderResult.queryByTestId('duplicate-fields-warning-message')
          ).not.toBeInTheDocument();
        });

        it('should show warning text when event.category is added and process descendant filter is enabled', async () => {
          mockedContext.setExperimentalFlag({
            filterProcessDescendantsForEventFiltersEnabled: true,
          });

          formProps.item.entries = [
            {
              field: 'event.category',
              operator: 'included',
              type: 'match',
              value: 'some value 4',
            },
          ];
          formProps.item.tags = [FILTER_PROCESS_DESCENDANTS_TAG];

          render();
          expect(await renderResult.findByDisplayValue('some value 4')).toBeInTheDocument();

          expect(
            await renderResult.findByTestId('duplicate-fields-warning-message')
          ).toBeInTheDocument();
        });

        it('should add warning text when switching to process descendant filtering', async () => {
          mockedContext.setExperimentalFlag({
            filterProcessDescendantsForEventFiltersEnabled: true,
          });

          formProps.item.entries = [
            {
              field: 'event.category',
              operator: 'included',
              type: 'match',
              value: 'some value 5',
            },
          ];
          formProps.item.tags = [];

          render();
          expect(await renderResult.findByDisplayValue('some value 5')).toBeInTheDocument();
          expect(
            renderResult.queryByTestId('duplicate-fields-warning-message')
          ).not.toBeInTheDocument();

          // switch to Process Descendant filtering
          await userEvent.click(
            renderResult.getByTestId(`${formPrefix}-filterProcessDescendantsButton`)
          );
          rerenderWithLatestProps();

          expect(
            await renderResult.findByTestId('duplicate-fields-warning-message')
          ).toBeInTheDocument();
        });

        it('should remove warning text when switching from process descendant filtering', async () => {
          mockedContext.setExperimentalFlag({
            filterProcessDescendantsForEventFiltersEnabled: true,
          });

          formProps.item.entries = [
            {
              field: 'event.category',
              operator: 'included',
              type: 'match',
              value: 'some value 6',
            },
          ];
          formProps.item.tags = [FILTER_PROCESS_DESCENDANTS_TAG];

          render();

          expect(
            await renderResult.findByTestId('duplicate-fields-warning-message')
          ).toBeInTheDocument();

          // switch to classic Event filtering
          await userEvent.click(renderResult.getByTestId(`${formPrefix}-filterEventsButton`));
          rerenderWithLatestProps();

          expect(await renderResult.findByDisplayValue('some value 6')).toBeInTheDocument();
          expect(
            renderResult.queryByTestId('duplicate-fields-warning-message')
          ).not.toBeInTheDocument();
        });

        it('should remove warning text when removing `event.category`', async () => {
          mockedContext.setExperimentalFlag({
            filterProcessDescendantsForEventFiltersEnabled: true,
          });

          formProps.item.entries = [
            {
              field: 'event.category',
              operator: 'included',
              type: 'match',
              value: 'some value 6',
            },
          ];
          formProps.item.tags = [FILTER_PROCESS_DESCENDANTS_TAG];

          render();

          expect(
            await renderResult.findByTestId('duplicate-fields-warning-message')
          ).toBeInTheDocument();

          // switch to classic Event filtering
          await userEvent.click(renderResult.getByTestId(`builderItemEntryDeleteButton`));
          rerenderWithLatestProps();

          expect(
            renderResult.queryByTestId('duplicate-fields-warning-message')
          ).not.toBeInTheDocument();
        });
      });
    });

    describe('wildcard with wrong operator', () => {
      it('should not show warning callout when wildcard is used with the "MATCHES" operator', async () => {
        formProps.item.entries = [
          {
            field: 'event.category',
            operator: 'included',
            type: 'wildcard',
            value: 'valuewithwildcard*',
          },
        ];
        render();
        expect(await renderResult.findByDisplayValue('valuewithwildcard*')).toBeInTheDocument();

        expect(
          renderResult.queryByTestId('wildcardWithWrongOperatorCallout')
        ).not.toBeInTheDocument();
      });

      it('should show warning callout when wildcard is used with the "IS" operator', async () => {
        formProps.item.entries = [
          {
            field: 'event.category',
            operator: 'included',
            type: 'match',
            value: 'valuewithwildcard*',
          },
        ];
        render();

        expect(
          await renderResult.findByTestId('wildcardWithWrongOperatorCallout')
        ).toBeInTheDocument();
      });
    });
  });

  describe('Errors', () => {
    beforeEach(() => {
      render();
    });

    it('should not show warning text when unique fields are added', async () => {
      rerender();

      const commentInput = renderResult.getByLabelText('Comment Input');

      expect(
        renderResult.queryByText(
          `The length of the comment is too long. The maximum length is ${MAX_COMMENT_LENGTH} characters.`
        )
      ).toBeNull();
      act(() => {
        fireEvent.change(commentInput, {
          target: {
            value: [...new Array(MAX_COMMENT_LENGTH + 1).keys()].map((_) => 'a').join(''),
          },
        });
        fireEvent.blur(commentInput);
      });
      expect(
        renderResult.queryByText(
          `The length of the comment is too long. The maximum length is ${MAX_COMMENT_LENGTH} characters.`
        )
      ).not.toBeNull();
    });

    it('should display form submission errors', () => {
      const message = 'oh oh - error';
      formProps.error = new Error(message) as IHttpFetchError;
      const { getByTestId } = render();

      expect(getByTestId('eventFilters-form-submitError').textContent).toMatch(message);
    });
  });
});
