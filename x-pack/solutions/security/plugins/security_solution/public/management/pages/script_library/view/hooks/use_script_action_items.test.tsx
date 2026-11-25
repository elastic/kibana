/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppContextTestRender } from '../../../../../common/mock/endpoint';
import { createAppRootMockRenderer } from '../../../../../common/mock/endpoint';
import { useScriptActionItems, type UseScriptActionItemsProps } from './use_script_action_items';
import { useUserPrivileges as _useUserPrivileges } from '../../../../../common/components/user_privileges';
import { getEndpointAuthzInitialStateMock } from '../../../../../../common/endpoint/service/authz/mocks';
import type { EndpointPrivileges } from '../../../../../../common/endpoint/types';
import { EndpointScriptsGenerator } from '../../../../../../common/endpoint/data_generators/endpoint_scripts_generator';
import { SCRIPT_LIBRARY_LABELS } from '../../translations';

jest.mock('../../../../../common/components/user_privileges');
const useUserPrivilegesMock = _useUserPrivileges as jest.Mock;

describe('useScriptActionItems()', () => {
  let mockedContext: AppContextTestRender;
  let scriptsGenerator: EndpointScriptsGenerator;
  let props: UseScriptActionItemsProps;
  let setPrivileges: (privileges: Partial<EndpointPrivileges>) => void;
  let render: () => ReturnType<typeof useScriptActionItems>;

  beforeEach(() => {
    scriptsGenerator = new EndpointScriptsGenerator('test');
    mockedContext = createAppRootMockRenderer();

    props = {
      onClickAction: jest.fn(),
      script: scriptsGenerator.generate(),
    };

    setPrivileges = (privileges) => {
      useUserPrivilegesMock.mockReturnValue({
        endpointPrivileges: {
          ...getEndpointAuthzInitialStateMock(),
          canReadScriptsLibrary: true,
          canWriteScriptsLibrary: true,
          ...privileges,
        },
      });
    };
    setPrivileges({});

    render = () => mockedContext.renderHook(() => useScriptActionItems(props)).result.current;
  });

  afterEach(() => {
    jest.clearAllMocks();
    useUserPrivilegesMock.mockReset();
  });

  const getKeys = (items: ReturnType<typeof useScriptActionItems>) => items.map(({ key }) => key);

  it('should return all actions when user can read and write', () => {
    expect(getKeys(render())).toEqual(['details', 'edit', 'download', 'delete']);
  });

  it('should return only details and download when user can only read', () => {
    setPrivileges({ canWriteScriptsLibrary: false });

    expect(getKeys(render())).toEqual(['details', 'download']);
  });

  it('should return only edit and delete when user can only write', () => {
    setPrivileges({ canReadScriptsLibrary: false });

    expect(getKeys(render())).toEqual(['edit', 'delete']);
  });

  it('should return no actions when user has no privileges', () => {
    setPrivileges({ canReadScriptsLibrary: false, canWriteScriptsLibrary: false });

    expect(render()).toEqual([]);
  });

  it('should omit the details action when `showDetailsAction` is `false`', () => {
    props.showDetailsAction = false;

    expect(getKeys(render())).toEqual(['edit', 'download', 'delete']);
  });

  it('should include the details action when `showDetailsAction` is `true`', () => {
    props.showDetailsAction = true;

    expect(getKeys(render())).toContain('details');
  });

  it('should set expected labels, icons and test subjects on each item', () => {
    const items = render();
    const { details, edit, download, delete: del } = SCRIPT_LIBRARY_LABELS.table.actions;

    expect(
      items.map(({ key, name, icon, 'data-test-subj': dataTestSubj }) => ({
        key,
        name,
        icon,
        dataTestSubj,
      }))
    ).toEqual([
      { key: 'details', name: details, icon: 'inspect', dataTestSubj: 'actionDetails' },
      { key: 'edit', name: edit, icon: 'pencil', dataTestSubj: 'actionEdit' },
      { key: 'download', name: download, icon: 'download', dataTestSubj: 'actionDownload' },
      { key: 'delete', name: del, icon: 'trash', dataTestSubj: 'actionDelete' },
    ]);
  });

  it.each([
    ['details', 'details'],
    ['edit', 'edit'],
    ['delete', 'delete'],
  ])('should call `onClickAction` with show=%s and the script when clicked', (key, show) => {
    const item = render().find((action) => action.key === key);

    item?.onClick?.({} as never);

    expect(props.onClickAction).toHaveBeenCalledTimes(1);
    expect(props.onClickAction).toHaveBeenCalledWith({ show, script: props.script });
  });

  it('should build the download item with an href prefixed by the server base path', () => {
    const prependSpy = jest
      .spyOn(mockedContext.coreStart.http.basePath, 'prepend')
      .mockImplementation((path) => `/mybase${path}`);

    const item = render().find((action) => action.key === 'download');

    expect(prependSpy).toHaveBeenCalledWith(props.script.downloadUri);
    expect(item?.href).toBe(`/mybase${props.script.downloadUri}`);
    expect(item?.onClick).toBeUndefined();
  });

  it('should return a memoized result when inputs do not change', () => {
    const { result, rerender } = mockedContext.renderHook(() => useScriptActionItems(props));
    const first = result.current;

    rerender();

    expect(result.current).toBe(first);
  });

  it('should return new items when the script changes', () => {
    const { result, rerender } = mockedContext.renderHook(() => useScriptActionItems(props));
    const first = result.current;

    props = { ...props, script: scriptsGenerator.generate() };
    rerender();

    expect(result.current).not.toBe(first);
  });
});
