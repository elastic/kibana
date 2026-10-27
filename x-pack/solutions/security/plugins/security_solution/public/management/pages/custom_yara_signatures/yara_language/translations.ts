/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const COMPLETION_DETAILS = {
  keyword: i18n.translate('xpack.securitySolution.customYaraSignatures.editor.completion.keyword', {
    defaultMessage: 'Keyword',
  }),
  section: i18n.translate('xpack.securitySolution.customYaraSignatures.editor.completion.section', {
    defaultMessage: 'Rule section',
  }),
  operator: i18n.translate(
    'xpack.securitySolution.customYaraSignatures.editor.completion.operator',
    { defaultMessage: 'Operator' }
  ),
  quantifier: i18n.translate(
    'xpack.securitySolution.customYaraSignatures.editor.completion.quantifier',
    { defaultMessage: 'Quantifier' }
  ),
  stringModifier: i18n.translate(
    'xpack.securitySolution.customYaraSignatures.editor.completion.stringModifier',
    { defaultMessage: 'String modifier' }
  ),
  constant: i18n.translate(
    'xpack.securitySolution.customYaraSignatures.editor.completion.constant',
    { defaultMessage: 'Constant' }
  ),
  builtIn: i18n.translate('xpack.securitySolution.customYaraSignatures.editor.completion.builtIn', {
    defaultMessage: 'Built-in',
  }),
  stringReference: i18n.translate(
    'xpack.securitySolution.customYaraSignatures.editor.completion.stringReference',
    { defaultMessage: 'String' }
  ),
  ruleReference: i18n.translate(
    'xpack.securitySolution.customYaraSignatures.editor.completion.ruleReference',
    { defaultMessage: 'Rule' }
  ),
  ruleSnippet: i18n.translate(
    'xpack.securitySolution.customYaraSignatures.editor.completion.ruleSnippet',
    { defaultMessage: 'Rule template' }
  ),
  forOfSnippet: i18n.translate(
    'xpack.securitySolution.customYaraSignatures.editor.completion.forOfSnippet',
    { defaultMessage: 'Apply a condition to a set of strings' }
  ),
  forInSnippet: i18n.translate(
    'xpack.securitySolution.customYaraSignatures.editor.completion.forInSnippet',
    { defaultMessage: 'Iterate over a range or an iterable' }
  ),
  importSnippet: i18n.translate(
    'xpack.securitySolution.customYaraSignatures.editor.completion.importSnippet',
    { defaultMessage: 'Import a module' }
  ),
  metaOs: i18n.translate('xpack.securitySolution.customYaraSignatures.editor.completion.metaOs', {
    defaultMessage: 'Comma separated list of operating systems',
  }),
  metaArch: i18n.translate(
    'xpack.securitySolution.customYaraSignatures.editor.completion.metaArch',
    { defaultMessage: 'Comma separated list of architectures' }
  ),
  metaScanType: i18n.translate(
    'xpack.securitySolution.customYaraSignatures.editor.completion.metaScanType',
    { defaultMessage: 'Scan type' }
  ),
};
