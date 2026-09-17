/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import { waitForEuiPopoverOpen } from '@elastic/eui/lib/test/rtl';
import type { IHttpFetchError } from '@kbn/core/public';
import { OperatingSystem } from '@kbn/securitysolution-utils';
import { ENDPOINT_ARTIFACT_LISTS } from '@kbn/securitysolution-list-constants';
import '@kbn/code-editor-mock/jest_helper';
import { CustomYaraSignaturesForm } from './custom_yara_signatures_form';
import type {
  ArtifactFormComponentOnChangeCallbackProps,
  ArtifactFormComponentProps,
} from '../../../../components/artifact_list_page';
import type { AppContextTestRender } from '../../../../../common/mock/endpoint';
import { createAppRootMockRenderer } from '../../../../../common/mock/endpoint';
import { GLOBAL_ARTIFACT_TAG } from '../../../../../../common/endpoint/service/artifacts';
import { CUSTOM_YARA_SIGNATURE_FIELD_TYPE } from '../../../../../../common/endpoint/service/artifacts/constants';
import { CUSTOM_YARA_SIGNATURES_VALIDATE_ROUTE } from '../../../../../../common/endpoint/constants';
import { OS_TITLES } from '../../../../common/translations';
import { VALIDATE_CUSTOM_YARA_SIGNATURE_DEBOUNCE_MS } from '../../hooks/use_validate_custom_yara_signature';
import {
  DEFINITION_DESCRIPTION,
  DEFINITION_TITLE,
  DETAILS_DESCRIPTION,
  FORM_TITLE,
  NAME_ERROR,
  OPTIONAL_LABEL,
  OS_ERROR,
} from './translations';

