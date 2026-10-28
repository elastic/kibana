/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataTableRecord } from '@kbn/discover-utils';
import type { FlyoutType } from '../../../../../common/lib/telemetry';
import { FLYOUT_TYPE } from '../../../../../common/lib/telemetry';
import { formatFlyoutTitle, NOTES_TITLE } from '../../../constants/flyout_titles';
import { getDocumentTitle } from '../../../../document/main/utils/get_header_title';
import { getAttackTitleValue } from '../../../../attack/utils/get_attack_title';
import { isAttackDocument } from '../../../../attack/utils/is_attack_document';

/** Title of the notes flyout of a document or an attack. */
export const getNotesFlyoutTitle = (hit: DataTableRecord): string =>
  formatFlyoutTitle(
    NOTES_TITLE,
    isAttackDocument(hit) ? getAttackTitleValue(hit) : getDocumentTitle(hit)
  );

/** Flyout type reported in the telemetry of the notes flyout of a document or an attack. */
export const getNotesFlyoutType = (hit: DataTableRecord): FlyoutType =>
  isAttackDocument(hit) ? FLYOUT_TYPE.ATTACK : FLYOUT_TYPE.DOCUMENT;
