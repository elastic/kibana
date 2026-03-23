/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

// dimensions of the SVGs used in the empty states illustrations
// e.g. x-pack/plugins/cloud_security_posture/public/assets/illustrations/clouds.svg
const SVG_HEIGHT = 209;
const SVG_WIDTH = 376;

/**
 * A container component that maintains a fixed size for child elements.
 * used for displaying the empty state illustrations and prevent flickering while the SVGs are loading.
 */
export const EmptyStatesIllustrationContainer: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => <div css={{ height: SVG_HEIGHT, width: SVG_WIDTH }}>{children}</div>;
