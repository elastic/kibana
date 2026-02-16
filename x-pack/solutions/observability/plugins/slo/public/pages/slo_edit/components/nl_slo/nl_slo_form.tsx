/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTextArea,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useCallback, useState } from 'react';
import { useGenerateSlo } from '../../../../hooks/use_generate_slo';
import { useSuggestSlo } from '../../../../hooks/use_suggest_slo';
import type { SloSuggestion } from '../../../../hooks/use_suggest_slo';
import type { CreateSLOForm } from '../../types';
import { SloPreview } from './slo_preview';
import { SloSuggestions } from './slo_suggestions';

interface NlSloFormProps {
  onApply: (values: CreateSLOForm) => void;
}

export function NlSloForm({ onApply }: NlSloFormProps) {
  const [prompt, setPrompt] = useState('');
  const [refinement, setRefinement] = useState('');
  const [generatedSlo, setGeneratedSlo] = useState<CreateSLOForm | null>(null);
  const [explanation, setExplanation] = useState('');
  const [suggestions, setSuggestions] = useState<SloSuggestion[]>([]);
  const [conversationHistory, setConversationHistory] = useState<
    Array<{ role: 'user' | 'assistant'; content: string }>
  >([]);

  const generateMutation = useGenerateSlo();
  const suggestMutation = useSuggestSlo();

  const handleGenerate = useCallback(() => {
    if (!prompt.trim()) return;

    generateMutation.mutate(
      { prompt: prompt.trim() },
      {
        onSuccess: (response) => {
          const sloDefinition = response.sloDefinition as unknown as CreateSLOForm;
          setGeneratedSlo(sloDefinition);
          setExplanation(response.explanation);
          setConversationHistory([
            { role: 'user', content: prompt.trim() },
            { role: 'assistant', content: response.explanation },
          ]);

          suggestMutation.mutate(
            { sloDefinition: response.sloDefinition },
            {
              onSuccess: (suggestResponse) => {
                setSuggestions(suggestResponse.suggestions);
              },
            }
          );
        },
      }
    );
  }, [prompt, generateMutation, suggestMutation]);

  const handleRefine = useCallback(() => {
    if (!refinement.trim()) return;

    const previousMessages = [
      ...conversationHistory,
      { role: 'user' as const, content: refinement.trim() },
    ];

    generateMutation.mutate(
      {
        prompt: refinement.trim(),
        previousMessages,
      },
      {
        onSuccess: (response) => {
          const sloDefinition = response.sloDefinition as unknown as CreateSLOForm;
          setGeneratedSlo(sloDefinition);
          setExplanation(response.explanation);
          setConversationHistory([
            ...previousMessages,
            { role: 'assistant', content: response.explanation },
          ]);
          setRefinement('');

          suggestMutation.mutate(
            { sloDefinition: response.sloDefinition },
            {
              onSuccess: (suggestResponse) => {
                setSuggestions(suggestResponse.suggestions);
              },
            }
          );
        },
      }
    );
  }, [refinement, conversationHistory, generateMutation, suggestMutation]);

  const handleApply = useCallback(() => {
    if (generatedSlo) {
      onApply(generatedSlo);
    }
  }, [generatedSlo, onApply]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        if (generatedSlo) {
          handleRefine();
        } else {
          handleGenerate();
        }
      }
    },
    [generatedSlo, handleGenerate, handleRefine]
  );

  const isGenerating = generateMutation.isLoading;

  return (
    <EuiPanel paddingSize="l" hasShadow={false} hasBorder data-test-subj="nlSloForm">
      <EuiFlexGroup direction="column" gutterSize="l">
        <EuiFlexItem>
          <EuiText size="s" color="subdued">
            <p>
              {i18n.translate('xpack.slo.nlSlo.description', {
                defaultMessage:
                  'Describe the SLO you want to create in plain language. The AI will generate a structured definition for you to review and refine.',
              })}
            </p>
          </EuiText>
        </EuiFlexItem>

        <EuiFlexItem>
          <EuiTextArea
            fullWidth
            placeholder={i18n.translate('xpack.slo.nlSlo.promptPlaceholder', {
              defaultMessage:
                'e.g., "I want a 99.9% availability SLO for my checkout-service in production, measured over 30 days"',
            })}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={3}
            disabled={isGenerating}
            data-test-subj="nlSloPromptInput"
          />
          <EuiSpacer size="s" />
          <EuiFlexGroup justifyContent="flexEnd">
            <EuiFlexItem grow={false}>
              <EuiButton
                fill
                iconType="sparkles"
                onClick={handleGenerate}
                isLoading={isGenerating}
                disabled={!prompt.trim()}
                data-test-subj="nlSloGenerateButton"
              >
                {i18n.translate('xpack.slo.nlSlo.generateButton', {
                  defaultMessage: 'Generate SLO',
                })}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>

        {generatedSlo && (
          <>
            <EuiFlexItem>
              <SloPreview sloDefinition={generatedSlo} explanation={explanation} />
            </EuiFlexItem>

            <EuiFlexItem>
              <SloSuggestions
                suggestions={suggestions}
                isLoading={suggestMutation.isLoading}
              />
            </EuiFlexItem>

            <EuiFlexItem>
              <EuiFlexGroup gutterSize="s" alignItems="center">
                <EuiFlexItem>
                  <EuiFieldText
                    fullWidth
                    placeholder={i18n.translate('xpack.slo.nlSlo.refinePlaceholder', {
                      defaultMessage:
                        'Refine your SLO... e.g., "Change the target to 99.5% and add groupBy service.name"',
                    })}
                    value={refinement}
                    onChange={(e) => setRefinement(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={isGenerating}
                    prepend={i18n.translate('xpack.slo.nlSlo.refineLabel', {
                      defaultMessage: 'Refine',
                    })}
                    data-test-subj="nlSloRefineInput"
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButton
                    onClick={handleRefine}
                    isLoading={isGenerating}
                    disabled={!refinement.trim()}
                    iconType="refresh"
                    data-test-subj="nlSloRefineButton"
                  >
                    {i18n.translate('xpack.slo.nlSlo.refineButton', {
                      defaultMessage: 'Refine',
                    })}
                  </EuiButton>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>

            <EuiFlexItem>
              <EuiFlexGroup justifyContent="flexEnd" gutterSize="m">
                <EuiFlexItem grow={false}>
                  <EuiButton
                    fill
                    iconType="check"
                    onClick={handleApply}
                    data-test-subj="nlSloApplyButton"
                  >
                    {i18n.translate('xpack.slo.nlSlo.applyButton', {
                      defaultMessage: 'Apply to form',
                    })}
                  </EuiButton>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          </>
        )}
      </EuiFlexGroup>
    </EuiPanel>
  );
}
