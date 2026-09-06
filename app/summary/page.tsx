import { SummaryScreen } from "@/components/summary/SummaryScreen";

export default async function SummaryPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string; duration?: string }>;
}) {
  const params = await searchParams;
  const durationSeconds = Math.min(
    Math.max(Number(params.duration) || 0, 0),
    3600,
  );
  return (
    <SummaryScreen
      orderId={params.order ?? ""}
      durationSeconds={durationSeconds}
    />
  );
}