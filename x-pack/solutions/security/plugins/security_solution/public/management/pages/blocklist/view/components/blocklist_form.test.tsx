/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, fireEvent } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import { waitForEuiPopoverOpen } from '@elastic/eui/lib/test/rtl';
import type { BlocklistConditionEntryField } from '@kbn/securitysolution-utils';
import { OperatingSystem } from '@kbn/securitysolution-utils';

import type { BlocklistEntry } from './blocklist_form';
import { BlockListForm } from './blocklist_form';
import type {
  ArtifactFormComponentOnChangeCallbackProps,
  ArtifactFormComponentProps,
} from '../../../../components/artifact_list_page';
import type { AppContextTestRender } from '../../../../../common/mock/endpoint';
import { createAppRootMockRenderer } from '../../../../../common/mock/endpoint';
import { ERRORS } from '../../translations';
import { licenseService } from '../../../../../common/hooks/use_license';
import { GLOBAL_ARTIFACT_TAG } from '../../../../../../common/endpoint/service/artifacts';
import { ListOperatorEnum, ListOperatorTypeEnum } from '@kbn/securitysolution-io-ts-list-types';
import { ENDPOINT_ARTIFACT_LISTS } from '@kbn/securitysolution-list-constants';
import type { IHttpFetchError } from '@kbn/core/public';

jest.mock('../../../../../common/components/user_privileges');

jest.mock('../../../../../common/hooks/use_license', () => {
  const licenseServiceInstance = {
    isPlatinumPlus: jest.fn(),
  };
  return {
    licenseService: licenseServiceInstance,
    useLicense: () => {
      return licenseServiceInstance;
    },
  };
});

const blocklistOperatorFieldTestCases = [
  {
    os: OperatingSystem.LINUX,
    field: 'file.path',
    fieldText: 'Path',
    osText: 'Linux',
    isMulti: true,
  },
  {
    os: OperatingSystem.LINUX,
    field: 'file.hash.*',
    fieldText: 'Hash',
    osText: 'Linux',
    isMulti: false,
  },
  {
    os: OperatingSystem.LINUX,
    field: 'file.name',
    fieldText: 'File Name',
    osText: 'Linux',
    isMulti: true,
  },
  {
    os: OperatingSystem.WINDOWS,
    field: 'file.path.caseless',
    fieldText: 'Path',
    osText: 'Windows',
    isMulti: true,
  },
  {
    os: OperatingSystem.WINDOWS,
    field: 'file.hash.*',
    fieldText: 'Hash',
    osText: 'Windows',
    isMulti: false,
  },
  {
    os: OperatingSystem.WINDOWS,
    field: 'file.Ext.code_signature',
    fieldText: 'Signature',
    osText: 'Windows',
    isMulti: true,
  },
  {
    os: OperatingSystem.WINDOWS,
    field: 'file.name',
    fieldText: 'File Name',
    osText: 'Windows',
    isMulti: true,
  },
  {
    os: OperatingSystem.MAC,
    field: 'file.path.caseless',
    fieldText: 'Path',
    osText: 'Mac',
    isMulti: true,
  },
  {
    os: OperatingSystem.MAC,
    field: 'file.hash.*',
    fieldText: 'Hash',
    osText: 'Mac',
    isMulti: false,
  },
  {
    os: OperatingSystem.MAC,
    field: 'file.name',
    fieldText: 'File Name',
    osText: 'Mac',
    isMulti: true,
  },
];

