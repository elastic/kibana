/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';

/** Fixed width for dropdowns in endpoint policy setting cards (design). */
export const POLICY_SECTION_DROPDOWN_WIDTH_PX = 176;

/** Fixed width for Device control USB access level selects (longer option text). */
export const POLICY_SECTION_DEVICE_CONTROL_DROPDOWN_WIDTH_PX = 248;

/** Horizontal padding inside the trigger (matches EUI `size.base` / 16px). */
export const POLICY_SECTION_DROPDOWN_PADDING_HORIZONTAL_PX = 16;

export const policySectionDropdownWrapperCss = css`
  flex-shrink: 0;
  width: ${POLICY_SECTION_DROPDOWN_WIDTH_PX}px;
  min-width: ${POLICY_SECTION_DROPDOWN_WIDTH_PX}px;
  max-width: ${POLICY_SECTION_DROPDOWN_WIDTH_PX}px;

  && .euiSuperSelectControl {
    box-sizing: border-box;
    padding-inline: ${POLICY_SECTION_DROPDOWN_PADDING_HORIZONTAL_PX}px;
  }

  && select.euiSelect {
    box-sizing: border-box;
    padding-inline: ${POLICY_SECTION_DROPDOWN_PADDING_HORIZONTAL_PX}px;
  }
`;

export const policySectionDeviceControlDropdownWrapperCss = css`
  flex-shrink: 0;
  width: ${POLICY_SECTION_DEVICE_CONTROL_DROPDOWN_WIDTH_PX}px;
  min-width: ${POLICY_SECTION_DEVICE_CONTROL_DROPDOWN_WIDTH_PX}px;
  max-width: ${POLICY_SECTION_DEVICE_CONTROL_DROPDOWN_WIDTH_PX}px;

  && select.euiSelect {
    box-sizing: border-box;
    padding-inline: ${POLICY_SECTION_DROPDOWN_PADDING_HORIZONTAL_PX}px;
  }
`;
