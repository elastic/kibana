/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import type { IHttpFetchError } from '@kbn/core/public';
import { ENDPOINT_ARTIFACT_LISTS } from '@kbn/securitysolution-list-constants';
import { CustomYaraSignaturesForm } from './custom_yara_signatures_form';
import type {
  ArtifactFormComponentOnChangeCallbackProps,
  ArtifactFormComponentProps,
} from '../../../../components/artifact_list_page';
import type { AppContextTestRender } from '../../../../../common/mock/endpoint';
import { createAppRootMockRenderer } from '../../../../../common/mock/endpoint';
import { DETAILS_DESCRIPTION, FORM_TITLE, NAME_ERROR, OPTIONAL_LABEL } from './translations';

describe('Custom YARA signatures form', () => {
  let user: UserEvent;
  let onChangeSpy: jest.Mock;
  let render: (props?: ArtifactFormComponentProps) => ReturnType<AppContextTestRender['render']>;
  let mockedContext: AppContextTestRender;

  function createItem(
    overrides: Partial<ArtifactFormComponentProps['item']> = {}
  ): ArtifactFormComponentProps['item'] {
    const defaults: ArtifactFormComponentProps['item'] = {
      list_id: ENDPOINT_ARTIFACT_LISTS.customYaraSignatures.id,
      name: '',
      description: '',
      entries: [],
      type: 'simple',
    };
    return {
      ...defaults,
      ...overrides,
    };
  }

  function createProps(
    overrides: Partial<ArtifactFormComponentProps> = {}
  ): ArtifactFormComponentProps {
    const defaults: ArtifactFormComponentProps = {
      item: createItem(),
      onChange: onChangeSpy,
      mode: 'create',
      disabled: false,
      error: undefined,
    };

    return {
      ...defaults,
      ...overrides,
    };
  }

  function createOnChangeArgs(
    overrides: Partial<ArtifactFormComponentOnChangeCallbackProps>
  ): ArtifactFormComponentOnChangeCallbackProps {
    const defaults = {
      item: createItem(),
      isValid: false,
    };
    return {
      ...defaults,
      ...overrides,
    };
  }

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    onChangeSpy = jest.fn();
    mockedContext = createAppRootMockRenderer();
    render = (props = createProps()) =>
      mockedContext.render(<CustomYaraSignaturesForm {...props} />);
  });

  it('should render the title, details, name, and optional description fields', () => {
    render();

    expect(screen.getByText(FORM_TITLE)).toBeInTheDocument();
    expect(screen.getByTestId('customYaraSignatures-form-about')).toHaveTextContent(
      DETAILS_DESCRIPTION
    );
    expect(screen.getByTestId('customYaraSignatures-form-name-input')).toHaveValue('');
    expect(screen.getByTestId('customYaraSignatures-form-description-input')).toHaveValue('');
    expect(screen.getByText(OPTIONAL_LABEL)).toBeInTheDocument();
  });

  it('should show name required message after name input blur', async () => {
    render();

    await user.click(screen.getByTestId('customYaraSignatures-form-name-input'));
    expect(screen.queryByText(NAME_ERROR)).toBeNull();

    await user.click(screen.getByTestId('customYaraSignatures-form-description-input'));
    expect(screen.getByText(NAME_ERROR)).toBeInTheDocument();
  });

  it('should not require description', () => {
    render();
    expect(
      screen.getByTestId('customYaraSignatures-form-description-input').hasAttribute('required')
    ).toEqual(false);
  });

  it('should correctly edit name', async () => {
    render();
    await user.type(screen.getByTestId('customYaraSignatures-form-name-input'), 'z');

    expect(onChangeSpy).toHaveBeenCalledWith(
      createOnChangeArgs({
        item: createItem({ name: 'z' }),
        isValid: true,
      })
    );
  });

  it('should be invalid if name is empty', async () => {
    render(createProps({ item: createItem({ name: 'test name' }) }));
    await user.clear(screen.getByTestId('customYaraSignatures-form-name-input'));

    expect(onChangeSpy).toHaveBeenCalledWith(
      createOnChangeArgs({
        item: createItem({ name: '' }),
        isValid: false,
      })
    );
  });

  it('should correctly edit description', async () => {
    render();
    await user.type(screen.getByTestId('customYaraSignatures-form-description-input'), 'z');

    expect(onChangeSpy).toHaveBeenCalledWith(
      createOnChangeArgs({
        item: createItem({ description: 'z' }),
        isValid: false,
      })
    );
  });

  it('should display form submission errors', () => {
    const message = 'submit failure';
    render(createProps({ error: new Error(message) as IHttpFetchError }));

    expect(screen.getByTestId('customYaraSignatures-form-submitError')).toHaveTextContent(message);
  });
});
