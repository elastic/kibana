/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlexItem,
  EuiFlexGroup,
  PropsOf,
  EuiCodeBlock,
  EuiMarkdownFormat,
  EuiIcon,
  EuiToolTip,
  EuiLink,
  EuiIconProps,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { HttpSetup } from '@kbn/core/public';
import { createMisconfigurationFindingsQuery } from '@kbn/cloud-security-posture';
import type { BenchmarkId } from '@kbn/cloud-security-posture-common';
import { BenchmarkName } from '@kbn/cloud-security-posture-common';
import { useMisconfigurationFinding } from '@kbn/cloud-security-posture/src/hooks/use_misconfiguration_finding';
import { createDetectionRuleFromBenchmarkRule } from '@kbn/cloud-security-posture/src/utils/create_detection_rule_from_benchmark';
import cisLogoIcon from '../../../assets/icons/cis_logo.svg';
import { CISBenchmarkIcon } from '../../../components/cis_benchmark_icon';

export const EMPTY_VALUE = '-';

export const CodeBlock: React.FC<PropsOf<typeof EuiCodeBlock>> = (props) => (
  <EuiCodeBlock isCopyable paddingSize="s" overflowHeight={300} {...props} />
);

/**
 * Processes markdown content to identify and properly format JSON code blocks
 * @param content - The markdown content to process
 * @returns Processed markdown with properly formatted JSON blocks
 */
const processMarkdownWithJson = (content: string): string => {
  // Regex to find code blocks that contain JSON-like content
  const codeBlockRegex = /```[\s\S]*?```/g;

  return content.replace(codeBlockRegex, (match) => {
    // Extract content between the backticks
    const innerContent = match.replace(/^```[^\n]*\n?/, '').replace(/\n?```$/, '');

    // Check if this looks like JSON
    const looksLikeJson =
      innerContent.includes('{') &&
      innerContent.includes('}') &&
      innerContent.includes(':') &&
      (innerContent.includes('"') || innerContent.includes("'"));

    if (looksLikeJson) {
      // Clean up the JSON content for parsing
      let cleanedJson = innerContent.trim();

      // Remove any language identifier at the start
      cleanedJson = cleanedJson.replace(/^\w+\s*\n/, '');

      // Handle the specific case where JSON starts with a quote
      if (cleanedJson.startsWith("'") && cleanedJson.endsWith("'")) {
        cleanedJson = cleanedJson.slice(1, -1);
      }

      try {
        // Try to parse as valid JSON
        const parsed = JSON.parse(cleanedJson);
        const formatted = JSON.stringify(parsed, null, 2);
        return `\`\`\`json\n${formatted}\n\`\`\``;
      } catch (error) {
        // If parsing fails, try to fix common issues and format manually
        let formattedJson = cleanedJson;

        // Replace <optional> with "<optional>" to make it valid JSON
        formattedJson = formattedJson.replace(/<([^>]+)>/g, '"<$1>"');

        // More sophisticated bracket balancing
        let bracketBalance = 0;
        let needsClosingBraces = 0;

        // Count bracket balance more carefully
        for (let i = 0; i < formattedJson.length; i++) {
          if (formattedJson[i] === '{') {
            bracketBalance++;
          } else if (formattedJson[i] === '}') {
            bracketBalance--;
          }
        }

        // Only add closing braces if we have unmatched opening braces
        if (bracketBalance > 0) {
          needsClosingBraces = bracketBalance;
          // Add closing braces with proper formatting
          const closingBraces = Array(needsClosingBraces).fill('}').join('\n');
          formattedJson += '\n' + closingBraces;
        }

        // Try to format with proper indentation
        const lines = formattedJson.split('\n');
        let indentLevel = 0;
        const formattedLines = lines.map((line) => {
          const trimmed = line.trim();
          if (trimmed.includes('}') || trimmed.includes(']')) {
            indentLevel = Math.max(0, indentLevel - 1);
          }
          const formatted = '  '.repeat(indentLevel) + trimmed;
          if (trimmed.includes('{') || trimmed.includes('[')) {
            indentLevel++;
          }
          return formatted;
        });

        const betterFormatted = formattedLines.join('\n');
        return `\`\`\`json\n${betterFormatted}\n\`\`\``;
      }
    }

    // If it doesn't look like JSON, return the original match
    return match;
  });
};

// export const CspFlyoutMarkdown: React.FC<PropsOf<typeof EuiMarkdownFormat>> = (props) => {
//   const { children, ...otherProps } = props;

//   const processedContent = React.useMemo(() => {
//     if (typeof children === 'string') {
//       return processMarkdownWithJson(children);
//     }
//     return children;
//   }, [children]);

//   return (
//     <EuiMarkdownFormat textSize="s" {...otherProps}>
//       {processedContent}
//     </EuiMarkdownFormat>
//   );
// };

export const CspFlyoutMarkdownJSON: React.FC<PropsOf<typeof EuiMarkdownFormat>> = (props) => {
  const { children, ...otherProps } = props;

  const processedContent = React.useMemo(() => {
    if (typeof children === 'string') {
      return processMarkdownWithJson(children);
    }
    return children;
  }, [children]);

  return (
    <EuiMarkdownFormat textSize="s" {...otherProps}>
      {processedContent}
    </EuiMarkdownFormat>
  );
};

export const CspFlyoutMarkdown: React.FC<PropsOf<typeof EuiMarkdownFormat>> = (props) => (
  <EuiMarkdownFormat textSize="s" {...props} />
);

export const BenchmarkIcons = ({
  benchmarkId,
  benchmarkName,
  size = 'xl',
}: {
  benchmarkId: BenchmarkId;
  benchmarkName: BenchmarkName;
  size?: EuiIconProps['size'];
}) => (
  <EuiFlexGroup gutterSize="s" alignItems="center">
    {benchmarkId.startsWith('cis') && (
      <EuiFlexItem grow={false}>
        <EuiToolTip content="Center for Internet Security">
          <EuiIcon type={cisLogoIcon} size={size} />
        </EuiToolTip>
      </EuiFlexItem>
    )}
    <EuiFlexItem grow={false}>
      <CISBenchmarkIcon type={benchmarkId} name={benchmarkName} size={size} />
    </EuiFlexItem>
  </EuiFlexGroup>
);

export const RuleNameLink = ({
  ruleFlyoutLink,
  ruleName,
}: {
  ruleFlyoutLink?: string;
  ruleName: string;
}) => {
  return ruleFlyoutLink && ruleName ? (
    <EuiToolTip
      position="top"
      content={i18n.translate(
        'xpack.csp.findings.findingsFlyout.ruleNameTabField.ruleNameTooltip',
        { defaultMessage: 'Manage Rule' }
      )}
    >
      <EuiLink href={ruleFlyoutLink}>{ruleName}</EuiLink>
    </EuiToolTip>
  ) : (
    <>{ruleName}</>
  );
};

const FindingsRuleFlyout = ({
  ruleId,
  resourceId,
  children,
}: {
  ruleId: string;
  resourceId: string;
  children: any;
}) => {
  const { data } = useMisconfigurationFinding({
    query: createMisconfigurationFindingsQuery(resourceId, ruleId),
    enabled: true,
    pageSize: 1,
  });

  const finding = data?.result.hits[0]?._source;

  if (!finding) return null;

  return children({
    finding,
    createRuleFn: (http: HttpSetup) => createDetectionRuleFromBenchmarkRule(http, finding?.rule),
  });
};

// eslint-disable-next-line import/no-default-export
export default FindingsRuleFlyout;
