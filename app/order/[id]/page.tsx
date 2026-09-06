import { OrderDetailScreen } from "@/components/order/OrderDetailScreen";

export default async function OrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <OrderDetailScreen orderId={id} />;
}