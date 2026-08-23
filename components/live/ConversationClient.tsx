"use client";

import dynamic from "next/dynamic";

// Browser-only: Agora RTC/RTM SDKs cannot render on the server.
const LiveConversation = dynamic(
  () => import("@/components/live/LiveConversation"),
  { ssr: false },
);

export default function ConversationClient() {
  return <LiveConversation />;
}
