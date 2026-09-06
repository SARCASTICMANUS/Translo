import { CallScreen } from "@/components/call/CallScreen";

export default async function CallPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <CallScreen orderId={id} />;
}