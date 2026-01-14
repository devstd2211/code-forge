/**
 * Simple Test Component - Basic OrderAnalyzer for testing.
 * Used for integration and end-to-end tests.
 */

interface Order {
  id: string;
  amount: number;
  status: 'pending' | 'processed' | 'failed';
}

/**
 * Analyzes orders and returns summary statistics.
 */
export class OrderAnalyzer {
  private orders: Order[] = [];

  /**
   * Add an order to analyze.
   */
  addOrder(order: Order): void {
    this.orders.push(order);
  }

  /**
   * Get total amount of all orders.
   */
  getTotalAmount(): number {
    return this.orders.reduce((sum, order) => sum + order.amount, 0);
  }

  /**
   * Get orders by status.
   */
  getOrdersByStatus(status: Order['status']): Order[] {
    return this.orders.filter(order => order.status === status);
  }

  /**
   * Get average order amount.
   */
  getAverageAmount(): number {
    if (this.orders.length === 0) {
      return 0;
    }
    return this.getTotalAmount() / this.orders.length;
  }

  /**
   * Clear all orders.
   */
  clear(): void {
    this.orders = [];
  }

  /**
   * Get total number of orders.
   */
  getOrderCount(): number {
    return this.orders.length;
  }

  /**
   * Get all orders.
   */
  getAllOrders(): Order[] {
    return [...this.orders];
  }
}
