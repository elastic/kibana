import { AssistantToolParams } from "@kbn/elastic-assistant-plugin/server";

export type CreateLlmInstance = Exclude<AssistantToolParams["createLlmInstance"], undefined>;
