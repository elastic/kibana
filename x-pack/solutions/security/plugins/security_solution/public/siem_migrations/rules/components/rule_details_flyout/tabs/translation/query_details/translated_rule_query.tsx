/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { EuiHorizontalRule } from '@elastic/eui';
import type {
  QueryLanguage,
  RuleResponse,
} from '../../../../../../../../common/api/detection_engine';
import type { RuleMigration } from '../../../../../../../../common/siem_migrations/model/rule_migration.gen';
import { VALIDATION_WARNING_CODES } from '../../../../../../../detection_engine/rule_creation/constants/validation_warning_codes';
import { useFormWithWarnings } from '../../../../../../../common/hooks/use_form_with_warnings';
import type { RuleTranslationSchema } from '../types';
import { schema } from '../schema';
import { QueryHeader } from './header';
import { QueryEditor } from './query_editor';
import { QueryViewer } from './query_viewer';
import * as i18n from './translations';

const transformQueryLanguage = (language: QueryLanguage) => {
  switch (language) {
    case 'eql':
      return 'EQL';
    case 'esql':
      return 'ES|QL';
    case 'kuery':
      return 'KQL';
    case 'lucene':
      return 'Lucene';
  }
};

interface TranslatedRuleQueryProps {
  ruleMigration: RuleMigration;
  matchedPrebuiltRule?: RuleResponse;
  onTranslationUpdate?: (ruleName: string, ruleQuery: string) => Promise<void>;
}

export const TranslatedRuleQuery: React.FC<TranslatedRuleQueryProps> = React.memo(
  ({ ruleMigration, matchedPrebuiltRule, onTranslationUpdate }) => {
    const isInstalled = !!ruleMigration.elastic_rule?.id;
    const canEdit = !matchedPrebuiltRule && !isInstalled;

    const ruleName = useMemo(
      () => matchedPrebuiltRule?.name ?? ruleMigration.elastic_rule?.title ?? '',
      [matchedPrebuiltRule?.name, ruleMigration.elastic_rule?.title]
    );

    const translatedData = useMemo(() => {
      let title = i18n.TRANSLATION_QUERY_TITLE('ES|QL');
      let titleTooltip = i18n.TRANSLATION_QUERY_TOOLTIP;
      let query = ruleMigration.elastic_rule?.query ?? '';
      let language = ruleMigration.elastic_rule?.query_language ?? '';
      let queryPlaceholder = i18n.TRANSLATION_QUERY_PLACEHOLDER;
      if (matchedPrebuiltRule) {
        if (matchedPrebuiltRule.type === 'machine_learning') {
          title = i18n.MACHINE_LEARNING_RULE_TITLE;
          titleTooltip = i18n.MACHINE_LEARNING_RULE_TOOLTIP;
          queryPlaceholder = i18n.MACHINE_LEARNING_RULE_QUERY_PLACEHOLDER;
        } else {
          title = i18n.TRANSLATION_QUERY_TITLE(
            transformQueryLanguage(matchedPrebuiltRule.language)
          );
          query = matchedPrebuiltRule.query ?? '';
          language = matchedPrebuiltRule.language;
        }
      }
      return {
        title,
        titleTooltip,
        query,
        language,
        queryPlaceholder,
      };
    }, [
      matchedPrebuiltRule,
      ruleMigration.elastic_rule?.query,
      ruleMigration.elastic_rule?.query_language,
    ]);

    const formDefaultValue: RuleTranslationSchema = useMemo(() => {
      return {
        ruleName,
        queryBar: {
          query: {
            query: translatedData.query,
            language: 'esql',
          },
        },
      };
    }, [ruleName, translatedData.query]);
    const { form } = useFormWithWarnings<RuleTranslationSchema>({
      defaultValue: formDefaultValue,
      options: { stripEmptyFields: false, warningValidationCodes: VALIDATION_WARNING_CODES },
      schema,
    });

    const [isEditing, setIsEditing] = useState(false);
    const onCancel = useCallback(() => setIsEditing(false), []);
    const onEdit = useCallback(() => {
      form.reset({ defaultValue: formDefaultValue });
      setIsEditing(true);
    }, [form, formDefaultValue]);
    const onSave = useCallback(
      async (newRuleName: string, newQuery: string) => {
        await onTranslationUpdate?.(newRuleName, newQuery);
        setIsEditing(false);
      },
      [onTranslationUpdate]
    );

    return (
      <>
        <QueryHeader title={translatedData.title} tooltip={translatedData.titleTooltip} />
        <EuiHorizontalRule margin="xs" />
        {isEditing ? (
          <QueryEditor
            query={translatedData.query}
            ruleName={ruleName}
            onSave={onSave}
            onCancel={onCancel}
          />
        ) : (
          <QueryViewer
            ruleName={ruleName}
            language={translatedData.language}
            query={translatedData.query}
            queryPlaceholder={translatedData.queryPlaceholder}
            onEdit={canEdit ? onEdit : undefined}
          />
        )}
      </>
    );
  }
);
TranslatedRuleQuery.displayName = 'TranslatedRuleQuery';
