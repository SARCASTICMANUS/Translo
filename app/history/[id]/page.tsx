import { HistoryDetailScreen } from "@/components/history/HistoryDetailScreen";

export default async function HistoryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <HistoryDetailScreen entryId={id} />;
}