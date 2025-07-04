/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import type { AppContextTestRender, UserPrivilegesMockSetter } from '../../../common/mock/endpoint';
import { createAppRootMockRenderer } from '../../../common/mock/endpoint';
import type {
  ArtifactEntryCardDecoratorProps,
  ArtifactEntryCardProps,
} from './artifact_entry_card';
import { ArtifactEntryCard } from './artifact_entry_card';
import { act, fireEvent, getByTestId, waitFor } from '@testing-library/react';
import type { AnyArtifact } from './types';
import { isTrustedApp } from './utils';
import { getTrustedAppProviderMock, getExceptionProviderMock } from './test_utils';
import { OS_LINUX, OS_MAC, OS_WINDOWS } from './components/translations';
import type { TrustedApp } from '../../../../common/endpoint/types';
import { useUserPrivileges } from '../../../common/components/user_privileges';
import { getEndpointAuthzInitialStateMock } from '../../../../common/endpoint/service/authz/mocks';
import { GLOBAL_ARTIFACT_TAG } from '../../../../common/endpoint/service/artifacts';
import {
  buildPerPolicyTag,
  buildSpaceOwnerIdTag,
} from '../../../../common/endpoint/service/artifacts/utils';
import type { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';

jest.mock('../../../common/components/user_privileges');
const mockUserPrivileges = useUserPrivileges as jest.Mock;

describe.each([
  ['trusted apps', getTrustedAppProviderMock],
  ['exceptions/event filters', getExceptionProviderMock],
])('when using the ArtifactEntryCard component with %s', (_, generateItem) => {
  let item: AnyArtifact;
  let appTestContext: AppContextTestRender;
  let renderResult: ReturnType<AppContextTestRender['render']>;
  let render: (
    props?: Partial<ArtifactEntryCardProps>
  ) => ReturnType<AppContextTestRender['render']>;

  beforeEach(() => {
    item = generateItem() as AnyArtifact;
    appTestContext = createAppRootMockRenderer();
    render = (props = {}) => {
      renderResult = appTestContext.render(
        <ArtifactEntryCard
          {...{
            item,
            'data-test-subj': 'testCard',
            ...props,
          }}
        />
      );
      return renderResult;
    };

    mockUserPrivileges.mockReturnValue({ endpointPrivileges: getEndpointAuthzInitialStateMock() });
  });

  afterEach(() => {
    mockUserPrivileges.mockReset();
  });

  it('should display title and who has created and updated it last', async () => {
    render();

    expect(renderResult.getByTestId('testCard-header-title').textContent).toEqual(
      'some internal app'
    );
    expect(renderResult.getByTestId('testCard-subHeader-touchedBy-createdBy').textContent).toEqual(
      'Created byMMarty'
    );
    expect(renderResult.getByTestId('testCard-subHeader-touchedBy-updatedBy').textContent).toEqual(
      'Updated byEEllamae'
    );
  });

  it('should display Global effected scope', async () => {
    render();

    expect(renderResult.getByTestId('testCard-subHeader-effectScope-value').textContent).toEqual(
      'Applied globally'
    );
  });

  it('should display dates in expected format', () => {
    render();

    expect(renderResult.getByTestId('testCard-header-updated').textContent).toEqual(
      expect.stringMatching(/Last updated(?:(\s*\d+ seconds? ago)|now)/)
    );
  });

  it('should display description if one exists', async () => {
    render();

    expect(renderResult.getByTestId('testCard-description').textContent).toEqual(item.description);
  });

  it("shouldn't display description", async () => {
    render({ hideDescription: true });
    expect(renderResult.queryByTestId('testCard-description')).toBeNull();
  });

  it('should display default empty value if description does not exist', async () => {
    item.description = undefined;
    render();
    expect(renderResult.getByTestId('testCard-description').textContent).toEqual('—');
  });

  it('should display comments if one exists', async () => {
    render();
    if (isTrustedApp(item)) {
      expect(renderResult.queryByTestId('testCard-comments')).toBeNull();
    } else {
      expect(renderResult.queryByTestId('testCard-comments')).not.toBeNull();
    }
  });

  it("shouldn't display comments", async () => {
    render({ hideComments: true });
    expect(renderResult.queryByTestId('testCard-comments')).toBeNull();
  });

  it('should display OS and criteria conditions', () => {
    render();

    expect(renderResult.getByTestId('testCard-criteriaConditions').textContent).toEqual(
      ' OSIS WindowsAND process.hash.*IS 1234234659af249ddf3e40864e9fb241AND process.executable.caselessIS c:\\fol\\bin.exe'
    );
  });

  it('should display multiple OSs in the criteria conditions', () => {
    if (isTrustedApp(item)) {
      // Trusted apps does not support multiple OS, so this is just so the test will pass
      // for the trusted app run (the top level `describe()` uses a `.each()`)
      item.os = [OS_LINUX, OS_MAC, OS_WINDOWS].join(', ') as TrustedApp['os'];
    } else {
      item.os_types = ['linux', 'macos', 'windows'];
    }

    render();

    expect(renderResult.getByTestId('testCard-criteriaConditions').textContent).toEqual(
      ` OSIS ${OS_LINUX}, ${OS_MAC}, ${OS_WINDOWS}AND process.hash.*IS 1234234659af249ddf3e40864e9fb241AND process.executable.caselessIS c:\\fol\\bin.exe`
    );
  });

  it('should NOT show the action menu button if no actions were provided', async () => {
    render();
    const menuButton = await renderResult.queryByTestId('testCard-header-actions-button');

    expect(menuButton).toBeNull();
  });

  describe('and actions were defined', () => {
    let actions: ArtifactEntryCardProps['actions'];

    beforeEach(() => {
      actions = [
        {
          'data-test-subj': 'test-action',
          children: 'action one',
        },
      ];
    });

    it('should show the actions icon when actions were defined', () => {
      render({ actions });

      expect(renderResult.getByTestId('testCard-header-actions-button')).not.toBeNull();
    });

    it('should show popup with defined actions', async () => {
      render({ actions });
      await act(async () => {
        await fireEvent.click(renderResult.getByTestId('testCard-header-actions-button'));
      });

      const bodyHtmlElement = renderResult.baseElement as HTMLElement;

      expect(getByTestId(bodyHtmlElement, 'testCard-header-actions-popoverPanel')).not.toBeNull();
      expect(getByTestId(bodyHtmlElement, 'test-action')).not.toBeNull();
    });
  });

  describe('and artifact is defined per policy', () => {
    let policies: ArtifactEntryCardProps['policies'];

    beforeEach(() => {
      if (isTrustedApp(item)) {
        item.effectScope = {
          type: 'policy',
          policies: ['policy-1'],
        };
      } else {
        item.tags = ['policy:policy-1'];
      }

      policies = {
        'policy-1': {
          children: 'Policy one title',
          'data-test-subj': 'policyMenuItem',
          href: 'http://some/path/to/policy-1',
        },
      };
    });

    it('should display correct label with count of policies', () => {
      render({ policies });

      expect(renderResult.getByTestId('testCard-subHeader-effectScope-value').textContent).toEqual(
        'Applied to 1 policy'
      );
    });

    it('should display effected scope as a button', () => {
      render({ policies });

      expect(
        renderResult.getByTestId('testCard-subHeader-effectScope-popupMenu-button')
      ).not.toBeNull();
    });

    describe('when clicked', () => {
      it('should show popup menu with list of associated policies, with `View details` button when has Policy privilege', async () => {
        render({ policies });
        await act(async () => {
          await fireEvent.click(
            renderResult.getByTestId('testCard-subHeader-effectScope-popupMenu-button')
          );
        });

        expect(
          renderResult.getByTestId('testCard-subHeader-effectScope-popupMenu-popoverPanel')
        ).not.toBeNull();

        expect(renderResult.getByTestId('policyMenuItem').textContent).toEqual(
          'Policy one titleView details'
        );

        expect((renderResult.getByTestId('policyMenuItem') as HTMLAnchorElement).href).toEqual(
          policies!['policy-1'].href
        );
      });

      it('should show popup menu with list of associated policies, without `View details` button when does NOT have Policy privilege', async () => {
        mockUserPrivileges.mockReturnValue({
          endpointPrivileges: getEndpointAuthzInitialStateMock({ canReadPolicyManagement: false }),
        });

        render({ policies });
        await act(async () => {
          await fireEvent.click(
            renderResult.getByTestId('testCard-subHeader-effectScope-popupMenu-button')
          );
        });

        expect(
          renderResult.getByTestId('testCard-subHeader-effectScope-popupMenu-popoverPanel')
        ).not.toBeNull();

        expect(renderResult.getByTestId('policyMenuItem').textContent).toEqual('Policy one title');
      });
    });

    it('should display disabled button with policy ID if no policy menu item found in `policies` prop', async () => {
      render(); // Important: no polices provided to component on input
      await act(async () => {
        await fireEvent.click(
          renderResult.getByTestId('testCard-subHeader-effectScope-popupMenu-button')
        );
      });

      expect(
        renderResult.getByTestId('testCard-subHeader-effectScope-popupMenu-popoverPanel')
      ).not.toBeNull();

      expect(
        renderResult.getByTestId('testCard-subHeader-effectScope-popupMenu-item-0-truncateWrapper')
          .textContent
      ).toEqual('policy-1');

      expect(
        (
          renderResult.getByTestId(
            'testCard-subHeader-effectScope-popupMenu-item-0'
          ) as HTMLButtonElement
        ).disabled
      ).toBe(true);
    });

    it('should pass item to decorator function and display its result', () => {
      let passedItem: ArtifactEntryCardDecoratorProps['item'] | null = null;
      const MockDecorator = memo<ArtifactEntryCardDecoratorProps>(({ item: actualItem }) => {
        passedItem = actualItem;
        return <p>{'mock decorator'}</p>;
      });
      MockDecorator.displayName = 'MockDecorator';

      render({ Decorator: MockDecorator });

      expect(renderResult.getByText('mock decorator')).toBeInTheDocument();
      expect(passedItem).toBe(item);
    });
  });

  describe('and space awareness is enabled', () => {
    let authzMock: UserPrivilegesMockSetter;
    let actions: ArtifactEntryCardProps['actions'];

    beforeEach(() => {
      actions = [
        {
          'data-test-subj': 'test-action',
          children: 'action one',
        },
      ];
    });

    beforeEach(() => {
      appTestContext.setExperimentalFlag({ endpointManagementSpaceAwarenessEnabled: true });
      authzMock = appTestContext.getUserPrivilegesMockSetter(mockUserPrivileges);
      authzMock.set({ canManageGlobalArtifacts: false });
      (item as ExceptionListItemSchema).tags = [GLOBAL_ARTIFACT_TAG, buildSpaceOwnerIdTag('foo')];
    });

    afterEach(() => {
      authzMock.reset();
    });

    it('should render menu if feature flag is disabled', () => {
      appTestContext.setExperimentalFlag({ endpointManagementSpaceAwarenessEnabled: false });
      render({ actions });

      expect(
        (renderResult.getByTestId('testCard-header-actions-button') as HTMLButtonElement).disabled
      ).toBe(false);
    });

    it('should disable card actions menu for global artifacts when user does not have global artifact privilege', () => {
      render({ actions });

      expect(
        (renderResult.getByTestId('testCard-header-actions-button') as HTMLButtonElement).disabled
      ).toBe(true);
    });

    it('should enable card actions menu for global artifacts when user has the global artifact privilege', () => {
      authzMock.set({ canManageGlobalArtifacts: true });
      render({ actions });

      expect(
        (renderResult.getByTestId('testCard-header-actions-button') as HTMLButtonElement).disabled
      ).toBe(false);
    });

    it('should disable card actions menu for per-policy artifacts not owned by active space', () => {
      (item as ExceptionListItemSchema).tags = [
        buildPerPolicyTag('abc'),
        buildSpaceOwnerIdTag('foo'),
      ];
      render({ actions });

      expect(
        (renderResult.getByTestId('testCard-header-actions-button') as HTMLButtonElement).disabled
      ).toBe(true);
    });

    it('should enable card actions menu for per-policy artifacts when active space matches artifact owner space id', async () => {
      (item as ExceptionListItemSchema).tags = [
        buildPerPolicyTag('abc'),
        buildSpaceOwnerIdTag('default'),
      ];
      render({ actions });

      await waitFor(() => {
        expect(
          (renderResult.getByTestId('testCard-header-actions-button') as HTMLButtonElement).disabled
        ).toBe(false);
      });
    });

    it('should enable card actions menu for per-policy artifacts when not owned by active space but user has global artifact privilege', async () => {
      authzMock.set({ canManageGlobalArtifacts: true });
      (item as ExceptionListItemSchema).tags = [
        buildPerPolicyTag('abc'),
        buildSpaceOwnerIdTag('foo'),
      ];
      render({ actions });

      await waitFor(() => {
        expect(
          (renderResult.getByTestId('testCard-header-actions-button') as HTMLButtonElement).disabled
        ).toBe(false);
      });
    });
  });
});