describe('blocklist form', () => {
  let user: UserEvent;
  let onChangeSpy: jest.Mock;
  let render: (props?: ArtifactFormComponentProps) => ReturnType<AppContextTestRender['render']>;
  let mockedContext: AppContextTestRender;

  function createEntry(field: BlocklistConditionEntryField, value: string[]): BlocklistEntry {
    return {
      field,
      operator: ListOperatorEnum.INCLUDED,
      type: ListOperatorTypeEnum.MATCH_ANY,
      value,
    };
  }

  function createItem(
    overrides: Partial<ArtifactFormComponentProps['item']> = {}
  ): ArtifactFormComponentProps['item'] {
    const defaults: ArtifactFormComponentProps['item'] = {
      list_id: ENDPOINT_ARTIFACT_LISTS.blocklists.id,
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
      mode: 'create' as ArtifactFormComponentProps['mode'],
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
    // Workaround for timeout via https://github.com/testing-library/user-event/issues/833#issuecomment-1171452841
    user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    onChangeSpy = jest.fn();
    (licenseService.isPlatinumPlus as jest.Mock).mockReturnValue(true);
    mockedContext = createAppRootMockRenderer();
    render = (props = createProps()) => mockedContext.render(<BlockListForm {...props} />);
  });

  it('should hide details text when in edit mode', () => {
    render(createProps({ mode: 'edit' }));
    expect(screen.queryByTestId('blocklist-form-header-description')).toBeNull();
  });

  it('should show name required message after name input blur', async () => {
    render();
    await user.click(screen.getByTestId('blocklist-form-name-input'));
    expect(screen.queryByText(ERRORS.NAME_REQUIRED)).toBeNull();
    await user.click(screen.getByTestId('blocklist-form-os-select'));
    expect(screen.queryByText(ERRORS.NAME_REQUIRED)).toBeTruthy();
  });

  it('should be invalid if no name', async () => {
    render(createProps({ item: createItem({ name: 'test name' }) }));
    await user.clear(screen.getByTestId('blocklist-form-name-input'));
    const expected = createOnChangeArgs({ item: createItem({ name: '' }) });
    expect(onChangeSpy).toHaveBeenCalledWith(expected);
  });

  it('should correctly edit name', async () => {
    render();
    await user.type(screen.getByTestId('blocklist-form-name-input'), 'z');
    const expected = createOnChangeArgs({
      item: createItem({ name: 'z' }),
    });
    expect(onChangeSpy).toHaveBeenCalledWith(expected);
  });

  it('should not require description', () => {
    render();
    expect(screen.getByTestId('blocklist-form-description-input').hasAttribute('required')).toEqual(
      false
    );
  });

  it('should correctly edit description', async () => {
    render();
    await user.type(screen.getByTestId('blocklist-form-description-input'), 'z');
    const expected = createOnChangeArgs({
      item: createItem({ description: 'z' }),
    });
    expect(onChangeSpy).toHaveBeenCalledWith(expected);
  });

  it('should correctly default OS to windows', () => {
    render();
    expect(screen.getByTestId('blocklist-form-os-select').textContent).toEqual('Windows');
  });

  it('should allow user to select between 3 OSs', async () => {
    render();
    await user.click(screen.getByTestId('blocklist-form-os-select'));
    expect(screen.queryAllByRole('option').length).toEqual(3);
    expect(screen.queryByRole('option', { name: 'Windows' })).toBeTruthy();
    expect(screen.queryByRole('option', { name: 'Linux' })).toBeTruthy();
    expect(screen.queryByRole('option', { name: 'Mac' })).toBeTruthy();
  });

  it('should correctly edit OS', async () => {
    render();
    await user.click(screen.getByTestId('blocklist-form-os-select'));
    await waitForEuiPopoverOpen();
    await user.click(screen.getByRole('option', { name: 'Linux' }));
    const expected = createOnChangeArgs({
      item: createItem({
        os_types: [OperatingSystem.LINUX],
        entries: [createEntry('file.hash.*', [])],
      }),
    });
    expect(onChangeSpy).toHaveBeenCalledWith(expected);
  });

  it('should correctly default field to hash', () => {
    render();
    expect(screen.getByTestId('blocklist-form-field-select').textContent).toEqual('Hash');
  });

  describe.each(blocklistOperatorFieldTestCases)(
    'should correctly render operator field for $os OS, $fieldText',
    ({ os, field, fieldText, osText, isMulti }) => {
      it(`should correctly render operator field for ${os} OS, ${fieldText}`, () => {
        const validItem: ArtifactFormComponentProps['item'] = {
          list_id: ENDPOINT_ARTIFACT_LISTS.blocklists.id,
          name: 'test name',
          description: 'test description',
          entries: [createEntry(field as BlocklistConditionEntryField, isMulti ? ['hello'] : [])],
          os_types: [os],
          tags: [GLOBAL_ARTIFACT_TAG],
          type: 'simple',
        };

        render(createProps({ item: validItem }));
        expect(screen.getByTestId('blocklist-form-os-select').textContent).toEqual(osText);
        expect(screen.getByTestId('blocklist-form-field-select').textContent).toEqual(fieldText);

        if (isMulti) {
          expect(screen.queryByTestId('blocklist-form-operator-select-single')).toBeNull();
          const element = screen.getByTestId('blocklist-form-operator-select-multi');
          expect(element).toBeTruthy();
          expect(element.textContent).toEqual('is one of');
          expect(element).not.toHaveAttribute('readonly');
        } else {
          expect(screen.queryByTestId('blocklist-form-operator-select-multi')).toBeNull();
          const element = screen.getByTestId('blocklist-form-operator-select-single');
          expect(element).toBeTruthy();
          expect(element).toHaveValue('is one of');
          expect(element).toHaveAttribute('readonly');
        }
      });
    }
  );

  it('should allow all 4 fields when Windows OS is selected', async () => {
    render();
    expect(screen.getByTestId('blocklist-form-os-select').textContent).toEqual('Windows');

    await user.click(screen.getByTestId('blocklist-form-field-select'));
    expect(screen.queryAllByRole('option').length).toEqual(4);
    expect(screen.queryByRole('option', { name: /hash/i })).toBeTruthy();
    expect(screen.queryByRole('option', { name: /path/i })).toBeTruthy();
    expect(screen.queryByRole('option', { name: /signature/i })).toBeTruthy();
    expect(screen.queryByRole('option', { name: /file name/i })).toBeTruthy();
  });

  it('should only allow hash, path, and file name fields when Linux OS is selected', async () => {
    render(createProps({ item: createItem({ os_types: [OperatingSystem.LINUX] }) }));
    expect(screen.getByTestId('blocklist-form-os-select').textContent).toEqual('Linux');

    await user.click(screen.getByTestId('blocklist-form-field-select'));
    expect(screen.queryAllByRole('option').length).toEqual(3);
    expect(screen.queryByRole('option', { name: /hash/i })).toBeTruthy();
    expect(screen.queryByRole('option', { name: /path/i })).toBeTruthy();
    expect(screen.queryByRole('option', { name: /file name/i })).toBeTruthy();
    expect(screen.queryByRole('option', { name: /signature/i })).toBeNull();
  });

  it('should only allow hash, path, and file name fields when Mac OS is selected', async () => {
    render(createProps({ item: createItem({ os_types: [OperatingSystem.MAC] }) }));
    expect(screen.getByTestId('blocklist-form-os-select').textContent).toEqual('Mac');

    await user.click(screen.getByTestId('blocklist-form-field-select'));
    expect(screen.queryAllByRole('option').length).toEqual(3);
    expect(screen.queryByRole('option', { name: /hash/i })).toBeTruthy();
    expect(screen.queryByRole('option', { name: /path/i })).toBeTruthy();
    expect(screen.queryByRole('option', { name: /file name/i })).toBeTruthy();
    expect(screen.queryByRole('option', { name: /signature/i })).toBeNull();
  });

  it('should correctly edit field', async () => {
    render();
    await user.click(screen.getByTestId('blocklist-form-field-select'));
    await waitForEuiPopoverOpen();
    await user.click(screen.getByRole('option', { name: /path/i }));
    const expected = createOnChangeArgs({
      item: createItem({
        entries: [createEntry('file.path.caseless', [])],
      }),
    });
    expect(onChangeSpy).toHaveBeenCalledWith(expected);
  });

  it('should convert an entered signature value when switching operator then field', async () => {
    const signatureValues = ['signer-a', 'signer-b'];
    const { rerender } = render(
      createProps({
        item: createItem({
          os_types: [OperatingSystem.WINDOWS],
          entries: [createEntry('file.Ext.code_signature', signatureValues)],
        }),
      })
    );

    await user.click(screen.getByTestId('blocklist-form-operator-select-multi'));
    await waitForEuiPopoverOpen();
    await user.click(screen.getByRole('option', { name: /^is$/i }));

    const afterOperatorChange = onChangeSpy.mock.calls.at(-1)?.[0] as
      | ArtifactFormComponentOnChangeCallbackProps
      | undefined;
    expect(afterOperatorChange?.item.entries).toEqual([
      {
        field: 'file.Ext.code_signature',
        operator: ListOperatorEnum.INCLUDED,
        type: ListOperatorTypeEnum.MATCH,
        value: signatureValues.join(','),
      },
    ]);

    rerender(<BlockListForm {...createProps({ item: afterOperatorChange?.item })} />);

    await user.click(screen.getByTestId('blocklist-form-field-select'));
    await waitForEuiPopoverOpen();
    await user.click(screen.getByRole('option', { name: /path/i }));

    const afterFieldChange = onChangeSpy.mock.calls.at(-1)?.[0] as
      | ArtifactFormComponentOnChangeCallbackProps
      | undefined;
    expect(afterFieldChange?.item.entries).toEqual([
      createEntry('file.path.caseless', signatureValues),
    ]);
  });

  it('should correctly create `file.path.caseless` when Mac OS is selected', async () => {
    render(createProps({ item: createItem({ os_types: [OperatingSystem.MAC] }) }));
    expect(screen.getByTestId('blocklist-form-os-select').textContent).toEqual('Mac');

    await user.click(screen.getByTestId('blocklist-form-field-select'));
    await waitForEuiPopoverOpen();
    await user.click(screen.getByRole('option', { name: /path/i }));
    const expected = createOnChangeArgs({
      item: createItem({
        os_types: [OperatingSystem.MAC],
        entries: [createEntry('file.path.caseless', [])],
      }),
    });
    expect(onChangeSpy).toHaveBeenCalledWith(expected);
  });

  it('should correctly create `file.path` when Linux is selected', async () => {
    render(createProps({ item: createItem({ os_types: [OperatingSystem.LINUX] }) }));
    expect(screen.getByTestId('blocklist-form-os-select').textContent).toEqual('Linux');

    await user.click(screen.getByTestId('blocklist-form-field-select'));
    await waitForEuiPopoverOpen();
    await user.click(screen.getByRole('option', { name: /path/i }));
    const expected = createOnChangeArgs({
      item: createItem({
        os_types: [OperatingSystem.LINUX],
        entries: [createEntry('file.path', [])],
      }),
    });
    expect(onChangeSpy).toHaveBeenCalledWith(expected);
  });

  describe('Match (wildcard) operator', () => {
    const buildPathItem = (
      entries: ArtifactFormComponentProps['item']['entries'] = [
        createEntry('file.path.caseless', []),
      ]
    ): ArtifactFormComponentProps['item'] =>
      createItem({
        os_types: [OperatingSystem.WINDOWS],
        entries,
      });

    it('should offer the Match operator for the Path field', async () => {
      render(createProps({ item: buildPathItem() }));
      await user.click(screen.getByTestId('blocklist-form-operator-select-multi'));
      await waitForEuiPopoverOpen();
      expect(screen.queryByRole('option', { name: /^match$/i })).toBeTruthy();
    });

    it('should not offer the Match operator for the Signer field', async () => {
      const item = createItem({
        os_types: [OperatingSystem.WINDOWS],
        entries: [createEntry('file.Ext.code_signature', [])],
      });
      render(createProps({ item }));
      await user.click(screen.getByTestId('blocklist-form-operator-select-multi'));
      await waitForEuiPopoverOpen();
      expect(screen.queryByRole('option', { name: /^match$/i })).toBeNull();
      expect(screen.queryByRole('option', { name: /^is$/i })).toBeTruthy();
    });

    it('should switch the entry to a single wildcard value when the Match operator is selected', async () => {
      const item = buildPathItem([createEntry('file.path.caseless', ['C:\\foo\\notepad.exe'])]);
      render(createProps({ item }));
      await user.click(screen.getByTestId('blocklist-form-operator-select-multi'));
      await waitForEuiPopoverOpen();
      await user.click(screen.getByRole('option', { name: /^match$/i }));

      const lastCall = onChangeSpy.mock.calls.at(-1)?.[0] as
        | ArtifactFormComponentOnChangeCallbackProps
        | undefined;
      expect(lastCall?.item.entries).toEqual([
        {
          field: 'file.path.caseless',
          operator: ListOperatorEnum.INCLUDED,
          type: ListOperatorTypeEnum.WILDCARD,
          value: 'C:\\foo\\notepad.exe',
        },
      ]);
    });

    describe('File Name field case-sensitivity', () => {
      const selectMatchOperator = async () => {
        await user.click(screen.getByTestId('blocklist-form-operator-select-multi'));
        await waitForEuiPopoverOpen();
        await user.click(screen.getByRole('option', { name: /^match$/i }));
      };

      const lastEntries = () => {
        const lastCall = onChangeSpy.mock.calls.at(-1)?.[0] as
          | ArtifactFormComponentOnChangeCallbackProps
          | undefined;
        return lastCall?.item.entries;
      };

      it.each([[OperatingSystem.WINDOWS], [OperatingSystem.MAC]])(
        'should use the caseless field when Match is selected on %s',
        async (os) => {
          const item = createItem({
            os_types: [os],
            entries: [createEntry('file.name', ['notepad.exe'])],
          });
          render(createProps({ item }));

          await selectMatchOperator();

          expect(lastEntries()).toEqual([
            {
              field: 'file.name.caseless',
              operator: ListOperatorEnum.INCLUDED,
              type: ListOperatorTypeEnum.WILDCARD,
              value: 'notepad.exe',
            },
          ]);
        }
      );

      it('should keep the cased field when Match is selected on Linux', async () => {
        const item = createItem({
          os_types: [OperatingSystem.LINUX],
          entries: [createEntry('file.name', ['notepad'])],
        });
        render(createProps({ item }));

        await selectMatchOperator();

        expect(lastEntries()).toEqual([
          {
            field: 'file.name',
            operator: ListOperatorEnum.INCLUDED,
            type: ListOperatorTypeEnum.WILDCARD,
            value: 'notepad',
          },
        ]);
      });

      it('should still show "File Name" selected in the field dropdown when the field is caseless', () => {
        const item = createItem({
          os_types: [OperatingSystem.WINDOWS],
          entries: [
            {
              field: 'file.name.caseless',
              operator: ListOperatorEnum.INCLUDED,
              type: ListOperatorTypeEnum.WILDCARD,
              value: '*.exe',
            },
          ],
        });
        render(createProps({ item }));

        expect(screen.getByTestId('blocklist-form-field-select').textContent).toEqual('File Name');
      });

      it('should reset to the cased field when switching back to "is one of"', async () => {
        const item = createItem({
          os_types: [OperatingSystem.WINDOWS],
          entries: [
            {
              field: 'file.name.caseless',
              operator: ListOperatorEnum.INCLUDED,
              type: ListOperatorTypeEnum.WILDCARD,
              value: 'notepad.exe',
            },
          ],
        });
        render(createProps({ item }));

        await user.click(screen.getByTestId('blocklist-form-operator-select-multi'));
        await waitForEuiPopoverOpen();
        await user.click(screen.getByRole('option', { name: /is one of/i }));

        expect(lastEntries()).toEqual([createEntry('file.name', ['notepad.exe'])]);
      });

      it('should reset to the cased field when the OS changes', async () => {
        const item = createItem({
          os_types: [OperatingSystem.WINDOWS],
          entries: [
            {
              field: 'file.name.caseless',
              operator: ListOperatorEnum.INCLUDED,
              type: ListOperatorTypeEnum.WILDCARD,
              value: 'notepad.exe',
            },
          ],
        });
        render(createProps({ item }));

        await user.click(screen.getByTestId('blocklist-form-os-select'));
        await waitForEuiPopoverOpen();
        await user.click(screen.getByRole('option', { name: 'Linux' }));

        expect(lastEntries()).toEqual([createEntry('file.name', ['notepad.exe'])]);
      });
    });

    it('should warn when a wildcard character is used without the Match operator', async () => {
      render(createProps({ item: buildPathItem() }));
      await user.type(screen.getByRole('combobox'), 'C:\\foo\\*.exe{enter}');
      expect(screen.queryByText(ERRORS.WILDCARD_WRONG_OPERATOR)).toBeTruthy();
    });

    it('should warn about the performance impact of a wildcard value with the Match operator', async () => {
      const item = buildPathItem([
        {
          field: 'file.path.caseless',
          operator: ListOperatorEnum.INCLUDED,
          type: ListOperatorTypeEnum.WILDCARD,
          value: '',
        },
      ]);
      const { rerender } = render(createProps({ item }));
      fireEvent.change(screen.getByTestId('blocklist-form-value-input'), {
        target: { value: 'C:\\foo\\*.exe' },
      });
      rerender(<BlockListForm {...createProps({ item })} />);
      expect(screen.queryByText(ERRORS.WILDCARD_PRESENT)).toBeTruthy();
    });

    it('should warn about unnecessary escaping when using the Match operator', async () => {
      const item = buildPathItem([
        {
          field: 'file.path.caseless',
          operator: ListOperatorEnum.INCLUDED,
          type: ListOperatorTypeEnum.WILDCARD,
          value: '',
        },
      ]);
      const { rerender } = render(createProps({ item }));
      fireEvent.change(screen.getByTestId('blocklist-form-value-input'), {
        target: { value: 'C:\\foo\\*.exe' },
      });
      rerender(<BlockListForm {...createProps({ item })} />);
      expect(screen.queryByText(ERRORS.UNNECESSARY_ESCAPING)).toBeTruthy();
    });
  });

  it('should correctly edit single value', async () => {
    render();
    const hash = 'C3AB8FF13720E8AD9047DD39466B3C8974E592C2FA383D4A3960714CAEF0C4F2';
    await user.type(screen.getByRole('combobox'), `${hash}{enter}`);
    const expected = createOnChangeArgs({
      item: createItem({
        entries: [createEntry('file.hash.*', [hash])],
      }),
    });
    expect(onChangeSpy).toHaveBeenCalledWith(expected);
  });

  it('should correctly edit comma delimited value', async () => {
    render();
    const hashes = [
      'C3AB8FF13720E8AD9047DD39466B3C8974E592C2FA383D4A3960714CAEF0C4F2',
      '4F4C17F77EC2483C49A9543B21AA75862F8F04F2D8806507E08086E21A51222C',
    ];
    // use paste instead of type, otherwise it might time out
    await user.click(screen.getByRole('combobox'));
    await user.paste(hashes.join(','));
    await user.keyboard('{Enter}');
    const expected = createOnChangeArgs({
      item: createItem({
        entries: [createEntry('file.hash.*', hashes)],
      }),
    });
    expect(onChangeSpy).toHaveBeenCalledWith(expected);
  });

  it('should remove duplicate values with warning if entering multi value', async () => {
    render();
    const hash = 'C3AB8FF13720E8AD9047DD39466B3C8974E592C2FA383D4A3960714CAEF0C4F2';
    const hashes = [hash, hash];
    // use paste instead of type, otherwise it might time out
    await user.click(screen.getByRole('combobox'));
    await user.paste(hashes.join(','));
    await user.keyboard('{Enter}');
    expect(screen.queryByText(ERRORS.DUPLICATE_VALUES)).toBeTruthy();
    const expected = createOnChangeArgs({
      item: createItem({
        entries: [createEntry('file.hash.*', [hash])],
      }),
    });
    expect(onChangeSpy).toHaveBeenCalledWith(expected);
  });

  it('should show value required after value input blur', async () => {
    render(createProps({ item: createItem({ entries: [createEntry('file.hash.*', [])] }) }));
    await user.click(screen.getByRole('combobox'));
    expect(screen.queryByText(ERRORS.VALUE_REQUIRED)).toBeNull();
    await user.click(screen.getByTestId('blocklist-form-os-select'));
    expect(screen.queryByText(ERRORS.VALUE_REQUIRED)).toBeTruthy();
  });

  it('should require at least one value', async () => {
    render(
      createProps({
        item: createItem({
          entries: [
            createEntry('file.hash.*', [
              '202cb962ac59075b964b07152d234b70',
              '7110eda4d09e062aa5e4a390b0a572ac0d2c0220',
              '5994471ABB01112AFCC18159F6CC74B4F511B99806DA59B3CAF5A9C173CACFC5',
            ]),
          ],
        }),
      })
    );
    await user.click(screen.getByRole('button', { name: /clear/i }));
    const expected = createOnChangeArgs({
      item: createItem({ entries: [createEntry('file.hash.*', [])] }),
    });
    expect(onChangeSpy).toHaveBeenCalledWith(expected);
  });

  it('should validate that hash values are valid', async () => {
    render();
    const invalidHashes = ['foo', 'bar'];
    await user.type(screen.getByRole('combobox'), `${invalidHashes.join(',')}{enter}`);
    expect(screen.queryByText(ERRORS.INVALID_HASH)).toBeTruthy();
    const expected = createOnChangeArgs({
      item: createItem({
        entries: [createEntry('file.hash.*', invalidHashes)],
      }),
    });
    expect(onChangeSpy).toHaveBeenCalledWith(expected);
  });

  it('should warn if path values invalid', async () => {
    const item = createItem({
      os_types: [OperatingSystem.LINUX],
      entries: [createEntry('file.path', ['/some/valid/path'])],
    });
    render(createProps({ item }));
    await user.type(screen.getByRole('combobox'), 'notavalidpath{enter}');
    expect(screen.queryByText(ERRORS.INVALID_PATH)).toBeTruthy();
  });

  it('should prevail duplicate value warning on lost focus', async () => {
    const item = createItem({
      os_types: [OperatingSystem.WINDOWS],
      entries: [createEntry('file.Ext.code_signature', ['valid', 'invalid'])],
    });
    render(createProps({ item }));
    await user.type(screen.getByRole('combobox'), 'invalid{enter}');
    expect(screen.queryByText(ERRORS.DUPLICATE_VALUE)).toBeTruthy();
    await user.click(screen.getByTestId('blocklist-form-os-select'));
    expect(screen.queryByText(ERRORS.DUPLICATE_VALUE)).toBeTruthy();
  });

  it('should warn if single duplicate value entry', async () => {
    const hash = 'C3AB8FF13720E8AD9047DD39466B3C8974E592C2FA383D4A3960714CAEF0C4F2';
    const item = createItem({
      entries: [createEntry('file.hash.*', [hash])],
    });
    render(createProps({ item }));
    await user.click(screen.getByRole('combobox'));
    await user.paste(hash);
    await user.keyboard('[Enter]');
    expect(screen.queryByText(ERRORS.DUPLICATE_VALUE)).toBeTruthy();
  });

  it('should default to global policy', () => {
    render();
    expect(screen.getByTestId('blocklist-form-effectedPolicies-global')).toBeEnabled();
  });

  it('should be valid if all required inputs complete', async () => {
    const validItem: ArtifactFormComponentProps['item'] = {
      list_id: ENDPOINT_ARTIFACT_LISTS.blocklists.id,
      name: 'test name',
      description: 'test description',
      entries: [
        createEntry('file.hash.*', [
          '202cb962ac59075b964b07152d234b70',
          '7110eda4d09e062aa5e4a390b0a572ac0d2c0220',
          '5994471ABB01112AFCC18159F6CC74B4F511B99806DA59B3CAF5A9C173CACFC5',
        ]),
      ],
      os_types: [OperatingSystem.WINDOWS],
      tags: [GLOBAL_ARTIFACT_TAG],
      type: 'simple',
    };
    render(createProps({ item: validItem }));

    await user.type(screen.getByTestId('blocklist-form-name-input'), 'z');
    const expected = createOnChangeArgs({
      isValid: true,
      item: { ...validItem, name: 'test namez' },
    });
    expect(onChangeSpy).toHaveBeenCalledWith(expected);
  });

  it('should display submit errors', async () => {
    const message = 'foo - something went wrong';
    const { getByTestId } = render(createProps({ error: new Error(message) as IHttpFetchError }));

    expect(getByTestId('blocklist-form-submitError').textContent).toMatch(message);
  });
});
