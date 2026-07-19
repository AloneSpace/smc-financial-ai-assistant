/** "About" tab: what the software is and its ground rules. */
export function AboutPanel() {
  return (
    <div className="space-y-4 text-sm">
      <div>
        <h3 className="font-medium">Financial AI Chat Assistant</h3>
        <p className="mt-1 text-muted-foreground">
          Ask natural-language questions about the financial statements of US
          public companies. Every answer is grounded in real data — the
          assistant queries the database with SQL and never invents figures.
        </p>
      </div>

      <ul className="space-y-1.5 text-muted-foreground">
        <li>• Answers come only from the financial database, via SQL tool calls.</li>
        <li>• Responses stream token-by-token as they are generated.</li>
        <li>• Usage is metered against an hourly budget (see the Usage tab).</li>
      </ul>

      <p className="text-xs text-muted-foreground">
        This assistant does not provide investment advice.
      </p>
    </div>
  );
}
