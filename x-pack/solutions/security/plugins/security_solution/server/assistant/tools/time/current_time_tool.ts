import { AssistantTool, AssistantToolParams } from "@kbn/elastic-assistant-plugin/server";
import { APP_UI_ID } from "@kbn/security-solution-plugin/common";
import { tool } from "@langchain/core/tools";

export const TOOL_DETAILS = {
    id: 'current-time-tool',
    name: 'CurrentTimeTool',
    description: 'Call this to get the current local time of the user, the local timezone, and the UTC equivelent. Useful for time-sensitive operations where the absoloute time is needed. Sometimes this tool may need to be called alongside other tool calls.',
} as const;

/** Formats time e.g. '14/02/2025, 09:33:12 UTC' */
const getTimeFormatter = (timezone: string | undefined) =>{
    const options = {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
        timeZoneName: 'short'
    } as const;

    const formatter = new Intl.DateTimeFormat([], options);
    return formatter;
}


export const CURRENT_TIME_TOOL: AssistantTool = {
    id: TOOL_DETAILS.id,
    name: TOOL_DETAILS.name,
    // note: this description is overwritten when `getTool` is called
    // local definitions exist ../elastic_assistant/server/lib/prompt/tool_prompts.ts
    // local definitions can be overwritten by security-ai-prompt integration definitions
    description: TOOL_DETAILS.description,
    sourceRegister: APP_UI_ID,
    isSupported: () => {
        return true
    },
    getTool(params: AssistantToolParams) {
        if (!this.isSupported(params)) return null;
        const { core } = params;

        return tool(async () => {
            const settingsDateFormatTimezone = await core.uiSettings.client.get<string | undefined>('dateFormat:tz');
            const timezone = settingsDateFormatTimezone === 'Browser' ? 'UTC' : settingsDateFormatTimezone ?? 'UTC';
            const currentDate = new Date();
            const utcConversion = timezone === 'UTC' ? undefined : getTimeFormatter('UTC').format(currentDate);
            return [
                `Local time: ${getTimeFormatter(timezone).format(currentDate)}`,
                ...(utcConversion ? [`(${utcConversion})`] : [])].join(' ');
        }, {
            name: TOOL_DETAILS.name,
            description: TOOL_DETAILS.description,
        })
    },
};
