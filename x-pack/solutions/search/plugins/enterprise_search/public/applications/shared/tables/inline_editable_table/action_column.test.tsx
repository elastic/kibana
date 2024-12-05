/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockActions, setMockValues } from '../../../__mocks__/kea_logic';

import React from 'react';

import { shallow, ShallowWrapper } from 'enzyme';

import { ActionColumn } from './action_column';

const requiredParams = {
  displayedItems: [],
  isActivelyEditing: () => false,
  item: { id: 1 },
};

describe('ActionColumn', () => {
  const mockValues = {
    doesEditingItemValueContainEmptyProperty: false,
    editingItemId: 1,
    fieldErrors: {},
    isEditing: false,
    isEditingUnsavedItem: false,
    rowErrors: [],
  };
  const mockActions = {
    editExistingItem: jest.fn(),
    deleteItem: jest.fn(),
    doneEditing: jest.fn(),
    saveExistingItem: jest.fn(),
    saveNewItem: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    setMockValues(mockValues);
    setMockActions(mockActions);
  });

  it('renders', () => {
    const wrapper = shallow(
      <ActionColumn
        displayedItems={[]}
        isActivelyEditing={() => false}
        isLoading={false}
        item={{ id: 1 }}
        canRemoveLastItem={false}
        lastItemWarning="I am a warning"
        uneditableItems={[]}
      />
    );
    expect(wrapper.isEmptyRender()).toBe(false);
  });

  it('renders nothing if the item is an uneditableItem', () => {
    const item = { id: 1 };
    const wrapper = shallow(
      <ActionColumn
        displayedItems={[]}
        isActivelyEditing={() => false}
        isLoading={false}
        item={item}
        canRemoveLastItem={false}
        lastItemWarning="I am a warning"
        uneditableItems={[item]}
      />
    );
    expect(wrapper.isEmptyRender()).toBe(true);
  });

  describe('when the user is actively editing', () => {
    const isActivelyEditing = () => true;
    const activelyEditingParams = {
      ...requiredParams,
      isActivelyEditing,
    };

    describe('it renders a save button', () => {
      const subject = (wrapper: ShallowWrapper) => wrapper.find('[data-test-subj="saveButton"]');

      it('which is disabled if data is loading', () => {
        const wrapper = shallow(<ActionColumn {...activelyEditingParams} isLoading />);
        expect(subject(wrapper).prop('disabled')).toBe(true);
      });

      it('which is disabled if there are field errors', () => {
        setMockValues({
          ...mockValues,
          fieldErrors: { foo: ['I am an error for foo'] },
        });

        const wrapper = shallow(<ActionColumn {...activelyEditingParams} />);
        expect(subject(wrapper).prop('disabled')).toBe(true);
      });

      it('which is disabled if there are row errors', () => {
        setMockValues({
          ...mockValues,
          rowErrors: ['I am a row error'],
        });

        const wrapper = shallow(<ActionColumn {...activelyEditingParams} />);
        expect(subject(wrapper).prop('disabled')).toBe(true);
      });

      it('which is disabled if the item value contains an empty property', () => {
        setMockValues({
          ...mockValues,
          doesEditingItemValueContainEmptyProperty: true,
        });

        const wrapper = shallow(<ActionColumn {...activelyEditingParams} />);
        expect(subject(wrapper).prop('disabled')).toBe(true);
      });

      it('which calls saveNewItem when clicked if the user is editing an unsaved item', () => {
        setMockValues({
          ...mockValues,
          isEditingUnsavedItem: true,
        });

        const wrapper = shallow(<ActionColumn {...activelyEditingParams} />);
        subject(wrapper).simulate('click');
        expect(mockActions.saveNewItem).toHaveBeenCalled();
      });

      it('which calls saveExistingItem when clicked if the user is NOT editing an unsaved item', () => {
        setMockValues({
          ...mockValues,
          isEditingUnsavedItem: false,
        });

        const wrapper = shallow(<ActionColumn {...activelyEditingParams} />);
        subject(wrapper).simulate('click');
        expect(mockActions.saveExistingItem).toHaveBeenCalled();
      });
    });

    describe('it renders a cancel button', () => {
      const subject = (wrapper: ShallowWrapper) => wrapper.find('[data-test-subj="cancelButton"]');

      it('which is disabled if data is loading', () => {
        const wrapper = shallow(<ActionColumn {...activelyEditingParams} isLoading />);
        expect(subject(wrapper).prop('disabled')).toBe(true);
      });

      it('which calls doneEditing when clicked', () => {
        const wrapper = shallow(<ActionColumn {...activelyEditingParams} />);
        subject(wrapper).simulate('click');
        expect(mockActions.doneEditing).toHaveBeenCalled();
      });
    });
  });

  describe('when the user is NOT actively editing', () => {
    const item = { id: 2 };

    const mockValuesWhereUserIsNotActivelyEditing = {
      ...mockValues,
      isEditing: false,
    };

    beforeEach(() => {
      setMockValues(mockValuesWhereUserIsNotActivelyEditing);
    });

    describe('it renders an edit button', () => {
      const subject = (wrapper: ShallowWrapper) => wrapper.find('[data-test-subj="editButton"]');

      it('which calls editExistingItem when clicked', () => {
        const wrapper = shallow(<ActionColumn {...requiredParams} item={item} />);
        subject(wrapper).simulate('click');
        expect(mockActions.editExistingItem).toHaveBeenCalledWith(item);
      });
    });

    describe('it renders an delete button', () => {
      const subject = (wrapper: ShallowWrapper) => wrapper.find('[data-test-subj="deleteButton"]');

      it('which calls deleteItem when clicked', () => {
        const wrapper = shallow(<ActionColumn {...requiredParams} item={item} />);
        subject(wrapper).simulate('click');
        expect(mockActions.deleteItem).toHaveBeenCalledWith(item);
      });

      it('which does not render if candRemoveLastItem is prevented and this is the last item', () => {
        const wrapper = shallow(
          <ActionColumn
            {...requiredParams}
            displayedItems={[item]}
            item={item}
            canRemoveLastItem={false}
          />
        );
        expect(subject(wrapper).exists()).toBe(false);
      });
    });
  });
});
