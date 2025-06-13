import { AssistantSpaceIdProvider as ElasticAssistantSpaceIdProvider } from "@kbn/elastic-assistant";
import { useSpaceId } from "../../hooks/space_id/use_space_id";

export const AssistantSpaceIdProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const spaceId = useSpaceId();

  if (!spaceId) {
    return null;
  }

  return (
    <ElasticAssistantSpaceIdProvider spaceId={spaceId}>
      {children}
    </ElasticAssistantSpaceIdProvider>
  );
}