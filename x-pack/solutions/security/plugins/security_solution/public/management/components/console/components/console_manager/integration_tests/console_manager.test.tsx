/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useConsoleManager } from '../console_manager';
import React from 'react';
import type {
  ConsoleManagerClient,
  ConsoleRegistrationInterface,
  RegisteredConsoleClient,
} from '../types';
import type { AppContextTestRender } from '../../../../../../common/mock/endpoint';
import { createAppRootMockRenderer } from '../../../../../../common/mock/endpoint';
import {
  ConsoleManagerTestComponent,
  getConsoleManagerMockRenderResultQueriesAndActions,
  getNewConsoleRegistrationMock,
} from '../mocks';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import type { RenderHookResult } from '@testing-library/react';
import { waitFor, act, renderHook as _renderHook } from '@testing-library/react';
import { enterConsoleCommand } from '../../../mocks';

describe('When using ConsoleManager', () => {
  describe('and using the ConsoleManagerInterface via the hook', () => {
    type RenderResultInterface = RenderHookResult<ConsoleManagerClient, never>;

    let renderHook: () => RenderResultInterface;
    let renderResult: RenderResultInterface;

    const registerNewConsole = (): ConsoleRegistrationInterface => {
      const newConsole = getNewConsoleRegistrationMock();

      act(() => {
        renderResult.result.current.register(newConsole);
      });

      return newConsole;
    };

    beforeEach(() => {
      const { AppWrapper } = createAppRootMockRenderer();

      renderHook = () => {
        renderResult = _renderHook(useConsoleManager, {
          wrapper: AppWrapper,
        });

        return renderResult;
      };
    });

    it('should return the expected interface', async () => {
      renderHook();

      expect(renderResult.result.current).toEqual({
        getList: expect.any(Function),
        getOne: expect.any(Function),
        hide: expect.any(Function),
        register: expect.any(Function),
        show: expect.any(Function),
        terminate: expect.any(Function),
      });
    });

    it('should register a console', () => {
      const newConsole = getNewConsoleRegistrationMock();

      renderHook();
      act(() => {
        renderResult.result.current.register(newConsole);
      });

      expect(renderResult.result.current.getOne(newConsole.id)).toEqual({
        id: newConsole.id,
        meta: newConsole.meta,
        show: expect.any(Function),
        hide: expect.any(Function),
        terminate: expect.any(Function),
        isVisible: expect.any(Function),
      });
    });

    it('should show a console by `id`', async () => {
      renderHook();
      const { id: consoleId } = registerNewConsole();
      act(() => {
        renderResult.result.current.show(consoleId);
      });

      expect(renderResult.result.current.getOne(consoleId)!.isVisible()).toBe(true);
    });

    it('should throw if attempting to show a console with invalid `id`', () => {
      renderHook();

      expect(() => renderResult.result.current.show('some id')).toThrow(
        'Console with id some id not found'
      );
    });

    it('should hide a console by `id`', async () => {
      renderHook();
      const { id: consoleId } = registerNewConsole();

      let consoleClient: ReturnType<ConsoleManagerClient['getOne']>;

      act(() => {
        consoleClient = renderResult.result.current.getOne(consoleId);
      });

      act(() => {
        renderResult.result.current.show(consoleId);
      });

      await waitFor(() => expect(consoleClient!.isVisible()).toBe(true));

      act(() => {
        renderResult.result.current.hide(consoleId);
      });

      await waitFor(() => expect(consoleClient!.isVisible()).toBe(false));
    });

    it('should throw if attempting to hide a console with invalid `id`', () => {
      renderHook();

      expect(() => renderResult.result.current.hide('some id')).toThrow(
        'Console with id some id not found'
      );
    });

    it('should terminate a console by `id`', () => {
      renderHook();
      const { id: consoleId } = registerNewConsole();

      expect(renderResult.result.current.getOne(consoleId)).toBeTruthy();

      act(() => {
        renderResult.result.current.terminate(consoleId);
      });

      expect(renderResult.result.current.getOne(consoleId)).toBeUndefined();
    });

    it('should throw if attempting to terminate a console with invalid `id`', () => {
      renderHook();

      expect(() => renderResult.result.current.terminate('some id')).toThrow(
        'Console with id some id not found'
      );
    });

    it('should return list of registered consoles when calling `getList()`', () => {
      renderHook();
      registerNewConsole();
      registerNewConsole();

      expect(renderResult.result.current.getList()).toHaveLength(2);
    });

    describe('and using the Registered Console client interface', () => {
      let consoleId: string;
      let registeredConsole: Readonly<RegisteredConsoleClient>;

      beforeEach(() => {
        renderHook();
        ({ id: consoleId } = registerNewConsole());
        act(() => {
          registeredConsole = renderResult.result.current.getOne(consoleId)!;
        });
      });

      it('should have the expected interface', () => {
        expect(registeredConsole).toEqual({
          id: expect.any(String),
          meta: expect.any(Object),
          show: expect.any(Function),
          hide: expect.any(Function),
          terminate: expect.any(Function),
          isVisible: expect.any(Function),
        });
      });

      it('should display the console when `.show()` is called', async () => {
        act(() => {
          registeredConsole.show();
        });
        await waitFor(() => expect(registeredConsole.isVisible()).toBe(true));
      });

      it('should hide the console when `.hide()` is called', async () => {
        act(() => {
          registeredConsole.show();
        });

        await waitFor(() => expect(registeredConsole.isVisible()).toBe(true));

        act(() => {
          registeredConsole.hide();
        });

        await waitFor(() => expect(registeredConsole.isVisible()).toBe(false));
      });

      it('should un-register the console when `.terminate() is called', async () => {
        act(() => {
          registeredConsole.terminate();
        });
        await waitFor(() => expect(renderResult.result.current.getOne(consoleId)).toBeUndefined());
      });
    });
  });

  describe('and when the console page overlay is rendered into the page', () => {
    type ConsoleManagerQueriesAndActions = ReturnType<
      typeof getConsoleManagerMockRenderResultQueriesAndActions
    >;

    let user: UserEvent;
    let render: () => Promise<ReturnType<AppContextTestRender['render']>>;
    let renderResult: ReturnType<AppContextTestRender['render']>;
    let clickOnRegisterNewConsole: ConsoleManagerQueriesAndActions['clickOnRegisterNewConsole'];
    let openRunningConsole: ConsoleManagerQueriesAndActions['openRunningConsole'];
    let hideOpenedConsole: ConsoleManagerQueriesAndActions['hideOpenedConsole'];

    beforeAll(() => {
      jest.useFakeTimers();
    });

    afterAll(() => {
      jest.useRealTimers();
    });

    beforeEach(() => {
      // Workaround for timeout via https://github.com/testing-library/user-event/issues/833#issuecomment-1171452841
      user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      const mockedContext = createAppRootMockRenderer();

      render = async () => {
        renderResult = mockedContext.render(<ConsoleManagerTestComponent />);

        ({ clickOnRegisterNewConsole, openRunningConsole, hideOpenedConsole } =
          getConsoleManagerMockRenderResultQueriesAndActions(user, renderResult));

        await clickOnRegisterNewConsole();

        await waitFor(() => {
          expect(renderResult.queryAllByTestId('runningConsole').length).toBeGreaterThan(0);
        });

        await openRunningConsole();

        return renderResult;
      };
    });

    it('should show the title', async () => {
      await render();

      expect(renderResult.getByTestId('consolePageOverlay-layout-titleHolder').textContent).toMatch(
        /Test console/
      );
    });

    it('should show the console', async () => {
      await render();

      expect(renderResult.getByTestId('testRunningConsole')).toBeTruthy();
    });

    it('should not show `Done` button', async () => {
      await render();

      expect(renderResult.queryByTestId('consolePageOverlay-doneButton')).toBeFalsy();
    });

    it('should show `Back` link', async () => {
      await render();

      expect(renderResult.getByTestId('consolePageOverlay-header-back-link')).toBeTruthy();
    });

    it('should hide the console page overlay', async () => {
      await render();
      await user.click(renderResult.getByTestId('consolePageOverlay-header-back-link'));

      expect(renderResult.queryByTestId('consolePageOverlay')).toBeNull();
    });

    it("should persist a console's command output history on hide/show", async () => {
      await render();
      await enterConsoleCommand(renderResult, user, 'help', {
        dataTestSubj: 'testRunningConsole',
      });
      await enterConsoleCommand(renderResult, user, 'cmd1', {
        dataTestSubj: 'testRunningConsole',
      });

      await waitFor(() => {
        expect(renderResult.queryAllByTestId('testRunningConsole-historyItem')).toHaveLength(2);
      });

      await hideOpenedConsole();

      // Open the console back up and ensure prior items still there
      await openRunningConsole();

      await waitFor(() => {
        expect(renderResult.queryAllByTestId('testRunningConsole-historyItem')).toHaveLength(2);
      });
    });

    it('should provide console rendering state between show/hide', async () => {
      const expectedStoreValue = JSON.stringify({ foo: 'bar' }, null, 2);
      await render();
      await enterConsoleCommand(renderResult, user, 'cmd1', {
        dataTestSubj: 'testRunningConsole',
      });

      // Command should have `pending` status and no store values
      expect(renderResult.getByTestId('exec-output-statusState').textContent).toEqual(
        'status: pending'
      );
      expect(renderResult.getByTestId('exec-output-storeStateJson').textContent).toEqual('{}');

      // Wait for component to update the status and store values
      await waitFor(() => {
        expect(renderResult.getByTestId('exec-output-statusState').textContent).toMatch(
          'status: success'
        );
      });
      expect(renderResult.getByTestId('exec-output-storeStateJson').textContent).toEqual(
        expectedStoreValue
      );

      await hideOpenedConsole();

      // Open the console back up and ensure `status` and `store` are the last set of values
      await openRunningConsole();

      expect(renderResult.getByTestId('exec-output-statusState').textContent).toMatch(
        'status: success'
      );
      expect(renderResult.getByTestId('exec-output-storeStateJson').textContent).toEqual(
        expectedStoreValue
      );
    });
  });
});
