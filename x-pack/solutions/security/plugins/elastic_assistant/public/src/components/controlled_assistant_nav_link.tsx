/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { AssistantNavLink } from '@kbn/elastic-assistant/impl/assistant_context/assistant_nav_link';
import { useAssistantNavDevSingleton } from '../context/assistant_nav_dev_singleton';

export const ControlledAssistantNavLink: React.FC = () => {
  const { variant, iconOnly } = useAssistantNavDevSingleton();

  return <AssistantNavLink variant={variant} iconOnly={iconOnly} />;
};
