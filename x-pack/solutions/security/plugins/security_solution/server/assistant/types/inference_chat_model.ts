import { CreateChatModelOptions } from "@kbn/inference-plugin/server/types";

export type GetInferenceChatModelOptions = Omit<CreateChatModelOptions, 'request'>