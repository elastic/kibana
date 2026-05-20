/**
 * Entity Linking instructions for Observability AI Insights.
 * Instructs the LLM to format entities as clickable links using Kibana's relative URL paths.
 */
export declare function getEntityLinkingInstructions({ urlPrefix }: {
    urlPrefix: string;
}): string;
