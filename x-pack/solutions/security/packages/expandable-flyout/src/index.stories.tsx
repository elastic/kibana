/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiPanel,
  EuiTitle,
} from '@elastic/eui';
import { ExpandableFlyout } from '.';
import { TestProvider } from './test/provider';
import { initialUiState, State } from './store/state';

export default {
  component: ExpandableFlyout,
  title: 'ExpandableFlyout',
};

const registeredPanels = [
  {
    key: 'right',
    component: () => (
      <>
        <EuiFlyoutHeader>
          <EuiTitle size="m">
            <h1>{'Right panel header'}</h1>
          </EuiTitle>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          <p>{'Example of a right component body'}</p>
        </EuiFlyoutBody>
        <EuiFlyoutFooter>
          <EuiFlexGroup justifyContent="flexEnd">
            <EuiFlexItem grow={false}>
              <EuiButton color="primary">{'Footer button'}</EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      </>
    ),
  },
  {
    key: 'left',
    component: () => (
      <EuiPanel hasShadow={false}>
        <EuiFlexGroup direction="column">
          <EuiFlexItem grow={false}>
            <EuiTitle size="m">
              <h1>{'Left panel header'}</h1>
            </EuiTitle>
          </EuiFlexItem>
          <p>{'Example of a left component content'}</p>
          <EuiFlexItem grow={false} />
        </EuiFlexGroup>
      </EuiPanel>
    ),
  },
  {
    key: 'preview1',
    component: () => (
      <EuiPanel hasShadow={false}>
        <EuiFlexGroup direction="column">
          <EuiFlexItem grow={false}>
            <EuiTitle size="m">
              <h1>{'Preview panel header'}</h1>
            </EuiTitle>
          </EuiFlexItem>
          <p>{'Example of a preview component content'}</p>
          <EuiFlexItem grow={false} />
        </EuiFlexGroup>
      </EuiPanel>
    ),
  },
  {
    key: 'preview2',
    component: () => (
      <EuiPanel hasShadow={false}>
        <EuiFlexGroup direction="column">
          <EuiFlexItem grow={false}>
            <EuiTitle size="m">
              <h1>{'Second preview panel header'}</h1>
            </EuiTitle>
          </EuiFlexItem>
          <p>{'Example of another preview component content'}</p>
          <EuiFlexItem grow={false} />
        </EuiFlexGroup>
      </EuiPanel>
    ),
  },
];

export const Right = () => {
  const state: State = {
    panels: {
      byId: {
        memory: {
          right: {
            id: 'right',
          },
          left: undefined,
          preview: undefined,
          history: [{ lastOpen: Date.now(), panel: { id: 'right' } }],
        },
      },
    },
    ui: initialUiState,
  };

  return (
    <TestProvider state={state}>
      <ExpandableFlyout
        registeredPanels={registeredPanels}
        flyoutCustomProps={{ hideSettings: true }}
      />
    </TestProvider>
  );
};

export const Left = () => {
  const state: State = {
    panels: {
      byId: {
        memory: {
          right: {
            id: 'right',
          },
          left: {
            id: 'left',
          },
          preview: undefined,
          history: [{ lastOpen: Date.now(), panel: { id: 'right' } }],
        },
      },
    },
    ui: initialUiState,
  };

  return (
    <TestProvider state={state}>
      <ExpandableFlyout
        registeredPanels={registeredPanels}
        flyoutCustomProps={{ hideSettings: true }}
      />
    </TestProvider>
  );
};

export const Preview = () => {
  const state: State = {
    panels: {
      byId: {
        memory: {
          right: {
            id: 'right',
          },
          left: {
            id: 'left',
          },
          preview: [
            {
              id: 'preview1',
            },
          ],
          history: [{ lastOpen: Date.now(), panel: { id: 'right' } }],
        },
      },
    },
    ui: initialUiState,
  };

  return (
    <TestProvider state={state}>
      <ExpandableFlyout
        registeredPanels={registeredPanels}
        flyoutCustomProps={{ hideSettings: true }}
      />
    </TestProvider>
  );
};

export const MultiplePreviews = () => {
  const state: State = {
    panels: {
      byId: {
        memory: {
          right: {
            id: 'right',
          },
          left: {
            id: 'left',
          },
          preview: [
            {
              id: 'preview1',
            },
            {
              id: 'preview2',
            },
          ],
          history: [{ lastOpen: Date.now(), panel: { id: 'right' } }],
        },
      },
    },
    ui: initialUiState,
  };

  return (
    <TestProvider state={state}>
      <ExpandableFlyout
        registeredPanels={registeredPanels}
        flyoutCustomProps={{ hideSettings: true }}
      />
    </TestProvider>
  );
};

export const CollapsedPushMode = () => {
  const state: State = {
    panels: {
      byId: {
        memory: {
          right: {
            id: 'right',
          },
          left: undefined,
          preview: undefined,
          history: [{ lastOpen: Date.now(), panel: { id: 'right' } }],
        },
      },
    },
    ui: {
      ...initialUiState,
      pushVsOverlay: 'push',
    },
  };

  return (
    <TestProvider state={state}>
      <ExpandableFlyout registeredPanels={registeredPanels} />
    </TestProvider>
  );
};

export const ExpandedPushMode = () => {
  const state: State = {
    panels: {
      byId: {
        memory: {
          right: {
            id: 'right',
          },
          left: {
            id: 'left',
          },
          preview: undefined,
          history: [{ lastOpen: Date.now(), panel: { id: 'right' } }],
        },
      },
    },
    ui: {
      ...initialUiState,
      pushVsOverlay: 'push',
    },
  };

  return (
    <TestProvider state={state}>
      <ExpandableFlyout registeredPanels={registeredPanels} />
    </TestProvider>
  );
};

export const DisableTypeSelection = () => {
  const state: State = {
    panels: {
      byId: {
        memory: {
          right: {
            id: 'right',
          },
          left: {
            id: 'left',
          },
          preview: undefined,
          history: [{ lastOpen: Date.now(), panel: { id: 'right' } }],
        },
      },
    },
    ui: initialUiState,
  };

  return (
    <TestProvider state={state}>
      <ExpandableFlyout
        registeredPanels={registeredPanels}
        flyoutCustomProps={{
          pushVsOverlay: { disabled: true, tooltip: 'This option is disabled' },
        }}
      />
    </TestProvider>
  );
};

export const ResetWidths = () => {
  const state: State = {
    panels: {
      byId: {
        memory: {
          right: {
            id: 'right',
          },
          left: {
            id: 'left',
          },
          preview: undefined,
          history: [{ lastOpen: Date.now(), panel: { id: 'right' } }],
        },
      },
    },
    ui: initialUiState,
  };

  return (
    <TestProvider state={state}>
      <ExpandableFlyout registeredPanels={registeredPanels} />
    </TestProvider>
  );
};

export const DisableResizeWidthSelection = () => {
  const state: State = {
    panels: {
      byId: {
        memory: {
          right: {
            id: 'right',
          },
          left: {
            id: 'left',
          },
          preview: undefined,
          history: [{ lastOpen: Date.now(), panel: { id: 'right' } }],
        },
      },
    },
    ui: initialUiState,
  };

  return (
    <TestProvider state={state}>
      <ExpandableFlyout
        registeredPanels={registeredPanels}
        flyoutCustomProps={{
          resize: { disabled: true, tooltip: 'This option is disabled' },
        }}
      />
    </TestProvider>
  );
};
