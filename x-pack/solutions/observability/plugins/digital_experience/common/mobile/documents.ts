/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esql, type ComposerQuery } from '@elastic/esql';
import { MOBILE_PLATFORM } from '../application_source';
import {
  BROWSER_SDK_LANGUAGE,
  ELASTIC_DISTRO_NAME,
  MOBILE_SDK_NAMES,
  MOBILE_SDK_NAME_BY_PLATFORM,
  OTEL_LOGS_INDEX,
  OTEL_TRACES_INDEX,
} from '../otel_data';
import {
  MOBILE_OS_NAMES,
  OS_NAMES_BY_PLATFORM,
  inValues,
  mobileColumn,
  resultColumn,
} from './fields';

/** Older EDOT SDKs name themselves in `telemetry.sdk.name`: `android` or `iOS`. */
const hasMobileSdkName = () => inValues('sdkName', MOBILE_SDK_NAMES);

/** Newer EDOT SDKs send the upstream SDK name, with the Elastic distribution and a mobile OS. */
const isElasticOnMobileOs = () =>
  esql.exp`${mobileColumn('distroName')} == ${ELASTIC_DISTRO_NAME}
    AND ${inValues('osName', MOBILE_OS_NAMES)}`;

/** EDOT Browser is an Elastic distribution too, and reports the device's OS, e.g. iOS on an iPhone. */
const isNotBrowser = () =>
  esql.exp`COALESCE(${mobileColumn('sdkLanguage')}, "") != ${BROWSER_SDK_LANGUAGE}`;

/** Android by `os.name`, or by the older SDK's name, which sends no OS; iOS otherwise. */
const platformOfDocument = () =>
  esql.exp`CASE(
    ${inValues('osName', OS_NAMES_BY_PLATFORM.android)}
      OR ${mobileColumn('sdkName')} == ${MOBILE_SDK_NAME_BY_PLATFORM.android},
    ${MOBILE_PLATFORM.android},
    ${MOBILE_PLATFORM.ios}
  )`;

/**
 * The EDOT Android and iOS documents of the OTel indices, each with its `platform`. Fields no
 * index maps read as `null` instead of failing the query, e.g. `exception.type` where no app ever
 * threw.
 */
export const mobileDocuments = (): ComposerQuery =>
  esql.from(OTEL_TRACES_INDEX, OTEL_LOGS_INDEX).addSetCommand('unmapped_fields', 'nullify')
    .pipe`WHERE ${hasMobileSdkName()} OR ${isElasticOnMobileOs()}`.pipe`WHERE ${isNotBrowser()}`
    .pipe`EVAL ${resultColumn('platform')} = ${platformOfDocument()}`;
