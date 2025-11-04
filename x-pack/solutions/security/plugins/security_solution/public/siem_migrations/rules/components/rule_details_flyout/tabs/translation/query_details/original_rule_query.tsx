/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiHorizontalRule } from '@elastic/eui';
import type { RuleMigrationRule } from '../../../../../../../../common/siem_migrations/model/rule_migration.gen';
import { QueryHeader } from './header';
import { QueryViewer } from './query_viewer';
import * as i18n from './translations';

interface OriginalRuleQueryProps {
  migrationRule: RuleMigrationRule;
}

const prettifyXml = function (sourceXml: string) {
  try {
    const xmlDoc = new DOMParser().parseFromString(sourceXml, 'application/xml');
    const xsltDoc = new DOMParser().parseFromString(
      `<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0">
  <xsl:output method="xml" indent="yes"/>
  <xsl:strip-space elements="*"/>
  <xsl:template match="@*|node()">
    <xsl:copy>
      <xsl:apply-templates select="@*|node()"/>
    </xsl:copy>
  </xsl:template>
</xsl:stylesheet>`,
      'application/xml'
    );

    const xsltProcessor = new XSLTProcessor();
    xsltProcessor.importStylesheet(xsltDoc);
    const resultDoc = xsltProcessor.transformToDocument(xmlDoc);
    const resultXml = new XMLSerializer().serializeToString(resultDoc);
    console.log(`Serialized XML: ${resultXml}`);
    return resultXml;
  } catch (err) {
    console.error(err);
    return sourceXml;
  }
};

export const OriginalRuleQuery: React.FC<OriginalRuleQueryProps> = React.memo(
  ({ migrationRule }) => {
    return (
      <>
        <QueryHeader title={i18n.SPLUNK_QUERY_TITLE} tooltip={i18n.SPLUNK_QUERY_TOOLTIP} />
        <EuiHorizontalRule data-test-subj="queryHorizontalRule" margin="xs" />
        <QueryViewer
          ruleName={migrationRule.original_rule.title}
          query={
            migrationRule.original_rule.query_language === 'xml'
              ? prettifyXml(migrationRule.original_rule.query)
              : migrationRule.original_rule.query
          }
          language={migrationRule.original_rule.query_language}
        />
      </>
    );
  }
);
OriginalRuleQuery.displayName = 'OriginalRuleQuery';
