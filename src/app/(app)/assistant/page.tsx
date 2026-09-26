import { requireUser } from "@/lib/auth";
import { AssistantClient } from "./assistant-client";

export default async function AssistantPage() {
  await requireUser();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">AI Study Assistant</h1>
        <p className="text-sm text-muted-foreground mt-1">Pick a topic to give the assistant context, then ask anything.</p>
      </div>
      <AssistantClient />
    </div>
  );
}
