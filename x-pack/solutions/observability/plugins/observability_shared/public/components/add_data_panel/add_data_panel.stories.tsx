/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ComponentProps, ComponentType } from 'react';
import { AddDataPanel } from '.';

export default {
  title: 'APP/AddDataPanel',
  component: AddDataPanel,
  decorators: [(Story: ComponentType) => <Story />],
};

const defaultFunctions = {
  onDismiss: () => alert('Dismissed'),
  onAddData: () => alert('Add Data'),
  onTryIt: () => alert('Try It'),
  onLearnMore: () => alert('Learn More'),
};

const defaultContent = (imagePosition: 'inside' | 'below' = 'inside') => {
  return {
    content: {
      title: 'Sample Title',
      content: 'Sample content',
      img: {
        baseFolderPath: 'path/to/base/folder',
        name: 'sample_image.png',
        position: imagePosition,
      },
    },
  };
};

const defaultPrimaryAction = {
  label: 'Primary Action',
  href: 'https://primary-action.com',
};

export function Default(props: ComponentProps<typeof AddDataPanel>) {
  return <AddDataPanel {...props} />;
}

Default.args = {
  ...defaultContent(),
  ...defaultFunctions,
  actions: {
    primary: defaultPrimaryAction,
    secondary: {
      href: 'https://secondary-action.com',
    },
    link: {
      href: 'https://link-action.com',
    },
  },
} as ComponentProps<typeof AddDataPanel>;

export function TwoActions(props: ComponentProps<typeof AddDataPanel>) {
  return <AddDataPanel {...props} />;
}

TwoActions.args = {
  ...defaultContent(),
  ...defaultFunctions,
  actions: {
    primary: defaultPrimaryAction,
    link: {
      href: 'https://link-action.com',
    },
  },
} as ComponentProps<typeof AddDataPanel>;

export function ImageBelow(props: ComponentProps<typeof AddDataPanel>) {
  return <AddDataPanel {...props} />;
}

ImageBelow.args = {
  ...defaultContent('below'),
  ...defaultFunctions,
  actions: {
    primary: defaultPrimaryAction,
    secondary: {
      href: 'https://secondary-action.com',
    },
    link: {
      href: 'https://link-action.com',
    },
  },
} as ComponentProps<typeof AddDataPanel>;

export function WithoutImage(props: ComponentProps<typeof AddDataPanel>) {
  return <AddDataPanel {...props} />;
}

WithoutImage.args = {
  content: {
    ...defaultContent().content,
    img: undefined,
  },
  ...defaultFunctions,
  actions: {
    primary: defaultPrimaryAction,
    secondary: {
      href: 'https://secondary-action.com',
    },
    link: {
      href: 'https://link-action.com',
    },
  },
} as ComponentProps<typeof AddDataPanel>;

export function CustomActionLabels(props: ComponentProps<typeof AddDataPanel>) {
  return <AddDataPanel {...props} />;
}

CustomActionLabels.args = {
  ...defaultContent(),
  ...defaultFunctions,
  actions: {
    primary: defaultPrimaryAction,
    secondary: {
      label: 'Secondary Action',
      href: 'https://secondary-action.com',
    },
    link: {
      label: 'Link Action',
      href: 'https://link-action.com',
    },
  },
} as ComponentProps<typeof AddDataPanel>;

export function NotDismissable(props: ComponentProps<typeof AddDataPanel>) {
  return <AddDataPanel {...props} />;
}

NotDismissable.args = {
  ...defaultContent(),
  ...defaultFunctions,
  onDismiss: undefined,
  actions: {
    primary: defaultPrimaryAction,
    secondary: {
      href: 'https://secondary-action.com',
    },
    link: {
      href: 'https://link-action.com',
    },
  },
} as ComponentProps<typeof AddDataPanel>;
