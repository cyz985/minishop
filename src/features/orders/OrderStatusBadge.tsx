// 课程作业：订单状态徽标，列表与详情共用。

import { Badge } from '../../components/ui/Badge';
import { ORDER_STATUS_LABELS, ORDER_STATUS_TONES } from '../../types/models';
import type { OrderStatus } from '../../types/models';

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <Badge tone={ORDER_STATUS_TONES[status]}>{ORDER_STATUS_LABELS[status]}</Badge>;
}