jest.mock('../../../../../common/components/user_privileges');

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
      os_types: [OperatingSystem.WINDOWS],
      tags: [GLOBAL_ARTIFACT_TAG],
    };
    return {
      ...defaults,
      ...overrides,
    };
  }

  function createYaraEntry(value: string) {
    return {
      field: CUSTOM_YARA_SIGNATURE_FIELD_TYPE,
      operator: 'included' as const,
      type: 'match' as const,
      value,
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
    mockedContext.coreStart.http.post.mockResolvedValue({
      errors: [],
      warnings: [],
      error_count: 0,
      warning_count: 0,
    });
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
    expect(screen.getByTestId('customYaraSignatures-form-os-input')).toBeInTheDocument();
    expect(screen.getByTestId('customYaraSignatures-form-description-input')).toHaveValue('');
    expect(screen.getByText(OPTIONAL_LABEL)).toBeInTheDocument();
    expect(screen.getByText(DEFINITION_TITLE)).toBeInTheDocument();
    expect(screen.getByTestId('customYaraSignatures-form-definitionAbout')).toHaveTextContent(
      DEFINITION_DESCRIPTION
    );
    expect(screen.getByTestId('customYaraSignatures-form-signature-input')).toHaveValue('');
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
        isValid: false,
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

  it('should select the global policy by default', () => {
    render();
    expect(
      screen
        .getByTestId('customYaraSignatures-form-effectedPolicies-global')
        .classList.contains('euiButtonGroupButton-isSelected')
    ).toBe(true);
  });

  describe('operating system selector', () => {
    const formPrefix = 'customYaraSignatures-form';

    const openOsCombo = async () => {
      const combo = screen.getByTestId(`${formPrefix}-os-input`);
      await user.click(within(combo).getByTestId('comboBoxToggleListButton'));
      await waitForEuiPopoverOpen();
    };

    it('should sit between name and description', () => {
      const { container } = render();
      const labels = Array.from(container.querySelectorAll('.euiFormRow__label')).map((label) =>
        (label.textContent || '').trim()
      );

      expect(labels).toEqual(['Name', 'Operating system', 'Description']);
    });

    it('should allow selecting any combination of Windows, Mac, and Linux', async () => {
      render(createProps({ item: createItem({ os_types: [] }) }));
      await openOsCombo();

      const options = Array.from(document.querySelectorAll('.euiComboBoxOption')).map((el) =>
        el.textContent?.trim()
      );

      expect(options).toEqual([
        OS_TITLES[OperatingSystem.WINDOWS],
        OS_TITLES[OperatingSystem.MAC],
        OS_TITLES[OperatingSystem.LINUX],
      ]);
    });

    it('should default os_types to Windows', () => {
      render();
      expect(
        within(screen.getByTestId(`${formPrefix}-os-input`)).getByTitle(
          OS_TITLES[OperatingSystem.WINDOWS]
        )
      ).toBeInTheDocument();
    });

    it('should add Mac to os_types', async () => {
      render();
      await openOsCombo();
      await user.click(screen.getByRole('option', { name: OS_TITLES[OperatingSystem.MAC] }));

      expect(onChangeSpy).toHaveBeenCalledWith(
        createOnChangeArgs({
          item: createItem({ os_types: [OperatingSystem.WINDOWS, OperatingSystem.MAC] }),
          isValid: false,
        })
      );
    });

    it('should populate os_types with all three operating systems', async () => {
      render(
        createProps({
          item: createItem({
            os_types: [OperatingSystem.WINDOWS, OperatingSystem.MAC],
          }),
        })
      );
      await openOsCombo();
      await user.click(screen.getByRole('option', { name: OS_TITLES[OperatingSystem.LINUX] }));

      expect(onChangeSpy).toHaveBeenCalledWith(
        createOnChangeArgs({
          item: createItem({
            os_types: [OperatingSystem.WINDOWS, OperatingSystem.MAC, OperatingSystem.LINUX],
          }),
          isValid: false,
        })
      );
    });

    it('should be invalid if no operating system is selected', async () => {
      render(createProps({ item: createItem({ name: 'test name' }) }));
      await user.click(
        screen.getByTitle(
          `Remove ${OS_TITLES[OperatingSystem.WINDOWS]} from selection in this group`
        )
      );

      expect(onChangeSpy).toHaveBeenCalledWith(
        createOnChangeArgs({
          item: createItem({ name: 'test name', os_types: [] }),
          isValid: false,
        })
      );
    });

    it('should show OS required message after OS input blur when empty', async () => {
      render(createProps({ item: createItem({ os_types: [] }) }));

      await user.click(
        within(screen.getByTestId(`${formPrefix}-os-input`)).getByTestId('comboBoxSearchInput')
      );
      expect(screen.queryByText(OS_ERROR)).toBeNull();

      await user.click(screen.getByTestId(`${formPrefix}-description-input`));
      expect(screen.getByText(OS_ERROR)).toBeInTheDocument();
    });
  });

  describe('signature editor', () => {
    it('should sit after description and before policy assignment', () => {
      const { container } = render();
      const titles = Array.from(container.querySelectorAll('h2')).map((title) =>
        (title.textContent || '').trim()
      );

      expect(titles).toEqual(['Details', 'Definition']);
    });

    it('should render a vertically resizable editor container', () => {
      render();

      expect(
        screen.getByTestId('customYaraSignatures-form-signature-input-container')
      ).toBeInTheDocument();
    });

    it('should populate the editor from the existing entry value', () => {
      const signature = 'rule Example { condition: true }';
      render(
        createProps({
          item: createItem({
            entries: [createYaraEntry(signature)],
          }),
        })
      );

      expect(screen.getByTestId('customYaraSignatures-form-signature-input')).toHaveValue(
        signature
      );
    });

    it('should store the editor value in a custom YARA signature entry', async () => {
      render();
      await user.type(screen.getByTestId('customYaraSignatures-form-signature-input'), 'z');

      expect(onChangeSpy).toHaveBeenCalledWith(
        createOnChangeArgs({
          item: createItem({
            entries: [createYaraEntry('z')],
          }),
          isValid: false,
        })
      );
    });
  });

  describe('signature validation', () => {
    const signature = 'rule Example { condition: true }';

    const renderWithSignature = (overrides: Partial<ArtifactFormComponentProps['item']> = {}) =>
      render(
        createProps({
          item: createItem({
            entries: [createYaraEntry(signature)],
            ...overrides,
          }),
        })
      );

    const flushValidationDebounce = () => {
      act(() => {
        jest.advanceTimersByTime(VALIDATE_CUSTOM_YARA_SIGNATURE_DEBOUNCE_MS);
      });
    };

    it('should not call the validate API when the editor is empty', () => {
      render();
      flushValidationDebounce();

      expect(mockedContext.coreStart.http.post).not.toHaveBeenCalledWith(
        CUSTOM_YARA_SIGNATURES_VALIDATE_ROUTE,
        expect.anything()
      );
    });

    it('should not call the validate API when no operating system is selected', () => {
      renderWithSignature({ os_types: [] });
      flushValidationDebounce();

      expect(mockedContext.coreStart.http.post).not.toHaveBeenCalledWith(
        CUSTOM_YARA_SIGNATURES_VALIDATE_ROUTE,
        expect.anything()
      );
    });

    it('should debounce validate API calls until the user finishes typing', async () => {
      const view = renderWithSignature();
      flushValidationDebounce();

      await waitFor(() => {
        expect(mockedContext.coreStart.http.post).toHaveBeenCalledTimes(1);
      });
      mockedContext.coreStart.http.post.mockClear();

      view.rerender(
        <CustomYaraSignaturesForm
          {...createProps({
            item: createItem({
              entries: [createYaraEntry(`${signature} extra`)],
            }),
          })}
        />
      );

      expect(mockedContext.coreStart.http.post).not.toHaveBeenCalled();

      act(() => {
        jest.advanceTimersByTime(VALIDATE_CUSTOM_YARA_SIGNATURE_DEBOUNCE_MS - 1);
      });
      expect(mockedContext.coreStart.http.post).not.toHaveBeenCalled();

      flushValidationDebounce();

      await waitFor(() => {
        expect(mockedContext.coreStart.http.post).toHaveBeenCalledWith(
          CUSTOM_YARA_SIGNATURES_VALIDATE_ROUTE,
          expect.objectContaining({
            version: '1',
            body: JSON.stringify({
              yara_rule: `${signature} extra`,
              os_types: [OperatingSystem.WINDOWS],
            }),
          })
        );
      });
    });

    it('should list validation errors and warnings below the editor', async () => {
      mockedContext.coreStart.http.post.mockResolvedValue({
        errors: [{ message: 'syntax error', line: 2, severity: 'error' }],
        warnings: [{ message: 'unused identifier', line: 4, severity: 'warning' }],
        error_count: 1,
        warning_count: 1,
      });

      renderWithSignature();
      flushValidationDebounce();

      await waitFor(() => {
        expect(screen.getByTestId('customYaraSignatures-form-validation-error')).toHaveTextContent(
          'Line 2: syntax error'
        );
      });
      expect(screen.getByTestId('customYaraSignatures-form-validation-warning')).toHaveTextContent(
        'Line 4: unused identifier'
      );
    });

    it('should validate again when operating systems change', async () => {
      const view = renderWithSignature();
      flushValidationDebounce();

      await waitFor(() => {
        expect(mockedContext.coreStart.http.post).toHaveBeenCalledTimes(1);
      });

      mockedContext.coreStart.http.post.mockClear();
      view.rerender(
        <CustomYaraSignaturesForm
          {...createProps({
            item: createItem({
              entries: [createYaraEntry(signature)],
              os_types: [OperatingSystem.LINUX],
            }),
          })}
        />
      );
      flushValidationDebounce();

      await waitFor(() => {
        expect(mockedContext.coreStart.http.post).toHaveBeenCalledWith(
          CUSTOM_YARA_SIGNATURES_VALIDATE_ROUTE,
          expect.objectContaining({
            body: JSON.stringify({
              yara_rule: signature,
              os_types: [OperatingSystem.LINUX],
            }),
          })
        );
      });
    });

    it('should show a request error when validation fails', async () => {
      mockedContext.coreStart.http.post.mockRejectedValue(new Error('network down'));

      renderWithSignature();
      flushValidationDebounce();

      await waitFor(() => {
        expect(
          screen.getByTestId('customYaraSignatures-form-validation-requestError')
        ).toHaveTextContent('Unable to validate YARA signature. Please try again.');
      });
    });

    it('should set isValid to true when validation succeeds', async () => {
      renderWithSignature({ name: 'test name' });
      flushValidationDebounce();

      await waitFor(() => {
        expect(onChangeSpy).toHaveBeenCalledWith(
          createOnChangeArgs({
            item: createItem({
              name: 'test name',
              entries: [createYaraEntry(signature)],
            }),
            isValid: true,
          })
        );
      });
    });

    it('should set isValid to false when validation returns errors', async () => {
      mockedContext.coreStart.http.post.mockResolvedValue({
        errors: [{ message: 'syntax error', line: 2, severity: 'error' }],
        warnings: [],
        error_count: 1,
        warning_count: 0,
      });

      renderWithSignature({ name: 'test name' });
      flushValidationDebounce();

      await waitFor(() => {
        expect(onChangeSpy).toHaveBeenCalledWith(
          createOnChangeArgs({
            item: createItem({
              name: 'test name',
              entries: [createYaraEntry(signature)],
            }),
            isValid: false,
          })
        );
      });
    });

    it('should set isValid to false when the validation request fails', async () => {
      mockedContext.coreStart.http.post.mockRejectedValue(new Error('network down'));

      renderWithSignature({ name: 'test name' });
      flushValidationDebounce();

      await waitFor(() => {
        expect(onChangeSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            isValid: false,
          })
        );
      });
    });

    it('should hide validation diagnostics while the signature is being edited', async () => {
      mockedContext.coreStart.http.post.mockResolvedValue({
        errors: [{ message: 'syntax error', line: 2, severity: 'error' }],
        warnings: [{ message: 'unused identifier', line: 4, severity: 'warning' }],
        error_count: 1,
        warning_count: 1,
      });

      const view = renderWithSignature();

      await waitFor(() => {
        expect(screen.getByTestId('customYaraSignatures-form-validation-error')).toBeInTheDocument();
      });

      view.rerender(
        <CustomYaraSignaturesForm
          {...createProps({
            item: createItem({
              entries: [createYaraEntry(`${signature} extra`)],
            }),
          })}
        />
      );

      expect(
        screen.queryByTestId('customYaraSignatures-form-validation-error')
      ).not.toBeInTheDocument();
      expect(
        screen.queryByTestId('customYaraSignatures-form-validation-warning')
      ).not.toBeInTheDocument();
    });

    it('should restore cached diagnostics without refetching when the signature is reverted', async () => {
      mockedContext.coreStart.http.post.mockResolvedValue({
        errors: [{ message: 'syntax error', line: 2, severity: 'error' }],
        warnings: [],
        error_count: 1,
        warning_count: 0,
      });

      const view = renderWithSignature();

      await waitFor(() => {
        expect(screen.getByTestId('customYaraSignatures-form-validation-error')).toHaveTextContent(
          'Line 2: syntax error'
        );
      });
      expect(mockedContext.coreStart.http.post).toHaveBeenCalledTimes(1);

      view.rerender(
        <CustomYaraSignaturesForm
          {...createProps({
            item: createItem({
              entries: [createYaraEntry(`${signature} extra`)],
            }),
          })}
        />
      );
      expect(
        screen.queryByTestId('customYaraSignatures-form-validation-error')
      ).not.toBeInTheDocument();

      view.rerender(
        <CustomYaraSignaturesForm
          {...createProps({
            item: createItem({
              entries: [createYaraEntry(signature)],
            }),
          })}
        />
      );

      expect(screen.getByTestId('customYaraSignatures-form-validation-error')).toHaveTextContent(
        'Line 2: syntax error'
      );
      expect(mockedContext.coreStart.http.post).toHaveBeenCalledTimes(1);
    });
  });
});
