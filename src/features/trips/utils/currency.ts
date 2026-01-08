
// Graph traversal helper (BFS) to find best conversion rate
export function getConversionRate(
    fromCurrency: string,
    toCurrency: string,
    rates: Record<string, number>
): number | null {
    if (fromCurrency === toCurrency) return 1;

    // Build Adjacency List
    const adj: Record<string, Record<string, number>> = {};
    Object.entries(rates).forEach(([key, rate]) => {
        const [src, dst] = key.split('-');
        if (!adj[src]) adj[src] = {};
        if (!adj[dst]) adj[dst] = {};
        adj[src][dst] = rate;
        adj[dst][src] = 1 / rate;
    });

    // BFS
    const visited = new Set<string>();
    const queue: { curr: string, rate: number }[] = [{ curr: fromCurrency, rate: 1 }];
    visited.add(fromCurrency);

    while (queue.length > 0) {
        const item = queue.shift();
        if (!item) continue;
        const { curr, rate: currentRate } = item;

        if (curr === toCurrency) return currentRate;

        if (adj[curr]) {
            for (const [neighbor, neighborRate] of Object.entries(adj[curr])) {
                if (!visited.has(neighbor)) {
                    visited.add(neighbor);
                    queue.push({ curr: neighbor, rate: currentRate * neighborRate });
                }
            }
        }
    }

    return null;
}
