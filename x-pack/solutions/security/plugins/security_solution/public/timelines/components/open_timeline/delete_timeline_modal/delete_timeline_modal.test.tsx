/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import { mountWithIntl } from '@kbn/test-jest-helpers';
import React from 'react';
import { useParams } from 'react-router-dom';

import { DeleteTimelineModal } from './delete_timeline_modal';

import * as i18n from '../translations';
import { TimelineTypeEnum } from '../../../../../common/api/timeline';

vi.mock('react-router-dom', () => {
  const actual = require('react-router-dom');
  return {
    ...actual,
    useParams: vi.fn(),
  };
});

describe('DeleteTimelineModal', () => {
  beforeAll(() => {
    (useParams as Mock).mockReturnValue({ tabName: TimelineTypeEnum.default });
  });

  test('it renders the expected title when a timeline is selected', () => {
    const wrapper = mountWithIntl(
      <DeleteTimelineModal
        title={'Privilege Escalation'}
        onDelete={vi.fn()}
        closeModal={vi.fn()}
      />
    );

    expect(wrapper.find('[data-test-subj="confirmModalTitleText"]').first().text()).toEqual(
      'Delete "Privilege Escalation"?'
    );
  });

  test('it trims leading whitespace around the title', () => {
    const wrapper = mountWithIntl(
      <DeleteTimelineModal
        title={'    Leading and trailing whitespace    '}
        onDelete={vi.fn()}
        closeModal={vi.fn()}
      />
    );

    expect(wrapper.find('[data-test-subj="confirmModalTitleText"]').first().text()).toEqual(
      'Delete "Leading and trailing whitespace"?'
    );
  });

  test('it displays `Untitled Timeline` in the title when title is undefined', () => {
    const wrapper = mountWithIntl(
      <DeleteTimelineModal onDelete={vi.fn()} closeModal={vi.fn()} />
    );

    expect(wrapper.find('[data-test-subj="confirmModalTitleText"]').first().text()).toEqual(
      'Delete "Untitled Timeline"?'
    );
  });

  test('it displays `Untitled Timeline` in the title when title is null', () => {
    const wrapper = mountWithIntl(
      <DeleteTimelineModal onDelete={vi.fn()} title={null} closeModal={vi.fn()} />
    );

    expect(wrapper.find('[data-test-subj="confirmModalTitleText"]').first().text()).toEqual(
      'Delete "Untitled Timeline"?'
    );
  });

  test('it displays `Untitled Timeline` in the title when title is just whitespace', () => {
    const wrapper = mountWithIntl(
      <DeleteTimelineModal onDelete={vi.fn()} title={'    '} closeModal={vi.fn()} />
    );

    expect(wrapper.find('[data-test-subj="confirmModalTitleText"]').first().text()).toEqual(
      'Delete "Untitled Timeline"?'
    );
  });

  test('it renders a deletion warning', () => {
    const wrapper = mountWithIntl(
      <DeleteTimelineModal
        title="Privilege Escalation"
        onDelete={vi.fn()}
        closeModal={vi.fn()}
      />
    );

    expect(wrapper.find('[data-test-subj="warning"]').first().text()).toEqual(
      i18n.DELETE_TIMELINE_WARNING
    );
  });

  test('it invokes closeModal when the Cancel button is clicked', () => {
    const closeModal = vi.fn();

    const wrapper = mountWithIntl(
      <DeleteTimelineModal
        title="Privilege Escalation"
        onDelete={vi.fn()}
        closeModal={closeModal}
      />
    );

    wrapper.find('[data-test-subj="confirmModalCancelButton"]').first().simulate('click');

    expect(closeModal).toHaveBeenCalled();
  });

  test('it invokes onDelete when the Delete button is clicked', () => {
    const onDelete = vi.fn();

    const wrapper = mountWithIntl(
      <DeleteTimelineModal
        title="Privilege Escalation"
        onDelete={onDelete}
        closeModal={vi.fn()}
      />
    );

    wrapper.find('button[data-test-subj="confirmModalConfirmButton"]').first().simulate('click');

    expect(onDelete).toHaveBeenCalled();
  });
});

describe('DeleteTimelineTemplateModal', () => {
  beforeAll(() => {
    (useParams as Mock).mockReturnValue({ tabName: TimelineTypeEnum.template });
  });

  test('it renders a deletion warning', () => {
    const wrapper = mountWithIntl(
      <DeleteTimelineModal
        title="Privilege Escalation"
        onDelete={vi.fn()}
        closeModal={vi.fn()}
      />
    );

    expect(wrapper.find('[data-test-subj="warning"]').first().text()).toEqual(
      i18n.DELETE_TIMELINE_TEMPLATE_WARNING
    );
  });
});
