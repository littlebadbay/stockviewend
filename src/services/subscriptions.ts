export class SubscriptionManager {
  private clients: Map<string, Set<string>> = new Map();

  subscribe(clientId: string, symbols: string[] | string): void {
    const set = this.clients.get(clientId) || new Set<string>();
    const list = Array.isArray(symbols) ? symbols : [symbols];
    for (const s of list) set.add(s);
    this.clients.set(clientId, set);
  }

  unsubscribe(clientId: string, symbols?: string[] | string): void {
    if (!this.clients.has(clientId)) return;
    if (!symbols) {
      this.clients.delete(clientId);
      return;
    }
    const set = this.clients.get(clientId)!;
    const list = Array.isArray(symbols) ? symbols : [symbols];
    for (const s of list) set.delete(s);
    if (set.size === 0) this.clients.delete(clientId);
  }

  unsubscribeAll(clientId: string): void {
    this.clients.delete(clientId);
  }

  getAllSymbols(): Set<string> {
    const union = new Set<string>();
    for (const set of this.clients.values()) {
      for (const s of set) union.add(s);
    }
    return union;
  }

  getClientSymbols(clientId: string): Set<string> {
    return new Set(this.clients.get(clientId) || []);
  }
}
